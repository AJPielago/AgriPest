"""
Holistic Plant Condition, Indirect Pest-Damage Inference & Nutrient Deficiency Analyzer.

Answers three real-world field diagnostic questions on every verified scan of
Lettuce (Litsugas), Bok Choy (Petsay), or Mustard Greens (Mustasa):
  1. Total Plant Condition: Healthy, Pest-Damaged, Diseased, Nutrient-Deficient, or Combined
     with an objective Plant Health Score (0-100) and visual chlorosis/necrosis signals.
  2. Indirect Pest Damage: Identifies feeding scars (chewed holes, shot-holes, leafminer
     trails, sap-sucking curl/stippling) even when the insect itself is hidden or absent,
     and maps them to host-crop-specific probable culprit pest species + IPM steps.
  3. Nutrient Deficiency & Abiotic Stress: Distinguishes non-infectious nutritional/abiotic
     disorders (Nitrogen chlorosis, Calcium tipburn, Potassium marginal scorch,
     Magnesium/Iron interveinal chlorosis, Heat/Water stress) from pests and pathogens.
"""

from collections import deque
import logging
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np
from PIL import Image, ImageFilter

from app.services.detection.domain_gate import (
    BRASSICA_CROPS,
    CLASS_REGISTRY,
    TARGET_CROPS,
    assess_image_quality,
)

logger = logging.getLogger("agripest.condition")


# ---------------------------------------------------------------------------
# Agronomic Knowledge Base: Indirect Pest Damage -> Probable Culprit Pests
# ---------------------------------------------------------------------------

PEST_DAMAGE_CATALOG: Dict[str, Dict[str, Any]] = {
    "chewing_damage": {
        "damage_type": "Chewing / Skeletonized Foliage Damage",
        "severity": "High",
        "description": (
            "Irregular chewed holes, ragged eaten leaf margins, or translucent windowpane "
            "skeletonization caused by chewing caterpillar larvae."
        ),
        "recommended_action": (
            "Inspect leaf undersides and soil around stems at dusk or early morning when larvae feed. "
            "Hand-pick visible caterpillars and spray selective Bacillus thuringiensis (Bt kurstaki) at twilight."
        ),
        "culprits_by_crop": {
            "Lettuce": [
                {
                    "name": "Cabbage Looper",
                    "scientific_name": "Trichoplusia ni",
                    "likelihood": "High",
                    "evidence": "Large ragged irregular holes chewed across tender lettuce blades",
                },
                {
                    "name": "Common Cutworm",
                    "scientific_name": "Spodoptera litura",
                    "likelihood": "High",
                    "evidence": "Nocturnal defoliation and chewed outer wrapper leaves",
                },
                {
                    "name": "Beet Armyworm",
                    "scientific_name": "Spodoptera exigua",
                    "likelihood": "Moderate",
                    "evidence": "Skeletonized patches and irregular foliar feeding notches",
                },
            ],
            "Brassica": [
                {
                    "name": "Diamondback Moth",
                    "scientific_name": "Plutella xylostella",
                    "likelihood": "High",
                    "evidence": "Translucent windowpane scars and small irregular holes on brassica leaves",
                },
                {
                    "name": "Cabbage Looper",
                    "scientific_name": "Trichoplusia ni",
                    "likelihood": "High",
                    "evidence": "Large ragged chew holes across foliage with dark frass pellets",
                },
                {
                    "name": "Common Cutworm",
                    "scientific_name": "Spodoptera litura",
                    "likelihood": "Moderate",
                    "evidence": "Heavy nighttime leaf chewing and notched margins",
                },
                {
                    "name": "Cabbage Cluster Caterpillar",
                    "scientific_name": "Crocidolomia pavonana",
                    "likelihood": "Moderate",
                    "evidence": "Clustered skeletonizing of young inner brassica leaves",
                },
            ],
        },
    },
    "shothole_damage": {
        "damage_type": "Shot-Hole Punctures (Flea Beetle Feeding)",
        "severity": "High",
        "description": (
            "Numerous minute circular shot-holes giving young leaves a sieve-like appearance, "
            "typical of jumping flea beetles that flee when approached."
        ),
        "recommended_action": (
            "Install 32-mesh fine insect netting over beds, place yellow sticky cards near soil level, "
            "and dust food-grade diatomaceous earth around seedling bases."
        ),
        "culprits_by_crop": {
            "Brassica": [
                {
                    "name": "Striped Flea Beetle",
                    "scientific_name": "Phyllotreta striolata",
                    "likelihood": "High",
                    "evidence": "Signature tiny circular shot-holes across Bok Choy / Mustard foliage",
                },
                {
                    "name": "Diamondback Moth",
                    "scientific_name": "Plutella xylostella",
                    "likelihood": "Low",
                    "evidence": "Early-instar larvae can leave tiny translucent pinholes before expanding",
                },
            ],
            "Lettuce": [
                {
                    "name": "Striped Flea Beetle",
                    "scientific_name": "Phyllotreta striolata",
                    "likelihood": "Moderate",
                    "evidence": "Pinpoint circular feeding punctures (check adjacent brassica beds)",
                },
                {
                    "name": "Beet Armyworm",
                    "scientific_name": "Spodoptera exigua",
                    "likelihood": "Low",
                    "evidence": "Early instar pit-feeding on young lettuce leaves",
                },
            ],
        },
    },
    "leafminer_damage": {
        "damage_type": "Serpentine Leaf Mines & Tunnels",
        "severity": "Moderate",
        "description": (
            "Winding silvery-white tunnels etched inside the leaf mesophyll by burrowing fly larvae "
            "hidden beneath the leaf epidermis."
        ),
        "recommended_action": (
            "Prune and destroy early mined leaves before larvae pupate in soil, and deploy bright "
            "yellow sticky card traps at canopy height to capture adult flies."
        ),
        "culprits_by_crop": {
            "Lettuce": [
                {
                    "name": "Serpentine Leafminer",
                    "scientific_name": "Liriomyza trifolii",
                    "likelihood": "High",
                    "evidence": "Winding white serpentine feeding tunnels inside leaf blade",
                },
            ],
            "Brassica": [
                {
                    "name": "Serpentine Leafminer",
                    "scientific_name": "Liriomyza trifolii",
                    "likelihood": "High",
                    "evidence": "Winding white serpentine mines inside brassica foliage",
                },
            ],
        },
    },
    "sucking_damage": {
        "damage_type": "Sap-Sucking Curl, Stippling & Distortion",
        "severity": "Moderate",
        "description": (
            "Curled, cupped, or crinkled leaves with pale stippling, silvery scarring, or sticky "
            "honeydew caused by sap-sucking insects hiding on leaf undersides."
        ),
        "recommended_action": (
            "Turn leaves over to confirm colonies underneath; wash undersides thoroughly with 1% "
            "potassium insecticidal soap or cold-pressed neem oil (5ml/L) and deploy yellow/blue sticky traps."
        ),
        "culprits_by_crop": {
            "Lettuce": [
                {
                    "name": "Green Peach Aphid",
                    "scientific_name": "Myzus persicae",
                    "likelihood": "High",
                    "evidence": "Downward leaf curling, stunted young tips, and honeydew distortion",
                },
                {
                    "name": "Silverleaf Whitefly",
                    "scientific_name": "Bemisia tabaci",
                    "likelihood": "Moderate",
                    "evidence": "Yellowing stipples and sticky residue on underside of leaves",
                },
                {
                    "name": "Onion / Leaf Thrips",
                    "scientific_name": "Thrips tabaci / palmi",
                    "likelihood": "Moderate",
                    "evidence": "Silvery bronzed scraping streaks and distorted leaf margins",
                },
            ],
            "Brassica": [
                {
                    "name": "Turnip / Mustard Aphid",
                    "scientific_name": "Lipaphis erysimi",
                    "likelihood": "High",
                    "evidence": "Severe leaf cupping, crinkling, and yellowing on Bok Choy / Mustard",
                },
                {
                    "name": "Green Peach Aphid",
                    "scientific_name": "Myzus persicae",
                    "likelihood": "High",
                    "evidence": "Curled foliage and stunted vegetative shoot tips",
                },
                {
                    "name": "Silverleaf Whitefly",
                    "scientific_name": "Bemisia tabaci",
                    "likelihood": "Moderate",
                    "evidence": "Chlorotic mottling and sticky honeydew on lower leaves",
                },
            ],
        },
    },
}


# ---------------------------------------------------------------------------
# Agronomic Knowledge Base: Nutrient Deficiencies & Abiotic Disorders
# ---------------------------------------------------------------------------

NUTRIENT_DEFICIENCY_CATALOG: Dict[str, Dict[str, Any]] = {
    "nitrogen_deficiency": {
        "name": "Nitrogen (N) Deficiency",
        "nutrient": "Nitrogen (N)",
        "severity": "Moderate",
        "symptoms": (
            "Uniform pale yellow-green chlorosis beginning on older outer leaves, reduced leaf size, "
            "and overall pale stunted foliage without distinct fungal spots or chew holes."
        ),
        "causes": "Depleted soil organic nitrogen, heavy rainfall leaching, or low hydroponic EC.",
        "recommended_action": (
            "Side-dress with organic nitrogen (vermicompost tea, fish amino acid, or balanced NPK fertilizer). "
            "In hydroponics, verify nutrient solution EC (1.2-1.8 mS/cm for lettuce) and pH (5.8-6.4)."
        ),
    },
    "calcium_deficiency_tipburn": {
        "name": "Calcium (Ca) Deficiency / Tipburn",
        "nutrient": "Calcium (Ca)",
        "severity": "Moderate",
        "symptoms": (
            "Brown-to-black scorched necrotic leaf tips and inner leaf margins, often dry or papery "
            "without foul bacterial slime—especially common in fast-growing lettuce and bok choy."
        ),
        "causes": "Poor transpiration/airflow, heat spikes, uneven watering, or low available calcium.",
        "recommended_action": (
            "Increase canopy air circulation, maintain steady morning drip irrigation, avoid excess "
            "nitrogen/heat spikes, and apply a foliar calcium nitrate or chelated calcium spray."
        ),
    },
    "potassium_deficiency": {
        "name": "Potassium (K) Deficiency / Marginal Scorch",
        "nutrient": "Potassium (K)",
        "severity": "Moderate",
        "symptoms": (
            "Yellowing followed by dry brown scorching along outer leaf edges and tips of older leaves "
            "while the central leaf blade stays comparatively green."
        ),
        "causes": "Low soil potassium reserves, sandy leached beds, or excess calcium/magnesium antagonism.",
        "recommended_action": (
            "Supplement with potassium sulfate (0-0-50), wood ash in moderation, or fermented fruit/banana-peel "
            "potassium extract; ensure consistent root-zone moisture."
        ),
    },
    "interveinal_chlorosis": {
        "name": "Magnesium (Mg) / Iron (Fe) Interveinal Chlorosis",
        "nutrient": "Magnesium (Mg) / Iron (Fe)",
        "severity": "Moderate",
        "symptoms": (
            "Distinct yellowing between leaf veins while the veins themselves remain sharply dark green "
            "(older outer leaves indicate Magnesium deficiency; young inner leaves indicate Iron lockout)."
        ),
        "causes": "High soil/water pH (> 7.0) locking out Iron, or depleted Magnesium in wet/acidic soils.",
        "recommended_action": (
            "Check root-zone pH and adjust to 6.0-6.5. Apply Epsom salt (magnesium sulfate, 1-2 tsp/L foliar spray) "
            "for older-leaf chlorosis, or chelated iron (Fe-EDDHA) if young inner leaves are yellowing."
        ),
    },
    "abiotic_water_heat_stress": {
        "name": "Heat / Water / Sunscald Stress (Abiotic)",
        "nutrient": "Abiotic (Water / Heat)",
        "severity": "Low",
        "symptoms": (
            "Wilted drooping foliage, scorched papery bleached patches, or stressed pale leaves "
            "without insect feeding scars or fungal sporulation."
        ),
        "causes": "Midday heat spikes, irregular irrigation, high root temperature, or direct sunscald.",
        "recommended_action": (
            "Install 30-50% shade netting during peak midday sun, mulch beds to cool roots, "
            "and irrigate consistently in the early morning."
        ),
    },
}


def _cluster_boxes(
    raw_boxes: List[Tuple[float, float, float, float]],
    merge_gap: float = 0.08,
    pad: float = 0.025,
    max_boxes: int = 4,
) -> List[Dict[str, float]]:
    """
    Merges nearby/overlapping normalized boxes (x1, y1, x2, y2) into at most `max_boxes`
    clean, readable damaged-zone boxes tightly framing the affected leaf regions.
    """
    if not raw_boxes:
        return []

    clusters: List[List[float]] = []  # [x1, y1, x2, y2, count]
    for x1, y1, x2, y2 in raw_boxes:
        merged_idx = -1
        for idx, c in enumerate(clusters):
            if (
                x1 <= c[2] + merge_gap
                and x2 >= c[0] - merge_gap
                and y1 <= c[3] + merge_gap
                and y2 >= c[1] - merge_gap
            ):
                merged_idx = idx
                break
        if merged_idx >= 0:
            c = clusters[merged_idx]
            c[0] = min(c[0], x1)
            c[1] = min(c[1], y1)
            c[2] = max(c[2], x2)
            c[3] = max(c[3], y2)
            c[4] += 1.0
        else:
            clusters.append([x1, y1, x2, y2, 1.0])

    # Second transitive merge pass so newly expanded adjacent clusters consolidate cleanly
    changed = True
    while changed and len(clusters) > 1:
        changed = False
        for i in range(len(clusters)):
            for j in range(i + 1, len(clusters)):
                a, b = clusters[i], clusters[j]
                if (
                    a[0] <= b[2] + merge_gap * 0.7
                    and a[2] >= b[0] - merge_gap * 0.7
                    and a[1] <= b[3] + merge_gap * 0.7
                    and a[3] >= b[1] - merge_gap * 0.7
                ):
                    clusters[i] = [
                        min(a[0], b[0]),
                        min(a[1], b[1]),
                        max(a[2], b[2]),
                        max(a[3], b[3]),
                        a[4] + b[4],
                    ]
                    clusters.pop(j)
                    changed = True
                    break
            if changed:
                break

    # Prefer clusters with the most holes / largest damaged area
    clusters.sort(key=lambda c: (c[4], (c[2] - c[0]) * (c[3] - c[1])), reverse=True)
    results: List[Dict[str, float]] = []
    for x1, y1, x2, y2, _ in clusters[:max_boxes]:
        results.append(
            {
                "x_min": round(max(0.02, x1 - pad), 4),
                "y_min": round(max(0.02, y1 - pad), 4),
                "x_max": round(min(0.98, x2 + pad), 4),
                "y_max": round(min(0.98, y2 + pad), 4),
            }
        )
    return results


def detect_enclosed_leaf_holes_with_boxes(
    im: Image.Image,
) -> Tuple[int, float, List[Dict[str, float]]]:
    """
    Pure Pillow + NumPy multi-scale detector for insect chew-holes / shot-holes strictly
    enclosed inside bright green leafy foliage (zero OpenCV dependency, Render-safe).
    Returns `(hole_count, hole_area_pct, clustered_damage_boxes)` in normalized [0..1] coords.
    """
    try:
        w, h = im.size
        if w < 48 or h < 48:
            return 0, 0.0, []
        # Strip outer edges (bezels/frames/background margins) and normalize size
        cx0_f, cy0_f, cx1_f, cy1_f = 0.08, 0.12, 0.92, 0.88
        crop = im.crop((int(w * cx0_f), int(h * cy0_f), int(w * cx1_f), int(h * cy1_f)))
        crop = crop.resize((320, 320), Image.Resampling.BILINEAR)

        hsv = np.asarray(crop.convert("HSV"), dtype=np.float32)
        hue, sat, val = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]

        green = (hue >= 36) & (hue <= 118) & (sat >= 42) & (val >= 75)
        soil_bg = (~green) & (val >= 55)
        if float(green.mean()) < 0.25:
            return 0, 0.0, []

        val_img = Image.fromarray(val.astype(np.uint8), mode="L")
        # Multi-scale local reference: wide 29x29 ceiling reaches outside large zoomed-in
        # caterpillar chew-holes (up to ~35px wide) while still catching small flea-beetle shot-holes.
        local_leaf_ref = np.asarray(val_img.filter(ImageFilter.MaxFilter(29)), dtype=np.float32)
        local_mid = np.asarray(val_img.filter(ImageFilter.BoxBlur(15)), dtype=np.float32)

        dark_spot = (
            ((local_leaf_ref - val) >= 62.0)
            & ((local_mid - val) >= 24.0)
            & (val < 130.0)
        )
        ys, xs = np.where(dark_spot)
        if ys.size == 0 or ys.size > 40000:
            return 0, 0.0, []

        height, width = dark_spot.shape
        visited = np.zeros((height, width), dtype=bool)
        hole_count = 0
        total_hole_area = 0
        raw_hole_boxes: List[Tuple[float, float, float, float]] = []

        for sy, sx in zip(ys.tolist(), xs.tolist()):
            if visited[sy, sx]:
                continue
            q = deque([(sy, sx)])
            visited[sy, sx] = True
            pixels: List[Tuple[int, int]] = []
            min_y = max_y = sy
            min_x = max_x = sx
            touches_border = False

            while q:
                cy, cx = q.popleft()
                pixels.append((cy, cx))
                if cy <= 5 or cy >= height - 6 or cx <= 5 or cx >= width - 6:
                    touches_border = True
                if cy < min_y:
                    min_y = cy
                if cy > max_y:
                    max_y = cy
                if cx < min_x:
                    min_x = cx
                if cx > max_x:
                    max_x = cx

                for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < height and 0 <= nx < width and not visited[ny, nx] and dark_spot[ny, nx]:
                        visited[ny, nx] = True
                        q.append((ny, nx))

            area = len(pixels)
            if touches_border or area < 6 or area > 3500:
                continue

            bh = max_y - min_y + 1
            bw = max_x - min_x + 1
            if max(bh, bw) / max(1, min(bh, bw)) > 3.5:
                continue  # Ignore elongated leaf-fold shadow creases
            if area / float(bh * bw) < 0.28:
                continue  # Ignore lacy background gaps

            pad = 7
            ry0, ry1 = max(0, min_y - pad), min(height, max_y + pad + 1)
            rx0, rx1 = max(0, min_x - pad), min(width, max_x + pad + 1)

            top_strip = green[ry0:min_y, rx0:rx1]
            bot_strip = green[max_y + 1 : ry1, rx0:rx1]
            left_strip = green[ry0:ry1, rx0:min_x]
            right_strip = green[ry0:ry1, max_x + 1 : rx1]
            sides = [float(s.mean()) if s.size > 0 else 0.0 for s in (top_strip, bot_strip, left_strip, right_strip)]

            if min(sides) < 0.65 or float(np.mean(sides)) < 0.80:
                continue
            if float(soil_bg[ry0:ry1, rx0:rx1].mean()) > 0.04:
                continue

            # Sharp brightness cliff between immediate 3px green rim and hole interior
            rim_pad = 3
            iy0, iy1 = max(0, min_y - rim_pad), min(height, max_y + rim_pad + 1)
            ix0, ix1 = max(0, min_x - rim_pad), min(width, max_x + rim_pad + 1)
            rim_green_vals = val[iy0:iy1, ix0:ix1][green[iy0:iy1, ix0:ix1]]
            if rim_green_vals.size == 0:
                continue
            hole_v = float(np.mean([val[py, px] for py, px in pixels]))
            if float(np.median(rim_green_vals)) - hole_v >= 55.0:
                hole_count += 1
                total_hole_area += area
                # Map crop-space [0..width/height] back to full-image normalized [0..1] coords
                nx1 = cx0_f + (min_x / float(width)) * (cx1_f - cx0_f)
                ny1 = cy0_f + (min_y / float(height)) * (cy1_f - cy0_f)
                nx2 = cx0_f + ((max_x + 1) / float(width)) * (cx1_f - cx0_f)
                ny2 = cy0_f + ((max_y + 1) / float(height)) * (cy1_f - cy0_f)
                raw_hole_boxes.append((nx1, ny1, nx2, ny2))

        hole_area_pct = round(total_hole_area / float(height * width) * 100.0, 2)
        clustered = _cluster_boxes(raw_hole_boxes, merge_gap=0.09, pad=0.03, max_boxes=4)
        return hole_count, hole_area_pct, clustered
    except Exception:
        return 0, 0.0, []


def detect_enclosed_leaf_holes(im: Image.Image) -> Tuple[int, float]:
    """Backwards-compatible wrapper returning `(hole_count, hole_area_pct)`."""
    count, area_pct, _ = detect_enclosed_leaf_holes_with_boxes(im)
    return count, area_pct


def _extract_stress_region_boxes(
    stress_mask: np.ndarray,
    crop_bounds: Tuple[float, float, float, float] = (0.10, 0.10, 0.90, 0.90),
    max_boxes: int = 3,
) -> List[Dict[str, float]]:
    """
    Divides a 96x96 chlorosis/necrosis mask into a 6x6 grid, selects cells with
    concentrated stress (>= 22% affected pixels), and merges adjacent cells into
    tight normalized bounding boxes on the actual yellowed/scorched leaf zones.
    """
    h, w = stress_mask.shape
    cx0, cy0, cx1, cy1 = crop_bounds
    grid = 6
    cell_h, cell_w = h // grid, w // grid
    raw: List[Tuple[float, float, float, float]] = []
    for r in range(grid):
        for c in range(grid):
            patch = stress_mask[r * cell_h : (r + 1) * cell_h, c * cell_w : (c + 1) * cell_w]
            if float(patch.mean()) >= 0.22:
                x1 = cx0 + (c / float(grid)) * (cx1 - cx0)
                y1 = cy0 + (r / float(grid)) * (cy1 - cy0)
                x2 = cx0 + ((c + 1) / float(grid)) * (cx1 - cx0)
                y2 = cy0 + ((r + 1) / float(grid)) * (cy1 - cy0)
                raw.append((x1, y1, x2, y2))
    return _cluster_boxes(raw, merge_gap=0.04, pad=0.015, max_boxes=max_boxes)


def extract_visual_foliage_signals(
    image_source: Union[str, Image.Image],
    include_boxes: bool = False,
) -> Dict[str, Any]:
    """
    Extracts quantitative visual foliage ratios from the central specimen region:
      - green_foliage_pct: healthy green chlorophyll ratio
      - yellow_chlorosis_pct: yellowing/chlorotic tissue ratio (N/Mg/Fe deficiency or viral/mildew)
      - brown_necrosis_pct: brown/scorched/rotted tissue ratio (tipburn, K-scorch, rot, spots)
      - leaf_hole_count: count of distinct dark chew/shot-holes enclosed inside green foliage
      - hole_area_pct: percentage of central leaf area perforated by enclosed holes
    When `include_boxes=True`, also attaches `damage_boxes` and `stress_boxes` for tight UI overlays.
    """
    try:
        if isinstance(image_source, Image.Image):
            im = image_source.convert("RGB")
            should_close = False
        else:
            im = Image.open(image_source).convert("RGB")
            should_close = True
        try:
            w, h = im.size
            # Focus on central 80% to reduce background soil/table skew
            crop = im.crop((int(w * 0.1), int(h * 0.1), int(w * 0.9), int(h * 0.9)))
            small = crop.resize((96, 96), Image.Resampling.BILINEAR)
            hsv = np.asarray(small.convert("HSV"), dtype=np.uint8)
            hue, sat, val = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]

            # PIL HSV H in [0..255]
            healthy_green = (hue >= 42) & (hue <= 122) & (sat >= 35) & (val >= 32)
            yellow_chlorosis = (hue >= 22) & (hue < 42) & (sat >= 38) & (val >= 55)
            brown_necrosis = (hue >= 6) & (hue < 22) & (sat >= 35) & (val >= 28) & (val <= 215)
            leaf_hole_count, hole_area_pct, damage_boxes = detect_enclosed_leaf_holes_with_boxes(im)

            result: Dict[str, Any] = {
                "green_foliage_pct": round(float(healthy_green.mean()) * 100.0, 1),
                "yellow_chlorosis_pct": round(float(yellow_chlorosis.mean()) * 100.0, 1),
                "brown_necrosis_pct": round(float(brown_necrosis.mean()) * 100.0, 1),
                "leaf_hole_count": int(leaf_hole_count),
                "hole_area_pct": float(hole_area_pct),
            }
            if include_boxes:
                stress_mask = yellow_chlorosis | brown_necrosis
                result["_localized_boxes"] = {
                    "damage_boxes": damage_boxes,
                    "stress_boxes": _extract_stress_region_boxes(stress_mask),
                }
            return result
        finally:
            if should_close:
                im.close()
    except Exception:
        fallback: Dict[str, Any] = {
            "green_foliage_pct": 0.0,
            "yellow_chlorosis_pct": 0.0,
            "brown_necrosis_pct": 0.0,
            "leaf_hole_count": 0,
            "hole_area_pct": 0.0,
        }
        if include_boxes:
            fallback["_localized_boxes"] = {"damage_boxes": [], "stress_boxes": []}
        return fallback


def get_probable_culprits(damage_key: str, crop_name: Optional[str]) -> List[Dict[str, str]]:
    entry = PEST_DAMAGE_CATALOG.get(damage_key)
    if not entry:
        return []
    family = "Brassica" if crop_name in BRASSICA_CROPS else "Lettuce"
    return [dict(c) for c in entry["culprits_by_crop"].get(family, entry["culprits_by_crop"]["Lettuce"])]


def get_screened_targets(crop_name: Optional[str]) -> Dict[str, List[str]]:
    """
    Returns the exact host-crop-compatible list of insect pests, plant diseases,
    and nutrient/abiotic disorders that the system screens for on a given scan.
    """
    resolved_crop = crop_name if crop_name in TARGET_CROPS else None
    pests: List[str] = []
    diseases: List[str] = []
    for _, (kind, display_name, valid_crops, _) in CLASS_REGISTRY.items():
        if resolved_crop and resolved_crop not in valid_crops:
            continue
        if kind == "pest" and display_name not in pests:
            pests.append(display_name)
        elif kind == "disease" and display_name not in diseases:
            diseases.append(display_name)
    nutrients = [meta["name"] for meta in NUTRIENT_DEFICIENCY_CATALOG.values()]
    return {
        "pests": pests,
        "diseases": diseases,
        "nutrients": nutrients,
    }


class HolisticConditionAnalyzer:
    """
    Zero-shot visual plant condition, indirect pest-damage, and nutrient-deficiency analyzer.
    Shares the already-loaded CLIP ViT-B-32 model from `CLIPDomainGate` (zero extra VRAM).
    """

    CONDITION_PROMPTS: Tuple[Tuple[str, str, str], ...] = (
        # (group, key, text_prompt)
        ("healthy", "healthy_foliage", "a close-up photo of fresh, vibrant green, undamaged healthy lettuce, bok choy, or mustard leaves"),
        ("healthy", "healthy_foliage", "a photo of crisp green leafy vegetable foliage with intact edges and no holes, yellowing, or rot"),
        # Indirect pest-damage signatures (insect not required to be visible)
        ("pest_damage", "chewing_damage", "a photo of green leafy vegetable leaves with irregular chewed holes, ragged eaten margins, or caterpillar feeding damage"),
        ("pest_damage", "shothole_damage", "a photo of green lettuce, bok choy, or mustard leaves riddled with many tiny round pinholes and flea beetle shot-hole punctures"),
        ("pest_damage", "leafminer_damage", "a photo of a green vegetable leaf with winding silvery-white serpentine leafminer tunnels etched inside the leaf"),
        ("pest_damage", "sucking_damage", "a photo of severely curled, cupped, crinkled, distorted leafy vegetable leaves with stippling or honeydew from aphids or thrips"),
        # Nutrient deficiencies & abiotic stress
        ("nutrient_deficiency", "nitrogen_deficiency", "a photo of pale yellow-green chlorotic lettuce or leafy vegetable plants with uniform yellowing from nitrogen nutrient deficiency"),
        ("nutrient_deficiency", "calcium_deficiency_tipburn", "a photo of lettuce or bok choy leaves with brown scorched dead leaf tips and necrotic inner margins from calcium deficiency tipburn"),
        ("nutrient_deficiency", "potassium_deficiency", "a photo of leafy green leaves with dry brown scorched outer edges and yellow marginal burn from potassium nutrient deficiency"),
        ("nutrient_deficiency", "interveinal_chlorosis", "a photo of a vegetable leaf with yellow tissue between sharply dark green veins showing magnesium or iron interveinal chlorosis"),
        ("nutrient_deficiency", "abiotic_water_heat_stress", "a photo of wilted, drooping, or sunscalded bleached leafy vegetable leaves caused by heat or water stress"),
        # Infectious pathogen signatures (kept in softmax so diseases don't masquerade as nutrient deficiency)
        ("infectious_disease", "fungal_mildew_spots", "a photo of a lettuce or brassica leaf with white powdery mildew, downy mildew mold, white rust pustules, or circular fungal leaf spots"),
        ("infectious_disease", "bacterial_soft_rot", "a photo of slimy, water-soaked, dark brown decaying lettuce or bok choy stems with bacterial soft rot"),
    )

    def __init__(self, clip_gate: Optional[Any] = None):
        self.clip_gate = clip_gate
        self._text_features = None
        self._init_features()

    def _init_features(self) -> None:
        if self.clip_gate is None or not getattr(self.clip_gate, "available", False):
            return
        try:
            import clip
            import torch

            prompts = [p for _, _, p in self.CONDITION_PROMPTS]
            with torch.no_grad():
                tok = clip.tokenize(prompts).to(self.clip_gate.device)
                feats = self.clip_gate.model.encode_text(tok)
                self._text_features = feats / feats.norm(dim=-1, keepdim=True)
        except Exception as err:
            logger.warning("Failed to initialize HolisticConditionAnalyzer CLIP prompts: %s", err)
            self._text_features = None

    @property
    def available(self) -> bool:
        return (
            self.clip_gate is not None
            and getattr(self.clip_gate, "available", False)
            and self._text_features is not None
        )

    def analyze(self, image_source: Union[str, Image.Image]) -> Dict[str, Any]:
        """
        Evaluates total plant condition, indirect pest-damage signatures, and nutrient deficiencies.
        Always returns visual HSV signals even if CLIP is unavailable.
        """
        visual_with_boxes = extract_visual_foliage_signals(image_source, include_boxes=True)
        localized_boxes = visual_with_boxes.pop("_localized_boxes", {"damage_boxes": [], "stress_boxes": []})
        visual_signals = visual_with_boxes
        image_quality = assess_image_quality(image_source)
        if not self.available:
            return {
                "available": False,
                "visual_signals": visual_signals,
                "localized_boxes": localized_boxes,
                "image_quality": image_quality,
                "group_probs": {},
                "top_group": "unknown",
                "top_pest_damage": None,
                "top_nutrient_deficiency": None,
            }

        try:
            import torch

            if isinstance(image_source, Image.Image):
                im = image_source.convert("RGB")
                should_close = False
            else:
                im = Image.open(image_source).convert("RGB")
                should_close = True
            try:
                img_tensor = self.clip_gate.preprocess(im).unsqueeze(0).to(self.clip_gate.device)
            finally:
                if should_close:
                    im.close()

            with torch.no_grad():
                img_feat = self.clip_gate.model.encode_image(img_tensor)
                img_feat = img_feat / img_feat.norm(dim=-1, keepdim=True)
                sims = (img_feat @ self._text_features.T).squeeze(0).cpu().numpy()

            # Compute unbiased group probabilities from the MAX cosine similarity per group
            # (prevents groups with 5 sub-prompts from overpowering groups with 2 prompts)
            group_order = ("healthy", "pest_damage", "nutrient_deficiency", "infectious_disease")
            group_max_sims: Dict[str, float] = {g: -1.0 for g in group_order}
            damage_sims: List[Tuple[str, float]] = []
            deficiency_sims: List[Tuple[str, float]] = []

            for idx, (group, key, _) in enumerate(self.CONDITION_PROMPTS):
                s = float(sims[idx])
                if s > group_max_sims[group]:
                    group_max_sims[group] = s
                if group == "pest_damage":
                    damage_sims.append((key, s))
                elif group == "nutrient_deficiency":
                    deficiency_sims.append((key, s))

            # Softmax over the 4 balanced group max logits (temperature=100, standard CLIP scale)
            logits = np.array([100.0 * group_max_sims[g] for g in group_order], dtype=np.float64)
            logits -= logits.max()
            exp_l = np.exp(logits)
            g_probs_arr = exp_l / exp_l.sum()
            group_probs = {g: round(float(g_probs_arr[i]), 3) for i, g in enumerate(group_order)}

            # Sub-class probabilities within pest_damage & nutrient_deficiency
            def _top_subclass(pairs: List[Tuple[str, float]], parent_prob: float) -> Optional[Tuple[str, float]]:
                if not pairs:
                    return None
                arr = np.array([100.0 * s for _, s in pairs], dtype=np.float64)
                arr -= arr.max()
                p = np.exp(arr)
                p = p / p.sum()
                best_i = int(np.argmax(p))
                return (pairs[best_i][0], round(float(p[best_i]) * parent_prob, 3))

            top_group = max(group_probs.items(), key=lambda kv: kv[1])[0]

            return {
                "available": True,
                "visual_signals": visual_signals,
                "localized_boxes": localized_boxes,
                "image_quality": image_quality,
                "group_probs": group_probs,
                "top_group": top_group,
                "top_pest_damage": _top_subclass(damage_sims, group_probs["pest_damage"]),
                "top_nutrient_deficiency": _top_subclass(deficiency_sims, group_probs["nutrient_deficiency"]),
            }
        except Exception as err:
            logger.warning("HolisticConditionAnalyzer runtime error: %s", err)
            return {
                "available": False,
                "visual_signals": visual_signals,
                "localized_boxes": localized_boxes,
                "image_quality": image_quality,
                "group_probs": {},
                "top_group": "unknown",
                "top_pest_damage": None,
                "top_nutrient_deficiency": None,
            }


def synthesize_total_condition(
    det_type: str,
    crop_name: Optional[str],
    primary_conf: float,
    pest_name: Optional[str],
    disease_name: Optional[str],
    condition_raw: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Pure, deterministic synthesizer that combines YOLOv8 detection results with
    `HolisticConditionAnalyzer` signals into a cohesive `condition_assessment` payload
    AND determines whether an otherwise healthy/missed leaf should be promoted to
    `pest_damage` or `nutrient_deficiency`.
    """
    visual = condition_raw.get("visual_signals", {})
    group_probs = condition_raw.get("group_probs", {})
    top_damage = condition_raw.get("top_pest_damage")
    top_deficiency = condition_raw.get("top_nutrient_deficiency")
    crop_label = crop_name if crop_name in TARGET_CROPS else "Leafy Green"

    green_pct = float(visual.get("green_foliage_pct", 0.0))
    yellow_pct = float(visual.get("yellow_chlorosis_pct", 0.0))
    brown_pct = float(visual.get("brown_necrosis_pct", 0.0))
    leaf_hole_count = int(visual.get("leaf_hole_count", 0))
    hole_area_pct = float(visual.get("hole_area_pct", 0.0))
    stress_color_pct = yellow_pct + brown_pct

    p_healthy = float(group_probs.get("healthy", 0.0))
    p_damage = float(group_probs.get("pest_damage", 0.0))
    p_deficiency = float(group_probs.get("nutrient_deficiency", 0.0))
    p_disease = float(group_probs.get("infectious_disease", 0.0))

    # Strong visual perforation signal: multi-scale enclosed dark cavities inside green foliage
    # calibrated against indoor & outdoor healthy lettuce/bok choy baselines (0-8 holes, <=0.43% area).
    # Catches BOTH many tiny shot-holes (e.g. 25+ holes) AND zoomed-in large caterpillar chew-holes
    # (e.g. 4+ large holes covering >=0.80% of the blade area).
    clip_agrees_unhealthy = (not group_probs) or (p_healthy < 0.35) or (primary_conf < 0.70)
    overwhelming_hole_evidence = (
        leaf_hole_count >= 4
        and hole_area_pct >= 0.80
        and green_pct >= 55.0
    )
    strong_hole_evidence = overwhelming_hole_evidence or (
        leaf_hole_count >= 12
        and hole_area_pct >= 0.50
        and green_pct >= 50.0
        and clip_agrees_unhealthy
    )

    # Build optional Pest-Damage detail if CLIP or visual hole-detection sees clear feeding damage
    pest_damage_obj: Optional[Dict[str, Any]] = None
    probable_pests: List[Dict[str, str]] = []
    if strong_hole_evidence:
        # Prefer CLIP's hole-compatible damage subclass if available, else infer chewing vs shot-hole from hole size
        avg_hole_px = (hole_area_pct / 100.0 * 320.0 * 320.0) / max(1, leaf_hole_count)
        if top_damage and top_damage[0] in ("chewing_damage", "shothole_damage"):
            dmg_key = top_damage[0]
        else:
            dmg_key = "shothole_damage" if avg_hole_px < 24.0 else "chewing_damage"
        meta = PEST_DAMAGE_CATALOG[dmg_key]
        hole_strength = min(1.0, (leaf_hole_count / 30.0) * 0.40 + (hole_area_pct / 1.5) * 0.60)
        scaled_conf = round(min(0.93, max(0.68, 0.62 + hole_strength * 0.28)), 2)
        probable_pests = get_probable_culprits(dmg_key, crop_label)
        pest_damage_obj = {
            "key": dmg_key,
            "damage_type": meta["damage_type"],
            "confidence": scaled_conf,
            "severity": "High" if leaf_hole_count >= 15 or hole_area_pct >= 0.90 else meta["severity"],
            "description": (
                f"{meta['description']} Visual scan detected {leaf_hole_count} distinct "
                f"perforations covering {hole_area_pct:.1f}% of the central leaf blade."
            ),
            "recommended_action": meta["recommended_action"],
        }
    elif top_damage and (p_damage >= 0.38 or (top_damage[1] >= 0.30 and p_damage > p_healthy)):
        dmg_key, dmg_prob = top_damage
        meta = PEST_DAMAGE_CATALOG[dmg_key]
        scaled_conf = round(min(0.92, max(0.55, 0.45 + p_damage * 0.50)), 2)
        probable_pests = get_probable_culprits(dmg_key, crop_label)
        pest_damage_obj = {
            "key": dmg_key,
            "damage_type": meta["damage_type"],
            "confidence": scaled_conf,
            "severity": meta["severity"],
            "description": meta["description"],
            "recommended_action": meta["recommended_action"],
        }

    # Build optional Nutrient Deficiency detail if CLIP sees clear deficiency + visual yellowing/browning
    nutrient_def_obj: Optional[Dict[str, Any]] = None
    if top_deficiency and (
        p_deficiency >= 0.40
        and p_deficiency > p_healthy
        and (stress_color_pct >= 5.0 or p_deficiency >= 0.60)
    ):
        def_key, def_prob = top_deficiency
        meta = NUTRIENT_DEFICIENCY_CATALOG[def_key]
        scaled_conf = round(min(0.92, max(0.55, 0.45 + p_deficiency * 0.50)), 2)
        nutrient_def_obj = {
            "key": def_key,
            "name": meta["name"],
            "nutrient": meta["nutrient"],
            "confidence": scaled_conf,
            "severity": meta["severity"],
            "symptoms": meta["symptoms"],
            "causes": meta["causes"],
            "recommended_action": meta["recommended_action"],
        }

    # Decide if a weak 'healthy', 'none', or pure-green hole-confused 'disease' YOLO result
    # should be promoted to 'pest_damage' or 'nutrient_deficiency'.
    promoted_type = det_type
    # Pure bright-green leaf (zero yellowing/browning rot) riddled with sharp chew holes
    # is physically insect feeding damage, not fungal/bacterial foliar disease.
    pure_green_perforated_override = (
        det_type == "disease"
        and overwhelming_hole_evidence
        and pest_damage_obj is not None
        and green_pct >= 80.0
        and stress_color_pct < 3.0
        and primary_conf < 0.85
    )
    if pure_green_perforated_override:
        promoted_type = "pest_damage"
    elif det_type in ("healthy", "none"):
        # Strong visual perforation evidence (many enclosed insect holes + CLIP agrees leaf isn't healthy)
        # overrides YOLO 'healthy' because YOLO has no indirect chew-hole class.
        if strong_hole_evidence and pest_damage_obj:
            promoted_type = "pest_damage"
        elif det_type == "none" or primary_conf < 0.85:
            if pest_damage_obj and p_damage >= 0.45 and p_damage >= p_deficiency and p_damage >= p_disease:
                promoted_type = "pest_damage"
            elif (
                nutrient_def_obj
                and p_deficiency >= 0.48
                and p_deficiency > p_damage
                and p_deficiency >= p_disease
                and stress_color_pct >= 8.0
            ):
                promoted_type = "nutrient_deficiency"
        else:
            if pest_damage_obj and p_damage >= 0.72 and p_damage >= p_deficiency and p_damage >= p_disease:
                promoted_type = "pest_damage"
            elif (
                nutrient_def_obj
                and p_deficiency >= 0.75
                and p_deficiency > p_damage
                and p_deficiency >= p_disease
                and stress_color_pct >= 18.0
            ):
                promoted_type = "nutrient_deficiency"

    # Compose overall holistic condition summary & health score (0-100)
    if promoted_type == "pest_and_disease":
        overall_condition = "Pest & Disease Infestation"
        cause_category = "combined"
        health_score = max(15, round(45 - primary_conf * 20 - min(20, stress_color_pct * 0.4)))
        symptom_signature = f"Active {pest_name} + {disease_name}"
        condition_summary = (
            f"{crop_label} shows both active insect infestation ({pest_name}) and foliar disease "
            f"({disease_name}). Immediate combined IPM and IDM intervention is advised."
        )
    elif promoted_type == "pest":
        overall_condition = "Active Pest Infestation"
        cause_category = "direct_pest"
        health_score = max(25, round(68 - primary_conf * 25 - min(15, stress_color_pct * 0.3)))
        symptom_signature = pest_damage_obj["damage_type"] if pest_damage_obj else f"Direct insect sighting ({pest_name})"
        condition_summary = (
            f"Active {pest_name} detected directly on {crop_label}. "
            + (
                f"Foliage also exhibits {pest_damage_obj['damage_type'].lower()}."
                if pest_damage_obj
                else "No foliar infectious plant disease detected."
            )
        )
    elif promoted_type == "pest_damage" and pest_damage_obj:
        overall_condition = "Pest-Damaged Foliage"
        cause_category = "pest_damage"
        health_score = max(30, round(72 - pest_damage_obj["confidence"] * 28))
        symptom_signature = pest_damage_obj["damage_type"]
        top_culprits = ", ".join(c["name"] for c in probable_pests[:2]) if probable_pests else "leafy-green chewing/sucking pests"
        condition_summary = (
            f"{crop_label} shows {pest_damage_obj['damage_type'].lower()} even though no insect is "
            f"directly visible in the frame. Most likely culprit(s): {top_culprits}."
        )
    elif promoted_type == "nutrient_deficiency" and nutrient_def_obj:
        overall_condition = "Nutrient Deficiency / Abiotic Stress"
        cause_category = "nutrient_deficiency"
        health_score = max(35, round(78 - nutrient_def_obj["confidence"] * 25 - min(15, stress_color_pct * 0.25)))
        symptom_signature = nutrient_def_obj["name"]
        condition_summary = (
            f"{crop_label} shows signs consistent with {nutrient_def_obj['name']} (non-infectious "
            f"nutritional/abiotic stress). No active insect pest or infectious pathogen was confirmed."
        )
    elif promoted_type == "disease":
        overall_condition = "Diseased Foliage"
        cause_category = "infectious_disease"
        health_score = max(20, round(62 - primary_conf * 25 - min(18, stress_color_pct * 0.35)))
        symptom_signature = f"Foliar pathogen symptoms ({disease_name})"
        extra_note = ""
        if nutrient_def_obj and p_deficiency >= 0.42:
            extra_note = f" Secondary abiotic/nutrient stress ({nutrient_def_obj['name']}) may also be contributing."
        elif pest_damage_obj and p_damage >= 0.45:
            extra_note = f" Secondary insect feeding scars ({pest_damage_obj['damage_type']}) were also noted."
        condition_summary = (
            f"{crop_label} exhibits foliar disease symptoms matching {disease_name} "
            f"with no active insect pest observed.{extra_note}"
        )
    else:
        overall_condition = "Healthy"
        cause_category = "healthy"
        health_score = min(99, max(82, round(96 - min(12, stress_color_pct * 0.4))))
        symptom_signature = "Vibrant intact foliage"
        condition_summary = (
            f"{crop_label} appears healthy with intact green foliage, no visible insect pests, "
            "no pest-feeding damage, and no signs of infectious disease or nutrient deficiency."
        )
        # Keep healthy assessments clean (don't show low-confidence alarms on a healthy leaf)
        pest_damage_obj = None
        nutrient_def_obj = None
        probable_pests = []

    return {
        "promoted_detection_type": promoted_type,
        "condition_assessment": {
            "overall_condition": overall_condition,
            "condition_summary": condition_summary,
            "health_score": int(health_score),
            "symptom_signature": symptom_signature,
            "cause_category": cause_category,
            "probable_pests": probable_pests,
            "pest_damage": pest_damage_obj,
            "nutrient_deficiency": nutrient_def_obj,
            "visual_signals": visual,
            "image_quality": condition_raw.get("image_quality"),
            "screened_targets": get_screened_targets(crop_name),
        },
    }
