"""
Auto-labels the 7,296+ folder-sorted crop/disease/pest images into a complete
YOLOv8 object-detection dataset using GroundingDINO (IDEA-Research/grounding-dino-tiny)
on GPU with FP16 autocast and torchvision NMS.

Outputs:
  datasets/yolo_dataset/
    ├── data.yaml
    ├── review_report.json
    ├── qa_previews/<id>_<class_name>.jpg
    ├── images/{train,val,test}/
    └── labels/{train,val,test}/

Usage:
  datasets/.venv/Scripts/python.exe -u datasets/scripts/auto_label_yolo.py --batch 8
"""

import argparse
import json
import os
import random
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Tuple

import torch
from PIL import Image, ImageDraw
from torchvision.ops import nms
from transformers import AutoModelForZeroShotObjectDetection, AutoProcessor

BASE_DIR = Path(__file__).resolve().parent.parent
CATEGORIES = [
    "01_healthy_crops",
    "02_crop_diseases",
    "03_philippine_pests",
    "04_nutrient_deficiencies",
    "05_pest_damage_symptoms",
]
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}

# GroundingDINO requires lowercase dot-separated phrases
CLASS_PROMPTS: Dict[str, str] = {
    # Healthy crops
    "lettuce_healthy": "lettuce . vegetable . green plant . leaf .",
    "bok_choy_healthy": "bok choy . cabbage . vegetable . green plant . leaf .",
    "mustard_greens_healthy": "mustard plant . vegetable . green plant . leaf .",
    # Crop diseases
    "lettuce_downy_mildew": "diseased leaf . yellow leaf . lettuce leaf . leaf .",
    "lettuce_bacterial_soft_rot": "rotten leaf . diseased vegetable . wilted plant . leaf .",
    "lettuce_bottom_rot_drop": "rotten plant . wilted lettuce . diseased leaf . leaf .",
    "lettuce_powdery_mildew": "white powdery leaf . diseased leaf . leaf .",
    "lettuce_septoria_blight": "spotted leaf . diseased leaf . leaf .",
    "lettuce_viral": "yellowing leaf . diseased leaf . lettuce leaf . leaf .",
    "brassica_black_rot": "diseased leaf . yellow leaf . cabbage leaf . leaf .",
    "brassica_downy_mildew": "diseased leaf . spotted leaf . leaf .",
    "brassica_alternaria_leaf_spot": "leaf spot . diseased leaf . spotted leaf . leaf .",
    "crucifer_white_rust": "white spots on leaf . diseased leaf . leaf .",
    # Philippine pests
    "diamondback_moth": "caterpillar . moth . larva . insect . bug .",
    "green_peach_aphid": "aphid . insect . small bug .",
    "striped_flea_beetle": "beetle . insect . bug .",
    "cabbage_looper": "caterpillar . moth . larva . insect .",
    "serpentine_leafminer": "leaf mine trail . insect . fly . damaged leaf .",
    "common_cutworm": "caterpillar . moth . larva . insect .",
    "cabbage_cluster_caterpillar": "caterpillar . moth . larva . insect .",
    "cabbage_webworm": "caterpillar . moth . larva . insect .",
    "beet_armyworm": "caterpillar . moth . larva . insect .",
    "silverleaf_whitefly": "whitefly . white insect . insect . bug .",
    "turnip_mustard_aphid": "aphid . insect . small bug .",
    "onion_leaf_thrips": "thrips . tiny insect . insect . bug .",
    # Nutrient deficiencies & abiotic stress
    "nitrogen_deficiency": "yellow leaf . pale vegetable leaf . chlorotic plant . leaf .",
    "calcium_deficiency_tipburn": "brown leaf edge . scorched leaf tip . lettuce leaf . leaf .",
    "potassium_deficiency": "scorched leaf margin . yellow leaf edge . vegetable leaf . leaf .",
    "interveinal_chlorosis": "yellow veined leaf . chlorotic leaf . vegetable leaf . leaf .",
    "abiotic_water_heat_stress": "wilted leaf . stressed vegetable plant . discolored leaf . leaf .",
    # Indirect pest-damage symptoms
    "chewing_damage": "chewed leaf . leaf with holes . damaged cabbage leaf . leaf .",
    "shothole_damage": "leaf with small holes . perforated leaf . damaged vegetable leaf . leaf .",
    "leafminer_damage": "leaf mine trail . white tunnel on leaf . damaged leaf . leaf .",
    "sucking_damage": "curled leaf . crinkled distorted leaf . damaged vegetable leaf . leaf .",
}


def link_or_copy(src: Path, dst: Path):
    dst.parent.mkdir(parents=True, exist_ok=True)
    if dst.exists():
        return
    try:
        os.link(src, dst)
    except OSError:
        shutil.copy2(src, dst)


def make_qa_preview(samples: List[Tuple[Path, List[Tuple[float, float, float, float]]]], out_path: Path):
    if not samples:
        return
    cols, rows = 4, 3
    cell_w, cell_h = 256, 256
    canvas = Image.new("RGB", (cols * cell_w, rows * cell_h), (24, 24, 28))

    for idx, (img_path, boxes) in enumerate(samples[: cols * rows]):
        try:
            with Image.open(img_path) as im:
                im = im.convert("RGB").resize((cell_w, cell_h), Image.Resampling.LANCZOS)
                draw = ImageDraw.Draw(im)
                for xc, yc, w, h in boxes:
                    x1 = int((xc - w / 2) * cell_w)
                    y1 = int((yc - h / 2) * cell_h)
                    x2 = int((xc + w / 2) * cell_w)
                    y2 = int((yc + h / 2) * cell_h)
                    draw.rectangle([x1, y1, x2, y2], outline=(0, 255, 128), width=3)
                r, c = divmod(idx, cols)
                canvas.paste(im, (c * cell_w, r * cell_h))
        except Exception:
            continue

    out_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out_path, format="JPEG", quality=88)


def filter_and_convert_boxes(
    boxes_xyxy: torch.Tensor,
    scores: torch.Tensor,
    img_w: int,
    img_h: int,
    is_pest: bool,
    max_boxes: int = 5,
) -> List[Tuple[float, float, float, float]]:
    if boxes_xyxy.numel() == 0:
        return []

    keep = nms(boxes_xyxy.float(), scores.float(), iou_threshold=0.50)
    boxes_xyxy = boxes_xyxy[keep]
    scores = scores[keep]

    order = torch.argsort(scores, descending=True)
    boxes_xyxy = boxes_xyxy[order]

    tight_boxes: List[Tuple[float, float, float, float]] = []
    all_valid: List[Tuple[float, float, float, float]] = []

    for x1, y1, x2, y2 in boxes_xyxy.tolist():
        x1 = max(0.0, min(float(img_w), x1))
        y1 = max(0.0, min(float(img_h), y1))
        x2 = max(0.0, min(float(img_w), x2))
        y2 = max(0.0, min(float(img_h), y2))
        bw = (x2 - x1) / img_w
        bh = (y2 - y1) / img_h
        area = bw * bh
        if area < 0.0015 or bw <= 0.01 or bh <= 0.01:
            continue
        xc = ((x1 + x2) / 2.0) / img_w
        yc = ((y1 + y2) / 2.0) / img_h
        box = (xc, yc, bw, bh)
        all_valid.append(box)
        if not is_pest or area < 0.85:
            tight_boxes.append(box)

    chosen = tight_boxes if tight_boxes else all_valid
    return chosen[:max_boxes]


def main():
    parser = argparse.ArgumentParser(description="Auto-label crop/disease/pest dataset with GroundingDINO.")
    parser.add_argument("--model", type=str, default="IDEA-Research/grounding-dino-tiny")
    parser.add_argument("--batch", type=int, default=2, help="GPU batch size (2 is safe on 6GB VRAM)")
    parser.add_argument("--threshold", type=float, default=0.22, help="Box confidence threshold")
    parser.add_argument("--text-threshold", type=float, default=0.20, help="Text confidence threshold")
    parser.add_argument("--train-ratio", type=float, default=0.70)
    parser.add_argument("--val-ratio", type=float, default=0.20)
    parser.add_argument("--min-class-images", type=int, default=30, help="Skip under-populated classes (<30 imgs)")
    parser.add_argument("--max-per-class", type=int, default=650, help="Cap huge classes (e.g. lettuce_healthy) for class balance")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--out", type=str, default=str(BASE_DIR / "yolo_dataset"))
    args = parser.parse_args()

    device = "cuda" if torch.cuda.is_available() else "cpu"
    out_dir = Path(args.out)
    if out_dir.exists():
        print(f"[INFO] Cleaning existing output directory: {out_dir}")
        shutil.rmtree(out_dir)

    for split in ("train", "val", "test"):
        (out_dir / "images" / split).mkdir(parents=True, exist_ok=True)
        (out_dir / "labels" / split).mkdir(parents=True, exist_ok=True)

    class_dirs: List[Tuple[str, Path]] = []
    for cat in CATEGORIES:
        cat_dir = BASE_DIR / cat
        if not cat_dir.exists():
            continue
        for cls_dir in sorted(p for p in cat_dir.iterdir() if p.is_dir()):
            cnt = sum(1 for p in cls_dir.iterdir() if p.is_file() and p.suffix.lower() in IMAGE_EXTS)
            if cnt < args.min_class_images:
                print(f"[SKIP] {cat}/{cls_dir.name}: only {cnt} images (< {args.min_class_images})")
                continue
            class_dirs.append((cat, cls_dir))

    class_names = [cls_dir.name for _, cls_dir in class_dirs]
    print(f"[INFO] Loading {args.model} on {device} for {len(class_names)} classes...")
    processor = AutoProcessor.from_pretrained(args.model)
    model = AutoModelForZeroShotObjectDetection.from_pretrained(args.model).to(device)
    model.eval()

    rng = random.Random(args.seed)
    report = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "model": args.model,
        "threshold": args.threshold,
        "totals": {"images_seen": 0, "labeled_detected": 0, "labeled_macro_fallback": 0, "skipped_no_box": 0},
        "classes": {},
        "needs_review_samples": [],
    }

    for cls_id, (cat, cls_dir) in enumerate(class_dirs):
        cls_name = cls_dir.name
        is_pest = cat == "03_philippine_pests"
        prompt = CLASS_PROMPTS.get(cls_name, "insect . bug ." if is_pest else "plant leaf . vegetable .")

        images = sorted(p for p in cls_dir.iterdir() if p.is_file() and p.suffix.lower() in IMAGE_EXTS)
        rng.shuffle(images)
        if args.max_per_class > 0 and len(images) > args.max_per_class:
            images = images[: args.max_per_class]

        n = len(images)
        n_train = int(n * args.train_ratio)
        n_val = int(n * args.val_ratio)
        split_map = {
            p: ("train" if i < n_train else "val" if i < n_train + n_val else "test")
            for i, p in enumerate(images)
        }

        detected_cnt = 0
        fallback_cnt = 0
        skipped_cnt = 0
        qa_samples: List[Tuple[Path, List[Tuple[float, float, float, float]]]] = []

        print(f"\n[{cls_id + 1:2d}/{len(class_dirs)}] {cls_name} ({n} images) | prompt='{prompt}'")

        for start in range(0, n, args.batch):
            batch_paths = images[start : start + args.batch]
            pil_images: List[Image.Image] = []
            valid_paths: List[Path] = []
            target_sizes: List[Tuple[int, int]] = []

            for p in batch_paths:
                try:
                    im = Image.open(p).convert("RGB")
                    pil_images.append(im)
                    valid_paths.append(p)
                    target_sizes.append((im.height, im.width))
                except Exception:
                    continue

            if not pil_images:
                continue

            inputs = processor(
                images=pil_images,
                text=[prompt] * len(pil_images),
                return_tensors="pt",
                padding=True,
                size={"shortest_edge": 512, "longest_edge": 640},
            ).to(device)

            with torch.no_grad():
                if device == "cuda":
                    with torch.amp.autocast("cuda", dtype=torch.float16):
                        outputs = model(**inputs)
                else:
                    outputs = model(**inputs)

            results = processor.post_process_grounded_object_detection(
                outputs,
                inputs.input_ids,
                threshold=args.threshold,
                text_threshold=args.text_threshold,
                target_sizes=target_sizes,
            )

            for img_path, im, res in zip(valid_paths, pil_images, results):
                report["totals"]["images_seen"] += 1
                boxes = filter_and_convert_boxes(
                    res["boxes"].cpu(),
                    res["scores"].cpu(),
                    im.width,
                    im.height,
                    is_pest=is_pest,
                    max_boxes=5 if is_pest else 3,
                )

                used_fallback = False
                if not boxes:
                    if not is_pest:
                        boxes = [(0.5, 0.5, 0.90, 0.90)]
                        used_fallback = True
                        fallback_cnt += 1
                        report["totals"]["labeled_macro_fallback"] += 1
                        if len(report["needs_review_samples"]) < 500:
                            report["needs_review_samples"].append({"class": cls_name, "file": img_path.name, "reason": "macro_fallback"})
                    else:
                        skipped_cnt += 1
                        report["totals"]["skipped_no_box"] += 1
                        if len(report["needs_review_samples"]) < 500:
                            report["needs_review_samples"].append({"class": cls_name, "file": img_path.name, "reason": "no_pest_detected"})
                        continue
                else:
                    detected_cnt += 1
                    report["totals"]["labeled_detected"] += 1

                split = split_map[img_path]
                out_stem = f"{cls_name}__{img_path.stem}"
                dst_img = out_dir / "images" / split / f"{out_stem}{img_path.suffix.lower()}"
                dst_lbl = out_dir / "labels" / split / f"{out_stem}.txt"

                link_or_copy(img_path, dst_img)
                label_lines = [f"{cls_id} {xc:.6f} {yc:.6f} {w:.6f} {h:.6f}" for xc, yc, w, h in boxes]
                dst_lbl.write_text("\n".join(label_lines) + "\n", encoding="utf-8")

                if not used_fallback and len(qa_samples) < 12:
                    qa_samples.append((img_path, boxes))

        make_qa_preview(qa_samples, out_dir / "qa_previews" / f"{cls_id:02d}_{cls_name}.jpg")
        report["classes"][cls_name] = {
            "class_id": cls_id,
            "category": cat,
            "total": n,
            "detected": detected_cnt,
            "macro_fallback": fallback_cnt,
            "skipped_no_box": skipped_cnt,
        }
        print(f"    -> detected={detected_cnt} ({detected_cnt / max(1, n) * 100:.1f}%) | macro_fallback={fallback_cnt} | skipped={skipped_cnt}")

    # Background hard negatives (recursively scans subfolders under 00_background_negatives/)
    bg_dir = BASE_DIR / "00_background_negatives"
    bg_count = 0
    if bg_dir.exists():
        bg_imgs = sorted(p for p in bg_dir.rglob("*") if p.is_file() and p.suffix.lower() in IMAGE_EXTS)
        rng.shuffle(bg_imgs)
        for i, p in enumerate(bg_imgs):
            split = "train" if i < int(len(bg_imgs) * 0.8) else "val"
            out_stem = f"bg__{p.parent.name}__{p.stem}"
            link_or_copy(p, out_dir / "images" / split / f"{out_stem}{p.suffix.lower()}")
            (out_dir / "labels" / split / f"{out_stem}.txt").write_text("", encoding="utf-8")
            bg_count += 1
    report["background_negatives"] = bg_count

    yaml_lines = [
        f"path: {out_dir.as_posix()}",
        "train: images/train",
        "val: images/val",
        "test: images/test",
        "",
        f"nc: {len(class_names)}",
        "names:",
    ]
    for idx, name in enumerate(class_names):
        yaml_lines.append(f"  {idx}: {name}")
    (out_dir / "data.yaml").write_text("\n".join(yaml_lines) + "\n", encoding="utf-8")
    (out_dir / "review_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")

    print("\n[AUTO-LABELING COMPLETE]")
    print(f"  Dataset YAML : {out_dir / 'data.yaml'}")
    print(f"  QA Previews  : {out_dir / 'qa_previews'}")
    print(f"  Summary      : {report['totals']}")


if __name__ == "__main__":
    main()
