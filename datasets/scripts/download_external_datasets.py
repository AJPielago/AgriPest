"""
Optional Expansion Downloader for Kaggle & Roboflow Universe Datasets.

Run this script AFTER setting up your free credentials if you want to pull
additional pre-annotated YOLO bounding-box datasets from Kaggle & Roboflow:

1. Kaggle:
   - pip install kaggle
   - Place your Kaggle API token at: %USERPROFILE%\\.kaggle\\kaggle.json
2. Roboflow Universe:
   - pip install roboflow
   - Set environment variable: $env:ROBOFLOW_API_KEY="your_key"

Usage:
  python download_external_datasets.py --kaggle
  python download_external_datasets.py --roboflow
"""

import argparse
import os
import subprocess
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
EXTERNAL_DIR = BASE_DIR / "raw" / "external"

# Verified high-value Kaggle datasets for Lettuce, Bok Choy, Mustard, Brassicas & Pests
KAGGLE_DATASETS = [
    # Lettuce diseases, healthy states & NPK nutrient deficiencies
    "ashishjstar/lettuce-diseases",
    "jocelyndumlao/lettuce-npk-dataset",
    "baronn/lettuce-npk-dataset",
    # Agricultural pests (includes aphids, caterpillars, beetles, moths)
    "vencerlanz09/agricultural-pests-image-dataset",
    "simranvolunesia/pest-dataset",
    # PlantVillage / Multi-crop leaf diseases for transfer learning / negative examples
    "vipoooool/new-plant-diseases-dataset",
]

# Verified Roboflow Universe projects (workspace, project, version) for YOLO bounding boxes
ROBOFLOW_PROJECTS = [
    ("khoa-wlumr", "bok-choy-disease-lt8gr-el6ub", 1),
    ("wherearrive", "bok-choy-disease-detection-izc2t", 1),
    ("hydromac", "bok-choy-diseased", 1),
    ("mawaraprilla", "deficiency-lettuce-npk", 1),
]


def download_kaggle():
    out_dir = EXTERNAL_DIR / "kaggle"
    out_dir.mkdir(parents=True, exist_ok=True)
    for slug in KAGGLE_DATASETS:
        target = out_dir / slug.replace("/", "__")
        target.mkdir(parents=True, exist_ok=True)
        print(f"[Kaggle] Downloading {slug} -> {target}")
        try:
            subprocess.run(
                ["kaggle", "datasets", "download", "-d", slug, "-p", str(target), "--unzip"],
                check=True,
            )
        except FileNotFoundError:
            print("[ERROR] `kaggle` CLI not installed. Run: pip install kaggle")
            return
        except subprocess.CalledProcessError as e:
            print(f"[WARN] Failed to download {slug}: {e}")


def download_roboflow():
    api_key = os.environ.get("ROBOFLOW_API_KEY")
    if not api_key:
        print("[ERROR] Set ROBOFLOW_API_KEY environment variable first.")
        return
    try:
        from roboflow import Roboflow
    except ImportError:
        print("[ERROR] `roboflow` package not installed. Run: pip install roboflow")
        return

    rf = Roboflow(api_key=api_key)
    out_dir = EXTERNAL_DIR / "roboflow"
    out_dir.mkdir(parents=True, exist_ok=True)

    for workspace, project_name, version in ROBOFLOW_PROJECTS:
        try:
            print(f"[Roboflow] Exporting {workspace}/{project_name} v{version} (YOLOv8)...")
            project = rf.workspace(workspace).project(project_name)
            project.version(version).download("yolov8", location=str(out_dir / project_name))
        except Exception as e:
            print(f"[WARN] Failed {workspace}/{project_name}: {e}")


def main():
    parser = argparse.ArgumentParser(description="Download extra Kaggle & Roboflow datasets.")
    parser.add_argument("--kaggle", action="store_true", help="Download curated Kaggle datasets")
    parser.add_argument("--roboflow", action="store_true", help="Download curated Roboflow YOLO datasets")
    args = parser.parse_args()

    if not args.kaggle and not args.roboflow:
        parser.print_help()
        return

    if args.kaggle:
        download_kaggle()
    if args.roboflow:
        download_roboflow()


if __name__ == "__main__":
    main()
