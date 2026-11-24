"""
Creates a stratified train/val/test (default 70/20/10) directory split suitable for
PyTorch ImageFolder, TensorFlow/Keras `image_dataset_from_directory`, or YOLOv8-cls
(`yolo classify train data=datasets/splits ...`).

Uses hardlinks by default (zero extra disk space) with automatic fallback to copy.

Usage:
  python prepare_train_val_split.py --mode flat
  python prepare_train_val_split.py --mode by_category
"""

import argparse
import os
import random
import shutil
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
CATEGORIES = [
    "01_healthy_crops",
    "02_crop_diseases",
    "03_philippine_pests",
    "04_nutrient_deficiencies",
    "05_pest_damage_symptoms",
]
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}


def link_or_copy(src: Path, dst: Path):
    dst.parent.mkdir(parents=True, exist_ok=True)
    if dst.exists():
        return
    try:
        os.link(src, dst)
    except OSError:
        shutil.copy2(src, dst)


def split_dataset(train_ratio: float, val_ratio: float, seed: int, out_dir: Path, min_images: int = 30, max_per_class: int = 650):
    rng = random.Random(seed)
    if out_dir.exists():
        shutil.rmtree(out_dir)

    totals = {"train": 0, "val": 0, "test": 0}
    included_classes = 0

    for cat in CATEGORIES:
        cat_dir = BASE_DIR / cat
        if not cat_dir.exists():
            continue
        for cls_dir in sorted(p for p in cat_dir.iterdir() if p.is_dir()):
            imgs = sorted(p for p in cls_dir.iterdir() if p.is_file() and p.suffix.lower() in IMAGE_EXTS)
            if len(imgs) < min_images:
                continue
            rng.shuffle(imgs)
            if max_per_class > 0 and len(imgs) > max_per_class:
                imgs = imgs[:max_per_class]
            included_classes += 1
            n = len(imgs)
            n_train = int(n * train_ratio)
            n_val = int(n * val_ratio)

            splits = {
                "train": imgs[:n_train],
                "val": imgs[n_train : n_train + n_val],
                "test": imgs[n_train + n_val :],
            }

            class_name = cls_dir.name
            for split_name, files in splits.items():
                for src in files:
                    link_or_copy(src, out_dir / split_name / class_name / src.name)
                totals[split_name] += len(files)

    print(f"[SPLIT DONE] Output: {out_dir} ({included_classes} balanced classes)")
    print(f"  train: {totals['train']} | val: {totals['val']} | test: {totals['test']} | total: {sum(totals.values())}")


def main():
    parser = argparse.ArgumentParser(description="Create balanced stratified train/val/test split.")
    parser.add_argument("--train", type=float, default=0.70)
    parser.add_argument("--val", type=float, default=0.20)
    parser.add_argument("--min-images", type=int, default=30)
    parser.add_argument("--max-per-class", type=int, default=650)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--out", type=str, default=str(BASE_DIR / "splits"))
    args = parser.parse_args()

    split_dataset(args.train, args.val, args.seed, Path(args.out), args.min_images, args.max_per_class)


if __name__ == "__main__":
    main()
