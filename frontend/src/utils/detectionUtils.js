/**
 * Shared logical interpreter for 6-state agronomic detection outcomes:
 *   - 'healthy'             : Supported leafy green with intact foliage (no pest, disease, or deficiency)
 *   - 'pest'                : Active insect pest directly sighted (no infectious disease)
 *   - 'pest_damage'         : Indirect pest feeding damage (probable causal pests inferred without bug in frame)
 *   - 'disease'             : Foliar infectious plant disease only (no active pest)
 *   - 'nutrient_deficiency' : Non-infectious nutrient deficiency or abiotic stress (N/Ca/K/Mg/Fe/heat)
 *   - 'pest_and_disease'    : Both an active insect pest and a foliar plant disease
 */
export function getDetectionSummary(detection) {
  if (!detection) {
    return {
      outcome: 'unknown',
      isHealthy: false,
      hasPest: false,
      hasPestDamage: false,
      hasDisease: false,
      hasNutrientDeficiency: false,
      pestName: null,
      diseaseName: null,
      primaryTitle: 'Unknown Specimen',
      primaryConfidence: 0,
      conditionAssessment: null,
    };
  }

  const rawType = (detection.detection_type || '').toLowerCase();
  const rawPest = (detection.detected_pest_name || '').trim();
  const rawDisease = (detection.detected_disease_name || detection.disease_details?.name || '').trim();
  const cond = detection.condition_assessment || null;

  const pestLooksEmpty =
    !rawPest ||
    rawPest.toLowerCase() === 'no pest detected' ||
    rawPest.toLowerCase().startsWith('healthy / no pest') ||
    rawPest.toLowerCase().startsWith('healthy ');

  let isHealthy = false;
  let hasPest = false;
  let hasPestDamage = false;
  let hasDisease = false;
  let hasNutrientDeficiency = false;

  if (rawType === 'healthy') {
    isHealthy = true;
  } else if (rawType === 'pest_damage') {
    hasPestDamage = true;
  } else if (rawType === 'nutrient_deficiency') {
    hasNutrientDeficiency = true;
  } else if (rawType === 'pest') {
    hasPest = !pestLooksEmpty;
  } else if (rawType === 'disease') {
    hasDisease = Boolean(rawDisease);
  } else if (rawType === 'pest_and_disease') {
    hasPest = !pestLooksEmpty;
    hasDisease = Boolean(rawDisease);
    if (!hasPest && !hasDisease) {
      isHealthy = true;
    }
  } else {
    hasPest = !pestLooksEmpty;
    hasDisease = Boolean(rawDisease);
    isHealthy = !hasPest && !hasDisease;
  }

  const outcome = isHealthy
    ? 'healthy'
    : hasPestDamage
      ? 'pest_damage'
      : hasNutrientDeficiency
        ? 'nutrient_deficiency'
        : hasPest && hasDisease
          ? 'pest_and_disease'
          : hasPest
            ? 'pest'
            : hasDisease
              ? 'disease'
              : 'healthy';

  const primaryTitle = isHealthy
    ? (rawPest && rawPest.toLowerCase().startsWith('healthy')
        ? rawPest
        : `Healthy ${detection.crop_name || 'Leafy Green'}`)
    : hasPestDamage
      ? (cond?.pest_damage?.damage_type || rawPest || 'Pest-Damaged Foliage')
      : hasNutrientDeficiency
        ? (cond?.nutrient_deficiency?.name || rawPest || 'Nutrient Deficiency')
        : hasPest
          ? rawPest
          : hasDisease
            ? rawDisease
            : rawPest || 'Specimen Scan';

  const primaryConfidence = hasDisease && !hasPest
    ? (detection.disease_confidence_score ?? detection.disease_details?.confidence ?? detection.confidence_score ?? 0)
    : (detection.confidence_score ?? 0);

  return {
    outcome,
    isHealthy,
    hasPest,
    hasPestDamage,
    hasDisease,
    hasNutrientDeficiency,
    pestName: hasPest ? rawPest : null,
    diseaseName: hasDisease ? rawDisease : null,
    primaryTitle,
    primaryConfidence,
    conditionAssessment: cond,
  };
}

/**
 * Host-crop-specific catalog of detectable pests, plant diseases, and
 * nutrient/abiotic disorders screened by the system (mirrors backend CLASS_REGISTRY).
 */
export function getScreenedTargetsForCrop(cropName, conditionAssessment = null) {
  const fromBackend = conditionAssessment?.screened_targets;
  if (fromBackend && Array.isArray(fromBackend.pests) && Array.isArray(fromBackend.diseases)) {
    return {
      pests: [...fromBackend.pests],
      diseases: [...fromBackend.diseases],
      nutrients: Array.isArray(fromBackend.nutrients) ? [...fromBackend.nutrients] : [],
    };
  }

  const lower = (cropName || '').toLowerCase();
  const isBrassica =
    lower.includes('bok') ||
    lower.includes('pechay') ||
    lower.includes('petsay') ||
    lower.includes('mustard') ||
    lower.includes('mustasa');

  return {
    pests: isBrassica
      ? [
          'Diamondback Moth',
          'Striped Flea Beetle',
          'Turnip / Mustard Aphid',
          'Green Peach Aphid',
          'Cabbage Looper',
          'Common Cutworm',
          'Beet Armyworm',
          'Cabbage Cluster Caterpillar',
          'Cabbage Webworm',
          'Serpentine Leafminer',
          'Silverleaf Whitefly',
          'Onion / Leaf Thrips',
        ]
      : [
          'Green Peach Aphid',
          'Cabbage Looper',
          'Common Cutworm',
          'Beet Armyworm',
          'Serpentine Leafminer',
          'Silverleaf Whitefly',
          'Onion / Leaf Thrips',
        ],
    diseases: isBrassica
      ? [
          'Alternaria Leaf Spot of Brassicas',
          'Black Rot of Brassicas',
          'Downy Mildew of Brassicas',
          'White Rust of Crucifers',
          'Bacterial Soft Rot',
        ]
      : [
          'Downy Mildew of Lettuce',
          'Powdery Mildew of Lettuce',
          'Bacterial Soft Rot',
          'Bottom Rot & Drop of Lettuce',
          'Septoria Leaf Spot of Lettuce',
          'Lettuce Mosaic / Viral Infection',
        ],
    nutrients: [
      'Nitrogen (N) Deficiency',
      'Calcium (Ca) Deficiency / Tipburn',
      'Potassium (K) Deficiency / Marginal Scorch',
      'Magnesium (Mg) / Iron (Fe) Interveinal Chlorosis',
      'Heat / Water / Sunscald Stress (Abiotic)',
    ],
  };
}
