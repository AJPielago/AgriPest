"""
CLIP-Verified Open Dataset Collector for:
  - 04_nutrient_deficiencies/ (Nitrogen, Calcium Tipburn, Potassium Scorch, Interveinal Chlorosis)
  - 05_pest_damage_symptoms/  (Chewing Holes, Flea Beetle Shot-Holes, Leafminer Trails, Sap-Sucking Curl)
  - 00_background_negatives/  (Non-target objects & non-target plants for OOD negative training)

Uses public Wikimedia Commons + iNaturalist APIs (zero API keys required) AND verifies every
downloaded image through local CLIP ViT-B-32 so herbarium paper cards, text labels, and
off-topic images are automatically rejected before saving.

Usage:
  datasets/.venv/Scripts/python.exe datasets/scripts/gather_condition_datasets.py --per-class 45
"""

import argparse
import hashlib
import io
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

import requests
from PIL import Image

BASE_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BASE_DIR.parent
sys.path.insert(0, str(REPO_ROOT / "backend"))

USER_AGENT = "AgriPestCapstoneCollector/2.0 (Academic Research; Python requests)"
HEADERS = {"User-Agent": USER_AGENT}

EXPANSION_CLASSES: List[Dict] = [
    # 04. Nutrient Deficiencies & Abiotic Stress
    {
        "category": "04_nutrient_deficiencies",
        "folder": "nitrogen_deficiency",
        "wiki_queries": [
            "nitrogen deficiency leaf yellowing",
            "chlorosis nitrogen deficiency vegetable leaf",
            "lettuce yellowing nutrient deficiency",
            "brassica nitrogen deficiency leaf",
        ],
        "require_plant": True,
    },
    {
        "category": "04_nutrient_deficiencies",
        "folder": "calcium_deficiency_tipburn",
        "wiki_queries": [
            "lettuce tipburn calcium deficiency",
            "tipburn cabbage brassica leaf",
            "calcium deficiency plant leaf tip burn",
            "marginal leaf necrosis tipburn vegetable",
        ],
        "require_plant": True,
    },
    {
        "category": "04_nutrient_deficiencies",
        "folder": "potassium_deficiency",
        "wiki_queries": [
            "potassium deficiency leaf marginal scorch",
            "potassium deficiency vegetable leaf edge burn",
            "potassium deficiency cabbage brassica",
        ],
        "require_plant": True,
    },
    {
        "category": "04_nutrient_deficiencies",
        "folder": "interveinal_chlorosis",
        "wiki_queries": [
            "magnesium deficiency interveinal chlorosis leaf",
            "iron deficiency interveinal chlorosis plant leaf",
            "chlorosis leaf green veins yellow",
        ],
        "require_plant": True,
    },
    # 05. Indirect Pest-Damage Symptoms (pest may not be visible)
    {
        "category": "05_pest_damage_symptoms",
        "folder": "chewing_damage",
        "wiki_queries": [
            "cabbage leaf caterpillar chewing damage holes",
            "diamondback moth feeding damage brassica leaf",
            "insect chewed holes vegetable leaf",
            "brassica leaf skeletonized caterpillar damage",
        ],
        "require_plant": True,
    },
    {
        "category": "05_pest_damage_symptoms",
        "folder": "shothole_damage",
        "wiki_queries": [
            "flea beetle damage brassica leaf holes",
            "Phyllotreta feeding damage leaf",
            "flea beetle shot holes radish cabbage bok choy",
        ],
        "require_plant": True,
    },
    {
        "category": "05_pest_damage_symptoms",
        "folder": "leafminer_damage",
        "wiki_queries": [
            "Liriomyza leaf miner trail leaf",
            "serpentine leafminer damage leaf",
            "leaf miner tunnels green leaf",
        ],
        "require_plant": True,
    },
    {
        "category": "05_pest_damage_symptoms",
        "folder": "sucking_damage",
        "wiki_queries": [
            "aphid leaf curl damage vegetable",
            "thrips silvering damage leaf",
            "sooty mold honeydew aphid leaf",
            "curled distorted leaf aphid infestation",
        ],
        "require_plant": True,
    },
    # 00. Hard Background Negatives (non-leafy-green plants & everyday objects for OOD YOLO robustness)
    {
        "category": "00_background_negatives",
        "folder": "non_target_negatives",
        "wiki_queries": [
            "tomato fruit plant garden",
            "rose flower blooming garden",
            "smartphone on wooden desk",
            "domestic cat portrait",
            "potted indoor houseplant succulent",
        ],
        "require_plant": False,
    },
]


def search_wikimedia_images(query: str, limit: int = 25) -> List[str]:
    url = "https://commons.wikimedia.org/w/api.php"
    params = {
        "action": "query",
        "format": "json",
        "generator": "search",
        "gsrsearch": f"filetype:bitmap {query}",
        "gsrnamespace": 6,
        "gsrlimit": min(50, limit),
        "prop": "imageinfo",
        "iiprop": "url|mime|size",
        "iiurlwidth": 800,
    }
    for attempt in range(3):
        try:
            resp = requests.get(url, params=params, headers=HEADERS, timeout=20)
            if resp.status_code == 429:
                wait_s = 2.0 * (attempt + 1)
                time.sleep(wait_s)
                continue
            resp.raise_for_status()
            pages = resp.json().get("query", {}).get("pages", {})
            urls: List[str] = []
            for page in pages.values():
                infos = page.get("imageinfo") or []
                if not infos:
                    continue
                info = infos[0]
                mime = (info.get("mime") or "").lower()
                if mime not in ("image/jpeg", "image/png", "image/webp"):
                    continue
                img_url = info.get("thumburl") or info.get("url")
                if img_url:
                    urls.append(img_url)
            return urls
        except Exception as err:
            if attempt == 2:
                print(f"  [WARN] Wikimedia query '{query}' failed: {err}")
            time.sleep(1.5)
    return []


def search_inaturalist_images(query: str, limit: int = 30) -> List[str]:
    """Queries iNaturalist public observations API (no key required) for field photos."""
    url = "https://api.inaturalist.org/v1/observations"
    params = {
        "q": query,
        "photos": "true",
        "per_page": min(40, limit),
        "order": "desc",
        "order_by": "votes",
    }
    try:
        resp = requests.get(url, params=params, headers=HEADERS, timeout=20)
        resp.raise_for_status()
        urls: List[str] = []
        for obs in resp.json().get("results", []):
            for photo in obs.get("photos", [])[:1]:
                u = photo.get("url")
                if u:
                    urls.append(u.replace("square.", "medium."))
        return urls
    except Exception as err:
        print(f"  [WARN] iNaturalist query '{query}' failed: {err}")
        return []


def download_and_standardize(url: str) -> Optional[Image.Image]:
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        if r.status_code != 200 or len(r.content) < 4000:
            return None
        im = Image.open(io.BytesIO(r.content)).convert("RGB")
        if min(im.size) < 160:
            return None
        im.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
        return im
    except Exception:
        return None


def main():
    parser = argparse.ArgumentParser(description="Gather CLIP-verified nutrient deficiency & pest damage datasets.")
    parser.add_argument("--per-class", type=int, default=35, help="Max verified images per class folder")
    args = parser.parse_args()

    from app.services.detection.domain_gate import check_image_sanity, has_organic_foliage_colors

    # Load CLIP for paper/diagram rejection on plant symptom classes
    clip_model = None
    clip_preprocess = None
    clip_device = "cpu"
    text_feat = None
    weights = REPO_ROOT / "weights" / "clip" / "ViT-B-32.pt"
    if weights.exists():
        import clip
        import torch

        clip_device = "cuda" if torch.cuda.is_available() else "cpu"
        clip_model, clip_preprocess = clip.load(str(weights), device=clip_device, jit=False)
        clip_model.eval()
        verify_prompts = [
            "a real photograph of a green or yellowing plant leaf with damage, spots, chlorosis, or nutrient deficiency",
            "a real close-up field photo of vegetable leaves with insect chewing holes or leafminer trails",
            "a diagram, chart, text document, herbarium paper label, map, or illustration",
            "a photo of a person, building, car, or indoor furniture",
        ]
        with torch.no_grad():
            tf = clip_model.encode_text(clip.tokenize(verify_prompts).to(clip_device))
            text_feat = tf / tf.norm(dim=-1, keepdim=True)
        print(f"[INFO] Loaded CLIP ViT-B-32 filter on {clip_device}")

    def is_valid_plant_photo(im: Image.Image) -> bool:
        if check_image_sanity(im) is not None:
            return False
        full_box = {"x_min": 0.0, "y_min": 0.0, "x_max": 1.0, "y_max": 1.0}
        if not has_organic_foliage_colors(im, full_box, min_foliage_ratio=0.10):
            return False
        if clip_model is not None and text_feat is not None:
            import torch

            inp = clip_preprocess(im).unsqueeze(0).to(clip_device)
            with torch.no_grad():
                imf = clip_model.encode_image(inp)
                imf = imf / imf.norm(dim=-1, keepdim=True)
                probs = (100.0 * (imf @ text_feat.T)).softmax(dim=-1).squeeze(0).cpu().numpy()
            if float(probs[0] + probs[1]) < 0.65:
                return False
        return True

    summary: Dict[str, int] = {}
    for entry in EXPANSION_CLASSES:
        cat = entry["category"]
        folder = entry["folder"]
        out_dir = BASE_DIR / cat / folder
        out_dir.mkdir(parents=True, exist_ok=True)

        existing = list(out_dir.glob("*.jpg"))
        seen_hashes = {p.stem.split("_")[-1] for p in existing}
        saved = len(existing)
        print(f"\n[{cat}/{folder}] Existing={saved} | Target={args.per_class}")

        if saved >= args.per_class:
            summary[f"{cat}/{folder}"] = saved
            continue

        candidate_urls: List[str] = []
        for q in entry["wiki_queries"]:
            candidate_urls.extend(search_wikimedia_images(q, limit=20))
            time.sleep(1.2)
            candidate_urls.extend(search_inaturalist_images(q, limit=20))
            time.sleep(0.5)

        # Deduplicate URLs
        unique_urls = list(dict.fromkeys(candidate_urls))
        rejected = 0
        for url in unique_urls:
            if saved >= args.per_class:
                break
            im = download_and_standardize(url)
            if im is None:
                continue
            if entry["require_plant"] and not is_valid_plant_photo(im):
                rejected += 1
                continue
            buf = io.BytesIO()
            im.save(buf, format="JPEG", quality=90)
            raw_bytes = buf.getvalue()
            h = hashlib.sha256(raw_bytes).hexdigest()[:12]
            if h in seen_hashes:
                continue
            seen_hashes.add(h)
            (out_dir / f"wiki_{h}.jpg").write_bytes(raw_bytes)
            saved += 1

        print(f"  -> Saved total={saved} (CLIP-rejected non-plant/diagrams={rejected})")
        summary[f"{cat}/{folder}"] = saved

    manifest_path = BASE_DIR / "condition_expansion_manifest.json"
    manifest_path.write_text(
        json.dumps(
            {
                "generated_at_utc": datetime.now(timezone.utc).isoformat(),
                "classes": summary,
                "total_images": sum(summary.values()),
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"\n[DONE] Saved condition expansion manifest -> {manifest_path}")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
