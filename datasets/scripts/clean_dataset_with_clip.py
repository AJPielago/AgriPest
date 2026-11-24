"""
CLIP-Powered Dataset Cleaner for Existing Leafy-Green Training Folders.
Scans `datasets/01_healthy_crops`, `02_crop_diseases`, and `03_philippine_pests`
and moves non-photographic noise (e.g., 1947 GBIF herbarium paper envelopes, index cards,
text labels, blank images) into `datasets/_quarantined_noise/` (non-destructive).

Usage:
  datasets/.venv/Scripts/python.exe datasets/scripts/clean_dataset_with_clip.py --dry-run
  datasets/.venv/Scripts/python.exe datasets/scripts/clean_dataset_with_clip.py --apply
"""

import argparse
import shutil
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BASE_DIR.parent
sys.path.insert(0, str(REPO_ROOT / "backend"))

CATEGORIES = ["01_healthy_crops", "02_crop_diseases", "03_philippine_pests"]
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}


def main():
    parser = argparse.ArgumentParser(description="Quarantine herbarium paper cards and off-domain noise using CLIP.")
    parser.add_argument("--apply", action="store_true", help="Actually move noisy files to _quarantined_noise/")
    args = parser.parse_args()

    from app.services.detection.domain_gate import CLIPDomainGate, check_image_sanity

    gate = CLIPDomainGate()
    if not gate.available:
        raise RuntimeError("CLIP ViT-B-32 weights not available.")

    quarantine_root = BASE_DIR / "_quarantined_noise"
    total_scanned = 0
    total_flagged = 0

    for cat in CATEGORIES:
        cat_dir = BASE_DIR / cat
        if not cat_dir.exists():
            continue
        is_pest_cat = cat == "03_philippine_pests"
        for cls_dir in sorted(p for p in cat_dir.iterdir() if p.is_dir()):
            imgs = sorted(p for p in cls_dir.iterdir() if p.is_file() and p.suffix.lower() in IMAGE_EXTS)
            cls_flagged = 0
            for img_path in imgs:
                total_scanned += 1
                bad = check_image_sanity(str(img_path)) is not None
                if not bad:
                    res = gate.evaluate(str(img_path), require_leafy_crop=False)
                    # Only quarantine clear non-agricultural paper cards / screenshots / documents
                    if not res.allowed and res.category == "non_agri" and (not is_pest_cat or res.neg_nonagri_prob >= 0.55):
                        bad = True
                if bad:
                    cls_flagged += 1
                    total_flagged += 1
                    if args.apply:
                        dst = quarantine_root / cat / cls_dir.name / img_path.name
                        dst.parent.mkdir(parents=True, exist_ok=True)
                        shutil.move(str(img_path), str(dst))
            print(f"  {cat}/{cls_dir.name:32s} | total={len(imgs):4d} | flagged_noise={cls_flagged:3d}")

    mode_str = "MOVED TO _quarantined_noise" if args.apply else "DRY-RUN (pass --apply to quarantine)"
    print(f"\n[{mode_str}] Scanned={total_scanned}, Flagged noise={total_flagged}")


if __name__ == "__main__":
    main()
