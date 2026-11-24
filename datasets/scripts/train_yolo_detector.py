"""
Trains a YOLOv8s object detector on `datasets/yolo_dataset/data.yaml` tuned for
an NVIDIA RTX 4050 Laptop GPU (6 GB VRAM) and exports `best.pt` to
`backend/app/ml_models/best.pt`.

Usage:
  python datasets/scripts/train_yolo_detector.py --epochs 80 --batch 8
"""

import argparse
import shutil
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BASE_DIR.parent
DATA_YAML = BASE_DIR / "yolo_dataset" / "data.yaml"
TARGET_WEIGHTS = REPO_ROOT / "backend" / "app" / "ml_models" / "best.pt"


def main():
    parser = argparse.ArgumentParser(description="Train YOLOv8s crop/disease/pest detector.")
    parser.add_argument("--model", type=str, default="yolov8s.pt", help="Base YOLO weights (yolov8n.pt or yolov8s.pt)")
    parser.add_argument("--epochs", type=int, default=65)
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--batch", type=int, default=8, help="Safe default for 6GB VRAM")
    parser.add_argument("--device", type=str, default="0")
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--name", type=str, default="leafy_greens_pest_disease_v2_32cls")
    parser.add_argument("--no-deploy", action="store_true", help="Do not overwrite backend best.pt automatically")
    args = parser.parse_args()

    if not DATA_YAML.exists():
        raise FileNotFoundError(f"Missing {DATA_YAML}. Run auto_label_yolo.py first.")

    from ultralytics import YOLO

    model = YOLO(args.model)
    results = model.train(
        data=str(DATA_YAML),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        device=args.device,
        workers=args.workers,
        patience=15,
        cos_lr=True,
        amp=True,
        mosaic=1.0,
        mixup=0.15,
        fliplr=0.5,
        flipud=0.2,
        hsv_h=0.015,
        hsv_s=0.6,
        hsv_v=0.4,
        project=str(BASE_DIR / "runs"),
        name=args.name,
        exist_ok=True,
    )

    best_pt = Path(results.save_dir) / "weights" / "best.pt"
    if best_pt.exists():
        print(f"\n[TRAINED] Best weights saved at: {best_pt}")
        if not args.no_deploy:
            TARGET_WEIGHTS.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(best_pt, TARGET_WEIGHTS)
            print(f"[DEPLOYED] Copied trained weights to: {TARGET_WEIGHTS}")
            print("Set DETECTION_MODE=ai in backend/.env to activate live model inference.")


if __name__ == "__main__":
    main()
