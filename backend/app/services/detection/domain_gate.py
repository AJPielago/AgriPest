"""
Domain Verification Gate & Logical Detection Resolver for the 3 Target Leafy Greens:
  1. Lettuce (Lactuca sativa / Litsugas)
  2. Bok Choy (Brassica rapa subsp. chinensis / Petsay)
  3. Mustard Greens (Brassica juncea / Mustasa)

Enforces:
  - Image quality / non-blank sanity checks (rejects black, white, flat, or tiny frames)
  - Strict foliage HSV + anti-paper/document texture checks on crop & disease boxes
  - Local CLIP ViT-B-32 semantic domain gating (rejects non-agricultural objects AND
    non-target plants/fruits/flowers/trees/grains/houseplants)
  - Cross-class spatial conflict suppression (no conflicting labels on the same leaf)
  - Botanical host-crop compatibility filtering (Lettuce vs Brassica)
  - Clean 4-state outcome resolution: 'healthy', 'pest', 'disease', 'pest_and_disease'
    (never forces 1 pest + 1 disease per scan)
"""

import logging
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, FrozenSet, List, Optional, Sequence, Tuple, Union

import numpy as np
from PIL import Image

logger = logging.getLogger("agripest.domain_gate")

# Confidence thresholds
MIN_CONF_PEST = 0.52
MIN_CONF_DISEASE = 0.58
MIN_CONF_HEALTHY = 0.55
MIN_CONF_LIVE_CHECK = 0.58

# Joint dual-detection thresholds (stricter so noise never forces 1 pest + 1 disease)
MIN_JOINT_CONF_PEST = 0.56
MIN_JOINT_CONF_DISEASE = 0.62

TARGET_CROPS: FrozenSet[str] = frozenset({"Lettuce", "Bok Choy", "Mustard Greens"})
BRASSICA_CROPS: FrozenSet[str] = frozenset({"Bok Choy", "Mustard Greens"})

# COCO classes that clearly indicate a non-agricultural everyday object (never a leafy green).
# Produce/plant lookalikes (e.g. orange, apple, banana, carrot, potted plant) are verified by
# CLIP ViT-B-32 instead so yolov8n does not falsely reject round lettuce heads or leafy rosettes.
NON_CROP_COCO_CLASSES: FrozenSet[str] = frozenset({
    "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat",
    "traffic light", "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat",
    "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe", "backpack",
    "umbrella", "handbag", "tie", "suitcase", "frisbee", "skis", "snowboard", "sports ball",
    "kite", "baseball bat", "baseball glove", "skateboard", "surfboard", "tennis racket",
    "bottle", "wine glass", "cup", "fork", "knife", "spoon", "sandwich", "hot dog", "pizza",
    "donut", "cake", "chair", "couch", "bed", "dining table", "toilet", "tv", "laptop",
    "mouse", "remote", "keyboard", "cell phone", "microwave", "oven", "toaster", "sink",
    "refrigerator", "book", "clock", "vase", "scissors", "teddy bear", "hair drier", "toothbrush",
})

# Maps trained YOLO class names -> (kind, display_name, valid_crops, fallback_meta)
CLASS_REGISTRY: Dict[str, Tuple[str, str, FrozenSet[str], Dict[str, str]]] = {
    # 01. Healthy Crops (3 target leafy greens only)
    "lettuce_healthy": (
        "healthy",
        "Lettuce",
        frozenset({"Lettuce"}),
        {
            "scientific_name": "Lactuca sativa",
            "action": "Crop appears healthy. Maintain regular drip irrigation and weekly scouting.",
        },
    ),
    "bok_choy_healthy": (
        "healthy",
        "Bok Choy",
        frozenset({"Bok Choy"}),
        {
            "scientific_name": "Brassica rapa subsp. chinensis",
            "action": "Crop appears healthy. Maintain insect netting and balanced organic nutrition.",
        },
    ),
    "mustard_greens_healthy": (
        "healthy",
        "Mustard Greens",
        frozenset({"Mustard Greens"}),
        {
            "scientific_name": "Brassica juncea",
            "action": "Crop appears healthy. Continue preventive field sanitation and monitoring.",
        },
    ),
    # 02. Crop Diseases (biologically bound to valid host crops)
    "brassica_alternaria_leaf_spot": (
        "disease",
        "Alternaria Leaf Spot of Brassicas",
        BRASSICA_CROPS,
        {
            "scientific_name": "Alternaria brassicae",
            "pathogen_type": "Fungal",
            "action": "Remove infected outer leaves and spray protectant Mancozeb 80% WP at 7-day intervals.",
        },
    ),
    "brassica_black_rot": (
        "disease",
        "Black Rot of Brassicas",
        BRASSICA_CROPS,
        {
            "scientific_name": "Xanthomonas campestris pv. campestris",
            "pathogen_type": "Bacterial",
            "action": "Practice 3-year non-brassica rotation and apply preventative copper hydroxide sprays.",
        },
    ),
    "brassica_downy_mildew": (
        "disease",
        "Downy Mildew of Brassicas",
        BRASSICA_CROPS,
        {
            "scientific_name": "Peronospora parasitica",
            "pathogen_type": "Fungal",
            "action": "Improve airflow and apply targeted Metalaxyl-M or Mancozeb oomycete fungicide.",
        },
    ),
    "crucifer_white_rust": (
        "disease",
        "White Rust of Crucifers",
        BRASSICA_CROPS,
        {
            "scientific_name": "Albugo candida",
            "pathogen_type": "Fungal",
            "action": "Remove wild crucifer weeds nearby and apply Metalaxyl-M + Mancozeb early.",
        },
    ),
    "lettuce_bacterial_soft_rot": (
        "disease",
        "Bacterial Soft Rot",
        TARGET_CROPS,
        {
            "scientific_name": "Pectobacterium carotovorum subsp. carotovorum",
            "pathogen_type": "Bacterial",
            "action": "Remove rotten heads immediately, improve drainage, and sanitize harvesting knives in 10% bleach.",
        },
    ),
    "lettuce_bottom_rot_drop": (
        "disease",
        "Bottom Rot & Drop of Lettuce",
        frozenset({"Lettuce"}),
        {
            "scientific_name": "Rhizoctonia solani / Sclerotinia sclerotiorum",
            "pathogen_type": "Fungal",
            "action": "Use raised beds with plastic mulch and apply targeted crown fungicide drench.",
        },
    ),
    "lettuce_downy_mildew": (
        "disease",
        "Downy Mildew of Lettuce",
        frozenset({"Lettuce"}),
        {
            "scientific_name": "Bremia lactucae",
            "pathogen_type": "Fungal",
            "action": "Ensure 30cm plant spacing, drip-irrigate early morning, and spray potassium phosphite.",
        },
    ),
    "lettuce_powdery_mildew": (
        "disease",
        "Powdery Mildew of Lettuce",
        frozenset({"Lettuce"}),
        {
            "scientific_name": "Golovinomyces cichoracearum",
            "pathogen_type": "Fungal",
            "action": "Apply wettable sulfur or potassium bicarbonate spray and avoid excess nitrogen.",
        },
    ),
    "lettuce_septoria_blight": (
        "disease",
        "Septoria Leaf Spot of Lettuce",
        frozenset({"Lettuce"}),
        {
            "scientific_name": "Septoria lactucae",
            "pathogen_type": "Fungal",
            "action": "Remove infected debris, avoid overhead irrigation, and apply protectant copper/mancozeb.",
        },
    ),
    "lettuce_viral": (
        "disease",
        "Lettuce Mosaic / Viral Infection",
        frozenset({"Lettuce"}),
        {
            "scientific_name": "Lettuce mosaic virus (LMV)",
            "pathogen_type": "Viral",
            "action": "Rogue infected plants immediately and control aphid vectors with neem oil or insecticidal soap.",
        },
    ),
    # 03. Philippine Pests (host-range aware)
    "diamondback_moth": (
        "pest",
        "Diamondback Moth",
        BRASSICA_CROPS,
        {
            "scientific_name": "Plutella xylostella",
            "action": "Deploy pheromone traps and spray Bacillus thuringiensis (Bt kurstaki) at dusk.",
        },
    ),
    "green_peach_aphid": (
        "pest",
        "Green Peach Aphid",
        TARGET_CROPS,
        {
            "scientific_name": "Myzus persicae",
            "action": "Spray 1% insecticidal soap or cold-pressed neem oil (5ml/L) on leaf undersides.",
        },
    ),
    "striped_flea_beetle": (
        "pest",
        "Striped Flea Beetle",
        BRASSICA_CROPS,
        {
            "scientific_name": "Phyllotreta striolata",
            "action": "Install 32-mesh insect barrier netting and yellow sticky traps near soil level.",
        },
    ),
    "cabbage_looper": (
        "pest",
        "Cabbage Looper",
        TARGET_CROPS,
        {
            "scientific_name": "Trichoplusia ni",
            "action": "Apply Bacillus thuringiensis (Bt kurstaki) thoroughly to both leaf surfaces at twilight.",
        },
    ),
    "serpentine_leafminer": (
        "pest",
        "Serpentine Leafminer",
        TARGET_CROPS,
        {
            "scientific_name": "Liriomyza trifolii",
            "action": "Prune mined leaves early and deploy bright yellow sticky traps at canopy height.",
        },
    ),
    "common_cutworm": (
        "pest",
        "Common Cutworm",
        TARGET_CROPS,
        {
            "scientific_name": "Spodoptera litura",
            "action": "Use seedling collar barriers, till soil before planting, and apply Bt-laced rice bran bait.",
        },
    ),
    "cabbage_cluster_caterpillar": (
        "pest",
        "Cabbage Cluster Caterpillar",
        BRASSICA_CROPS,
        {
            "scientific_name": "Crocidolomia pavonana",
            "action": "Hand-pick egg masses/young clusters and spray Bt kurstaki or neem extract.",
        },
    ),
    "cabbage_webworm": (
        "pest",
        "Cabbage Webworm",
        BRASSICA_CROPS,
        {
            "scientific_name": "Hellula undalis",
            "action": "Use fine insect netting on seedlings and apply targeted Bt spray into growing tips.",
        },
    ),
    "beet_armyworm": (
        "pest",
        "Beet Armyworm",
        TARGET_CROPS,
        {
            "scientific_name": "Spodoptera exigua",
            "action": "Monitor with pheromone traps and spray Bt aizawai/kurstaki during early larval instars.",
        },
    ),
    "silverleaf_whitefly": (
        "pest",
        "Silverleaf Whitefly",
        TARGET_CROPS,
        {
            "scientific_name": "Bemisia tabaci",
            "action": "Place yellow sticky cards and spray neem oil or horticultural soap under leaves.",
        },
    ),
    "turnip_mustard_aphid": (
        "pest",
        "Turnip / Mustard Aphid",
        BRASSICA_CROPS,
        {
            "scientific_name": "Lipaphis erysimi",
            "action": "Wash colonies with potassium soap or neem oil and conserve ladybird beetle predators.",
        },
    ),
    "onion_leaf_thrips": (
        "pest",
        "Onion / Leaf Thrips",
        TARGET_CROPS,
        {
            "scientific_name": "Thrips tabaci / palmi",
            "action": "Install blue/yellow sticky traps, use reflective mulch, and apply spinosad or neem oil.",
        },
    ),
}


def _open_rgb_image(image_source: Union[str, Image.Image]) -> Tuple[Image.Image, bool]:
    if isinstance(image_source, Image.Image):
        return image_source.convert("RGB"), False
    return Image.open(image_source).convert("RGB"), True


def assess_image_quality(image_source: Union[str, Image.Image]) -> Dict[str, Any]:
    """
    Pure Pillow + NumPy photo quality metrics (sharpness via discrete 3x3 Laplacian variance,
    brightness, and over/under-exposure ratios) used both for hard rejection of unusable frames
    and soft farmer coaching tips on borderline lighting/focus.
    """
    try:
        im, should_close = _open_rgb_image(image_source)
        try:
            w, h = im.size
            small_rgb = np.asarray(im.resize((96, 96), Image.Resampling.BILINEAR), dtype=np.float32)
            spatial_std = float(small_rgb.std(axis=(0, 1)).mean())
            mean_brightness = float(small_rgb.mean())
            dark_ratio = float((small_rgb.mean(axis=2) < 25.0).mean())
            blown_white_ratio = float((small_rgb.mean(axis=2) > 245.0).mean())

            gray = np.asarray(im.convert("L").resize((256, 256), Image.Resampling.BILINEAR), dtype=np.float32)
            lap = (
                -4.0 * gray[1:-1, 1:-1]
                + gray[:-2, 1:-1]
                + gray[2:, 1:-1]
                + gray[1:-1, :-2]
                + gray[1:-1, 2:]
            )
            sharpness = float(lap.var())

            hint: Optional[str] = None
            grade = "Good"
            if sharpness < 18.0:
                grade = "Fair"
                hint = "Slightly soft focus — hold steady 15–25 cm from the leaf for sharper pest detail."
            elif mean_brightness < 55.0:
                grade = "Fair"
                hint = "Lighting is dim — natural indirect daylight improves leaf color and lesion accuracy."
            elif blown_white_ratio > 0.35:
                grade = "Fair"
                hint = "Strong glare detected — shade the leaf slightly to reduce washed-out highlights."

            return {
                "width": w,
                "height": h,
                "spatial_std": round(spatial_std, 2),
                "brightness": round(mean_brightness, 1),
                "dark_ratio": round(dark_ratio, 3),
                "blown_white_ratio": round(blown_white_ratio, 3),
                "sharpness": round(sharpness, 1),
                "quality_grade": grade,
                "quality_hint": hint,
            }
        finally:
            if should_close:
                im.close()
    except Exception:
        return {
            "width": 0,
            "height": 0,
            "spatial_std": 0.0,
            "brightness": 0.0,
            "dark_ratio": 1.0,
            "blown_white_ratio": 0.0,
            "sharpness": 0.0,
            "quality_grade": "Poor",
            "quality_hint": "Image could not be decoded.",
        }


def check_image_sanity(image_source: Union[str, Image.Image]) -> Optional[str]:
    """
    Fast deterministic photo quality gate that rejects unusable images before inference:
      - Tiny images (< 32x32)
      - Blank / solid-color / pitch-black / overexposed frames
      - Severely out-of-focus or motion-blurred photos (Laplacian variance < 3.5)
    Returns an actionable error message if invalid, else None.
    """
    try:
        q = assess_image_quality(image_source)
        if q["width"] == 0 or q["height"] == 0:
            return "Uploaded image file could not be decoded for analysis."
        if q["width"] < 32 or q["height"] < 32:
            return (
                "Image resolution is too small for reliable diagnosis. "
                "Please capture a clear close-up photo of Lettuce, Bok Choy, or Mustard Greens."
            )
        if q["spatial_std"] < 8.0:
            return (
                "Image appears blank, uniform, or lacks visible plant detail. "
                "Please capture a clear, well-lit photo of Lettuce, Bok Choy, or Mustard Greens."
            )
        if q["brightness"] < 16.0 or q["dark_ratio"] > 0.88:
            return (
                "Image is too dark to inspect. Move to brighter natural lighting and try again."
            )
        if (q["brightness"] > 244.0 and q["spatial_std"] < 20.0) or q["blown_white_ratio"] > 0.82:
            return (
                "Image is overexposed or mostly white. Reduce direct glare and refocus on the crop leaf."
            )
        # Hard blur rejection calibrated so real soft-focus phone photos (>= 8.0) pass while
        # severely blurred/unreadable frames (< 3.5) get immediate coaching.
        if q["sharpness"] < 3.5 and q["width"] >= 96 and q["height"] >= 96:
            return (
                "Image is too blurry or out of focus for reliable pest and disease diagnosis. "
                "Hold steady 15–25 cm from the leaf, tap to focus, and try again."
            )
        return None
    except Exception:
        return "Uploaded image file could not be decoded for analysis."


def has_organic_foliage_colors(
    image_source: Union[str, Image.Image],
    box: Dict[str, Any],
    min_foliage_ratio: float = 0.08,
) -> bool:
    """
    HSV + paper/screenshot rejection sanity check on a crop or foliar-disease box.
    Rejects:
      - Blank walls, dark screens, blue UI panels
      - Mostly white/gray paper documents & herbarium cards (high bright-low-sat ratio)
      - Boxes lacking organic green/yellow-green/chlorotic plant hues
    """
    try:
        im, should_close = _open_rgb_image(image_source)
        try:
            w, h = im.size
            x1 = max(0, int(box["x_min"] * w))
            y1 = max(0, int(box["y_min"] * h))
            x2 = min(w, int(box["x_max"] * w))
            y2 = min(h, int(box["y_max"] * h))
            if x2 - x1 < 8 or y2 - y1 < 8:
                return False

            crop = im.crop((x1, y1, x2, y2)).resize((64, 64), Image.Resampling.BILINEAR)
            rgb_arr = np.asarray(crop, dtype=np.float32)
            if float(rgb_arr.std(axis=(0, 1)).mean()) < 5.0:
                return False

            hsv_arr = np.asarray(crop.convert("HSV"), dtype=np.uint8)
            hue = hsv_arr[:, :, 0]
            sat = hsv_arr[:, :, 1]
            val = hsv_arr[:, :, 2]

            # PIL HSV: H in [0..255] (~10..128 spans necrotic brown/tan/yellow through olive & green)
            foliage_mask = (hue >= 10) & (hue <= 128) & (sat >= 28) & (val >= 28)
            foliage_ratio = float(foliage_mask.mean())

            # Paper / UI card signature: very bright & very desaturated pixels
            paper_mask = (sat <= 22) & (val >= 200)
            paper_ratio = float(paper_mask.mean())
            if paper_ratio >= 0.72 and foliage_ratio < 0.15:
                return False

            return foliage_ratio >= min_foliage_ratio
        finally:
            if should_close:
                im.close()
    except Exception:
        return True


def compute_iou(box_a: Dict[str, Any], box_b: Dict[str, Any]) -> float:
    ax1, ay1, ax2, ay2 = box_a["x_min"], box_a["y_min"], box_a["x_max"], box_a["y_max"]
    bx1, by1, bx2, by2 = box_b["x_min"], box_b["y_min"], box_b["x_max"], box_b["y_max"]

    ix1 = max(ax1, bx1)
    iy1 = max(ay1, by1)
    ix2 = min(ax2, bx2)
    iy2 = min(ay2, by2)
    iw = max(0.0, ix2 - ix1)
    ih = max(0.0, iy2 - iy1)
    inter = iw * ih
    if inter <= 0.0:
        return 0.0

    area_a = max(0.0, (ax2 - ax1) * (ay2 - ay1))
    area_b = max(0.0, (bx2 - bx1) * (by2 - by1))
    union = area_a + area_b - inter
    return inter / union if union > 0.0 else 0.0


def box_area(box: Dict[str, Any]) -> float:
    return max(0.0, (box["x_max"] - box["x_min"]) * (box["y_max"] - box["y_min"]))


@dataclass(frozen=True)
class DomainGateResult:
    allowed: bool
    reason: Optional[str] = None
    category: str = "unknown"  # 'leafy_crop' | 'pest' | 'non_target_plant' | 'non_agri' | 'unavailable'
    pos_prob: float = 0.0
    neg_nonagri_prob: float = 0.0
    leafy_vs_other_plant_prob: float = 0.0
    best_prompt: str = ""
    inferred_crop: Optional[str] = None


class CLIPDomainGate:
    """
    Local zero-shot semantic domain verifier powered by CLIP ViT-B-32 (`weights/clip/ViT-B-32.pt`).
    Prevents closed-set YOLO hallucinations on:
      1. Non-agricultural everyday objects, people, screens, screenshots, paper cards, food, vehicles, pets
      2. Non-target plants (tomatoes, fruits, flowers, houseplants, cacti, trees, rice, corn, root crops)
    """

    POS_CROP_PROMPTS: Tuple[str, ...] = (
        "a photo of green lettuce leaves or lettuce leafy vegetable plant",
        "a photo of bok choy or pechay chinese cabbage leafy green vegetable",
        "a photo of mustard greens or leafy brassica vegetable plant",
        "a close-up photo of a diseased lettuce leaf with yellow spots, brown rot, or mildew",
        "a close-up photo of a diseased bok choy or mustard green leaf with spots, yellowing, or white rust",
        "a close-up photo of a green vegetable leaf with leafminer trails or chewed holes",
    )

    POS_PEST_PROMPTS: Tuple[str, ...] = (
        "a close-up photo of a caterpillar, armyworm, looper, or cutworm larva on a plant or soil",
        "a close-up photo of a moth or diamondback moth insect pest",
        "a close-up photo of small aphids, whiteflies, or thrips insects on a plant leaf",
        "a close-up photo of a small flea beetle insect on a plant leaf",
    )

    NEG_OTHER_PLANT_PROMPTS: Tuple[str, ...] = (
        "a photo of a red tomato, chili pepper, eggplant, cucumber, or fruiting vegetable",
        "a photo of apples, bananas, oranges, mangoes, grapes, strawberries, or fruit",
        "a photo of colorful flowers, roses, orchids, sunflowers, or blooming petals",
        "a photo of a cactus, succulent, fern, monstera, or potted indoor ornamental houseplant",
        "a photo of a tree trunk, tree branches, pine tree, palm tree, or forest",
        "a photo of a rice paddy, corn cob, maize plant, wheat field, or grass lawn",
        "a photo of carrots, potatoes, onions, garlic, or root vegetables",
    )

    NEG_NON_AGRI_PROMPTS: Tuple[str, ...] = (
        "a photo of a human person, face, selfie, hand, fingers, or skin",
        "a photo of a smartphone, laptop, computer monitor, keyboard, or mouse",
        "a screenshot of a website, mobile app user interface, dashboard, or chart",
        "a photo of a printed paper document, index card, book page, or museum text label",
        "a photo of an indoor room, wall, ceiling, floor, chair, bed, or wooden desk",
        "a photo of cooked food on a plate, a bottle, cup, mug, or kitchen utensil",
        "a photo of a car, motorcycle, building, road, street, or city",
        "a photo of a dog, cat, bird, fish, or household pet animal",
        "a photo of clothing, shoes, bag, pen, toy, or plastic object",
        "a blank solid color image, pitch black screen, or random noise texture",
    )

    # Dedicated Tier-2 Leafy-Green Specificity Prompts (3 target leafy greens vs non-target plants)
    LEAFY_SPECIFIC_PROMPTS: Tuple[Tuple[str, str], ...] = (
        ("Lettuce", "a photo of lettuce plant leaves, romaine, butterhead, or green salad lettuce foliage"),
        ("Lettuce", "a close-up photo of a diseased, spotted, wilted, or mildew-infected lettuce leaf"),
        ("Bok Choy", "a photo of bok choy or pechay vegetable with white stems and smooth green leaves"),
        ("Bok Choy", "a close-up photo of a diseased bok choy pechay brassica leaf with yellow spots, downy mildew, or rot"),
        ("Mustard Greens", "a photo of mustard greens or mustasa leafy green vegetable foliage"),
        ("Mustard Greens", "a close-up photo of a diseased mustard green crucifer leaf with white rust blisters, yellow mildew, or spots"),
    )

    NON_LEAFY_PLANT_SPECIFIC_PROMPTS: Tuple[str, ...] = (
        "a photo of a tomato plant, tomato leaf, chili pepper, or eggplant plant",
        "a photo of a rose, orchid, hibiscus, sunflower, or decorative flowering plant",
        "a photo of a mango tree, banana plant, coconut palm, or woody tree leaf",
        "a photo of rice plants, corn maize stalks, sugarcane, or green grass lawn",
        "a photo of an indoor potted houseplant, succulent, cactus, fern, or monstera leaf",
        "a photo of fruits like apple, banana, orange, mango, or strawberry",
        "a photo of root vegetables like carrot, potato, onion, or garlic",
    )

    # Fallback zero-shot prompts when CLIP strongly verifies a target leafy green (pos>=0.90, leafy>=0.85)
    # but YOLOv8 produces zero boxes (e.g., severe brown rot / unusual lighting / studio background)
    FALLBACK_CROP_CONDITION_PROMPTS: Dict[str, Tuple[Tuple[str, str], ...]] = {
        "Lettuce": (
            ("lettuce_healthy", "a photo of fresh, crisp, bright green healthy lettuce leaves with no brown rot or spots"),
            ("lettuce_bacterial_soft_rot", "a photo of rotting, slimy, brown, wilted, or decayed lettuce leaves with bacterial soft rot"),
            ("lettuce_downy_mildew", "a photo of a lettuce leaf with pale yellow angular patches and downy mildew"),
            ("lettuce_powdery_mildew", "a photo of a lettuce leaf covered with white powdery mildew coating"),
            ("lettuce_septoria_blight", "a photo of a lettuce leaf with small circular brown necrotic leaf spots and blight"),
            ("lettuce_bottom_rot_drop", "a photo of a lettuce plant base with dark brown bottom rot and collapsed leaves"),
            ("lettuce_viral", "a photo of a mottled yellow-green distorted lettuce leaf with mosaic virus symptoms"),
        ),
        "Bok Choy": (
            ("bok_choy_healthy", "a photo of fresh, crisp, healthy green bok choy pechay leaves with clean white stalks"),
            ("lettuce_bacterial_soft_rot", "a photo of rotting, brown, slimy, decayed bok choy stalks and wilted leaves"),
            ("brassica_black_rot", "a photo of a bok choy leaf with yellow V-shaped leaf margins and blackened veins"),
            ("brassica_downy_mildew", "a photo of a bok choy leaf with yellow chlorotic patches and fuzzy downy mildew"),
            ("brassica_alternaria_leaf_spot", "a photo of a bok choy leaf with circular brown target-like alternaria spots"),
            ("crucifer_white_rust", "a photo of a bok choy leaf with raised chalky white rust blisters"),
        ),
        "Mustard Greens": (
            ("mustard_greens_healthy", "a photo of fresh, crisp, healthy green mustard greens leaves with no spots or rot"),
            ("lettuce_bacterial_soft_rot", "a photo of rotting, brown, wilted, decayed mustard green leaves"),
            ("brassica_black_rot", "a photo of a mustard green leaf with yellow V-shaped leaf edges and dark veins"),
            ("brassica_downy_mildew", "a photo of a mustard green leaf with yellow angular patches and downy mildew"),
            ("brassica_alternaria_leaf_spot", "a photo of a mustard green leaf with circular brown target-like spots"),
            ("crucifer_white_rust", "a photo of a mustard green leaf with raised chalky white rust pustules"),
        ),
    }

    def __init__(self, weights_path: Optional[str] = None):
        project_root = Path(__file__).resolve().parent.parent.parent.parent.parent
        default_weights = project_root / "weights" / "clip" / "ViT-B-32.pt"
        self.weights_path = str(weights_path or default_weights)
        self.model = None
        self.preprocess = None
        self.device = "cpu"
        self.available = False
        self._t1_features = None
        self._t2_features = None
        self._fallback_features: Dict[str, Any] = {}
        self._load()

    def _load(self) -> None:
        if not os.path.exists(self.weights_path):
            logger.info("CLIP weights not found at %s; CLIP semantic domain gate disabled.", self.weights_path)
            return
        try:
            import clip
            import torch

            self.device = "cuda" if torch.cuda.is_available() else "cpu"
            self.model, self.preprocess = clip.load(self.weights_path, device=self.device, jit=False)
            self.model.eval()

            all_t1 = (
                list(self.POS_CROP_PROMPTS)
                + list(self.POS_PEST_PROMPTS)
                + list(self.NEG_OTHER_PLANT_PROMPTS)
                + list(self.NEG_NON_AGRI_PROMPTS)
            )
            all_t2 = [p for _, p in self.LEAFY_SPECIFIC_PROMPTS] + list(self.NON_LEAFY_PLANT_SPECIFIC_PROMPTS)

            with torch.no_grad():
                t1_tok = clip.tokenize(all_t1).to(self.device)
                t1_f = self.model.encode_text(t1_tok)
                self._t1_features = t1_f / t1_f.norm(dim=-1, keepdim=True)

                t2_tok = clip.tokenize(all_t2).to(self.device)
                t2_f = self.model.encode_text(t2_tok)
                self._t2_features = t2_f / t2_f.norm(dim=-1, keepdim=True)

                for crop_key, pairs in self.FALLBACK_CROP_CONDITION_PROMPTS.items():
                    fb_tok = clip.tokenize([prompt for _, prompt in pairs]).to(self.device)
                    fb_f = self.model.encode_text(fb_tok)
                    self._fallback_features[crop_key] = fb_f / fb_f.norm(dim=-1, keepdim=True)

            self.available = True
            logger.info("Loaded CLIP ViT-B-32 domain gate on %s.", self.device)
        except Exception as err:
            logger.warning("CLIP domain gate unavailable (%s); continuing with COCO + heuristic gates.", err)
            self.available = False

    def evaluate(
        self,
        image_source: Union[str, Image.Image],
        require_leafy_crop: bool = False,
    ) -> DomainGateResult:
        """
        Evaluates whether `image_source` belongs to the target domain:
          - Lettuce, Bok Choy (Petsay), Mustard Greens (Mustasa), or their foliar diseases / insect pests.
        When `require_leafy_crop=True` (used for healthy/disease-only YOLO outputs), also enforces
        Tier-2 specificity against non-target plants (tomato, flowers, trees, rice, corn, houseplants).
        """
        if not self.available or self.model is None or self.preprocess is None:
            return DomainGateResult(allowed=True, category="unavailable", pos_prob=1.0)

        try:
            import torch

            im, should_close = _open_rgb_image(image_source)
            try:
                img_tensor = self.preprocess(im).unsqueeze(0).to(self.device)
            finally:
                if should_close:
                    im.close()

            with torch.no_grad():
                img_feat = self.model.encode_image(img_tensor)
                img_feat = img_feat / img_feat.norm(dim=-1, keepdim=True)

                t1_sims = (img_feat @ self._t1_features.T).squeeze(0)
                t1_probs = (100.0 * t1_sims).softmax(dim=-1).cpu().numpy()
                t1_sims_np = t1_sims.cpu().numpy()

                t2_sims = (img_feat @ self._t2_features.T).squeeze(0)
                t2_probs = (100.0 * t2_sims).softmax(dim=-1).cpu().numpy()

            n_pos_crop = len(self.POS_CROP_PROMPTS)
            n_pos_pest = len(self.POS_PEST_PROMPTS)
            n_pos = n_pos_crop + n_pos_pest
            n_neg_plant = len(self.NEG_OTHER_PLANT_PROMPTS)

            pos_crop_prob = float(t1_probs[:n_pos_crop].sum())
            pos_pest_prob = float(t1_probs[n_pos_crop:n_pos].sum())
            pos_prob = pos_crop_prob + pos_pest_prob
            neg_plant_prob = float(t1_probs[n_pos : n_pos + n_neg_plant].sum())
            neg_nonagri_prob = float(t1_probs[n_pos + n_neg_plant :].sum())

            max_pos_sim = float(t1_sims_np[:n_pos].max())
            max_neg_prob = float(t1_probs[n_pos:].max())
            best_idx = int(np.argmax(t1_sims_np))

            all_t1 = (
                list(self.POS_CROP_PROMPTS)
                + list(self.POS_PEST_PROMPTS)
                + list(self.NEG_OTHER_PLANT_PROMPTS)
                + list(self.NEG_NON_AGRI_PROMPTS)
            )
            best_prompt = all_t1[best_idx]

            # Tier 1 Rejection: Clearly non-agricultural object / screen / person / paper / blank
            if neg_nonagri_prob >= 0.38 or (best_idx >= n_pos + n_neg_plant and max_neg_prob >= 0.25):
                return DomainGateResult(
                    allowed=False,
                    reason=(
                        "Unrecognized non-crop image detected. This does not appear to be Lettuce (Litsugas), "
                        "Bok Choy (Petsay), Mustard Greens (Mustasa), or a crop pest. "
                        "Please capture a clear close-up of one of the 3 target leafy greens."
                    ),
                    category="non_agri",
                    pos_prob=round(pos_prob, 3),
                    neg_nonagri_prob=round(neg_nonagri_prob, 3),
                    best_prompt=best_prompt,
                )

            # Tier 1 Rejection: Clearly a non-target plant/fruit/flower/tree/grain/root crop
            if neg_plant_prob >= 0.42 or (
                n_pos <= best_idx < n_pos + n_neg_plant and neg_plant_prob >= 0.32
            ):
                return DomainGateResult(
                    allowed=False,
                    reason=(
                        "Non-target plant or produce detected. This system only supports Lettuce (Litsugas), "
                        "Bok Choy (Petsay), and Mustard Greens (Mustasa) along with their pests and diseases."
                    ),
                    category="non_target_plant",
                    pos_prob=round(pos_prob, 3),
                    neg_nonagri_prob=round(neg_nonagri_prob, 3),
                    best_prompt=best_prompt,
                )

            # Tier 1 Minimum Overall Relevance
            if pos_prob < 0.48 or max_pos_sim < 0.21:
                return DomainGateResult(
                    allowed=False,
                    reason=(
                        "Unrecognized specimen: Image does not clearly match Lettuce (Litsugas), "
                        "Bok Choy (Petsay), Mustard Greens (Mustasa), or their known pests/diseases."
                    ),
                    category="non_agri" if neg_nonagri_prob >= neg_plant_prob else "non_target_plant",
                    pos_prob=round(pos_prob, 3),
                    neg_nonagri_prob=round(neg_nonagri_prob, 3),
                    best_prompt=best_prompt,
                )

            # Tier 2: Leafy-Green Specificity (3 leafy greens vs other plants)
            n_leafy = len(self.LEAFY_SPECIFIC_PROMPTS)
            leafy_prob = float(t2_probs[:n_leafy].sum())
            crop_scores: Dict[str, float] = {}
            for idx, (crop_label, _) in enumerate(self.LEAFY_SPECIFIC_PROMPTS):
                crop_scores[crop_label] = crop_scores.get(crop_label, 0.0) + float(t2_probs[idx])
            inferred_crop = max(crop_scores.items(), key=lambda kv: kv[1])[0] if crop_scores else None

            if require_leafy_crop and leafy_prob < 0.45:
                return DomainGateResult(
                    allowed=False,
                    reason=(
                        "Plant specimen does not match the 3 supported leafy greens: Lettuce (Litsugas), "
                        "Bok Choy (Petsay), or Mustard Greens (Mustasa). Please scan only supported leafy greens."
                    ),
                    category="non_target_plant",
                    pos_prob=round(pos_prob, 3),
                    neg_nonagri_prob=round(neg_nonagri_prob, 3),
                    leafy_vs_other_plant_prob=round(leafy_prob, 3),
                    best_prompt=best_prompt,
                    inferred_crop=None,
                )

            category = "pest" if pos_pest_prob > pos_crop_prob else "leafy_crop"
            return DomainGateResult(
                allowed=True,
                category=category,
                pos_prob=round(pos_prob, 3),
                neg_nonagri_prob=round(neg_nonagri_prob, 3),
                leafy_vs_other_plant_prob=round(leafy_prob, 3),
                best_prompt=best_prompt,
                inferred_crop=inferred_crop if leafy_prob >= 0.45 else None,
            )
        except Exception as err:
            logger.warning("CLIP domain gate runtime error (%s); falling back to YOLO + COCO gates.", err)
            return DomainGateResult(allowed=True, category="unavailable", pos_prob=1.0)

    def classify_verified_leafy_green(
        self,
        image_source: Union[str, Image.Image],
        crop_name: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Zero-shot condition classifier invoked ONLY AFTER CLIP already verified with high certainty
        (pos_prob >= 0.90, leafy_prob >= 0.85, neg_nonagri < 0.05) that the image is one of the 3
        supported leafy greens, when YOLOv8 produced zero boxes (e.g., severe brown rot or unusual lighting).
        Returns a parsed detection dict compatible with `resolve_logical_detections`, or None.
        """
        if not self.available or crop_name not in self._fallback_features:
            return None
        try:
            import torch

            im, should_close = _open_rgb_image(image_source)
            try:
                img_tensor = self.preprocess(im).unsqueeze(0).to(self.device)
            finally:
                if should_close:
                    im.close()

            with torch.no_grad():
                img_feat = self.model.encode_image(img_tensor)
                img_feat = img_feat / img_feat.norm(dim=-1, keepdim=True)
                fb_feat = self._fallback_features[crop_name]
                sims = (img_feat @ fb_feat.T).squeeze(0)
                probs = (100.0 * sims).softmax(dim=-1).cpu().numpy()

            pairs = self.FALLBACK_CROP_CONDITION_PROMPTS[crop_name]
            best_idx = int(np.argmax(probs))
            raw_name = pairs[best_idx][0]
            prob = float(probs[best_idx])

            if prob < 0.35 or raw_name not in CLASS_REGISTRY:
                return None

            kind, display_name, valid_crops, meta = CLASS_REGISTRY[raw_name]
            # Scale honest confidence to [0.55..0.84] since it's a CLIP-assisted fallback
            conf = round(min(0.84, max(0.55, 0.50 + prob * 0.35)), 3)
            box_dict = {
                "x_min": 0.08,
                "y_min": 0.08,
                "x_max": 0.92,
                "y_max": 0.92,
                "label": f"{'Healthy Crop' if kind == 'healthy' else kind.capitalize()}: {display_name}",
                "type": kind,
                "confidence": round(conf, 2),
            }
            if not has_organic_foliage_colors(image_source, box_dict):
                return None

            return {
                "raw_name": raw_name,
                "kind": kind,
                "display_name": display_name,
                "valid_crops": valid_crops,
                "meta": meta,
                "confidence": conf,
                "box": box_dict,
            }
        except Exception as err:
            logger.warning("CLIP verified leafy-green fallback failed: %s", err)
            return None


def suppress_conflicting_detections(detections: Sequence[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Pure cross-class spatial conflict suppression (immutably returns a new list):
      1. Prevents duplicate/conflicting 'healthy' or 'disease' classifications on the same leaf
         region (IoU >= 0.45 -> keep highest confidence only).
      2. Prevents two different pest labels on the exact same insect box (IoU >= 0.55).
      3. Prevents a whole-image misclassification where a large pest box (area >= 0.30) overlaps
         heavily (IoU >= 0.65) with a crop/disease box — keeps only the higher-confidence label.
      4. Allows a small insect pest sitting ON a larger leaf/disease region to coexist cleanly.
    """
    ordered = sorted(detections, key=lambda d: d["confidence"], reverse=True)
    kept: List[Dict[str, Any]] = []

    for candidate in ordered:
        cand_kind = candidate["kind"]
        cand_box = candidate["box"]
        cand_area = box_area(cand_box)
        suppressed = False

        for existing in kept:
            ex_kind = existing["kind"]
            ex_box = existing["box"]
            iou = compute_iou(cand_box, ex_box)

            # Same leaf cannot simultaneously be healthy & diseased, or two diseases at once
            if cand_kind in ("healthy", "disease") and ex_kind in ("healthy", "disease"):
                if iou >= 0.45:
                    suppressed = True
                    break
            # Same insect box cannot be two different pest species simultaneously
            elif cand_kind == "pest" and ex_kind == "pest":
                if iou >= 0.55:
                    suppressed = True
                    break
            # Pest vs Leaf/Disease: suppress only if they cover essentially the same large region
            else:
                if iou >= 0.65 and max(cand_area, box_area(ex_box)) >= 0.30:
                    suppressed = True
                    break

        if not suppressed:
            kept.append(dict(candidate))

    return kept


def resolve_logical_detections(
    detections: Sequence[Dict[str, Any]],
    selected_crop_name: Optional[str] = None,
    clip_inferred_crop: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Pure logical post-processor that enforces:
      1. Cross-class spatial NMS (no contradictory labels on identical boxes)
      2. Host-crop biological compatibility (Lettuce vs Bok Choy vs Mustard Greens)
      3. Healthy vs Diseased consistency
      4. Strict 4-state outcome: 'healthy' | 'pest' | 'disease' | 'pest_and_disease'
         (never forces both a pest and a disease on every scan)

    Returns a dictionary:
      - rejected: bool
      - rejection_reason: Optional[str]
      - detection_type: 'healthy' | 'pest' | 'disease' | 'pest_and_disease' | 'rejected'
      - resolved_crop_name: Optional[str]
      - pest_hits: List[Dict]
      - disease_hits: List[Dict]
      - healthy_hits: List[Dict]
      - final_boxes: List[Dict]
    """
    cleaned = suppress_conflicting_detections(detections)
    if not cleaned:
        return {
            "rejected": True,
            "rejection_reason": (
                "Unrecognized specimen: No Lettuce, Bok Choy, Mustard Greens, or known pest/disease "
                "was detected above confidence threshold."
            ),
            "detection_type": "rejected",
        }

    # Normalize selected crop name if valid
    normalized_selected = selected_crop_name if selected_crop_name in TARGET_CROPS else None

    # Step 1: Enforce Host-Crop Compatibility
    if normalized_selected:
        compatible = [d for d in cleaned if normalized_selected in d.get("valid_crops", TARGET_CROPS)]
        if not compatible:
            # Identify what other supported crop was actually seen to give a helpful message
            top = cleaned[0]
            other_crops = sorted(top.get("valid_crops", set()))
            other_label = " / ".join(other_crops) if other_crops else top["display_name"]
            return {
                "rejected": True,
                "rejection_reason": (
                    f"Host crop mismatch: You selected {normalized_selected}, but this image matches "
                    f"{other_label} ({top['display_name']}). Please select the matching crop or leave Host Crop on Auto-Detect."
                ),
                "detection_type": "rejected",
            }
        filtered = compatible
        resolved_crop_name = normalized_selected
    else:
        # Auto-detect crop family from the highest-confidence crop-specific detection overall
        resolved_crop_name = None
        allowed_family: FrozenSet[str] = TARGET_CROPS

        specific = [
            d for d in cleaned
            if len(d.get("valid_crops", TARGET_CROPS)) < len(TARGET_CROPS)
        ]
        if specific:
            specific.sort(key=lambda d: d["confidence"], reverse=True)
            vc = specific[0]["valid_crops"]
            allowed_family = vc
            if len(vc) == 1:
                resolved_crop_name = next(iter(vc))
            elif clip_inferred_crop in vc:
                resolved_crop_name = clip_inferred_crop
            else:
                resolved_crop_name = "Bok Choy" if "Bok Choy" in vc else sorted(vc)[0]

        if resolved_crop_name is None and clip_inferred_crop in TARGET_CROPS:
            resolved_crop_name = clip_inferred_crop

        # Filter out detections incompatible with the inferred crop family
        filtered = [
            d for d in cleaned
            if bool(d.get("valid_crops", TARGET_CROPS) & allowed_family)
        ]
        if not filtered:
            filtered = list(cleaned)

    pest_hits = [d for d in filtered if d["kind"] == "pest"]
    disease_hits = [d for d in filtered if d["kind"] == "disease"]
    healthy_hits = [d for d in filtered if d["kind"] == "healthy"]

    # Step 2: Resolve Healthy vs Disease contradiction
    # If healthy is strongly dominant over a marginal disease, treat as healthy (drop noisy disease)
    if healthy_hits and disease_hits:
        top_h_conf = healthy_hits[0]["confidence"]
        top_d_conf = disease_hits[0]["confidence"]
        if top_h_conf >= top_d_conf + 0.15 and top_d_conf < 0.70:
            disease_hits = []
        else:
            # Confirmed disease on the specimen — drop healthy boxes so UI doesn't claim both Healthy & Diseased
            healthy_hits = []

    # Step 3: Strict Joint Pest + Disease validation (every scan does NOT need 1 pest and 1 disease!)
    if pest_hits and disease_hits:
        top_p = pest_hits[0]
        top_d = disease_hits[0]

        # If one finding is weak/borderline while the other is confident, report ONLY the confident one
        p_strong = top_p["confidence"] >= MIN_JOINT_CONF_PEST
        d_strong = top_d["confidence"] >= MIN_JOINT_CONF_DISEASE

        if not (p_strong and d_strong):
            if top_p["confidence"] >= top_d["confidence"]:
                disease_hits = []
            else:
                pest_hits = []
        elif (top_p["confidence"] - top_d["confidence"]) >= 0.25 and top_d["confidence"] < 0.68:
            disease_hits = []
        elif (top_d["confidence"] - top_p["confidence"]) >= 0.25 and top_p["confidence"] < 0.65:
            pest_hits = []

    # Step 4: Determine clean 4-state outcome & final bounding boxes
    if pest_hits and disease_hits:
        detection_type = "pest_and_disease"
        final_dets = pest_hits[:4] + disease_hits[:4]
    elif pest_hits:
        detection_type = "pest"
        # Include pest boxes only (no fake disease boxes, no contradictory healthy boxes)
        final_dets = pest_hits[:6]
    elif disease_hits:
        detection_type = "disease"
        final_dets = disease_hits[:6]
    elif healthy_hits:
        detection_type = "healthy"
        final_dets = healthy_hits[:4]
    else:
        return {
            "rejected": True,
            "rejection_reason": (
                "Unrecognized specimen: No valid Lettuce, Bok Choy, Mustard Greens, or pest/disease finding remained after validation."
            ),
            "detection_type": "rejected",
        }

    final_dets.sort(key=lambda d: d["confidence"], reverse=True)
    return {
        "rejected": False,
        "rejection_reason": None,
        "detection_type": detection_type,
        "resolved_crop_name": resolved_crop_name,
        "pest_hits": pest_hits,
        "disease_hits": disease_hits,
        "healthy_hits": healthy_hits,
        "final_boxes": [d["box"] for d in final_dets[:8]],
    }
