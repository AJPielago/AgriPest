/**
 * Shared logical interpreter for 4-state detection outcomes:
 *   - 'healthy'          : Supported leafy green with no pest or disease
 *   - 'pest'             : Insect pest only (no foliar disease)
 *   - 'disease'          : Foliar plant disease only (no insect pest)
 *   - 'pest_and_disease' : Both an insect pest and a foliar plant disease
 */
export function getDetectionSummary(detection) {
  if (!detection) {
    return {
      outcome: 'unknown',
      isHealthy: false,
      hasPest: false,
      hasDisease: false,
      pestName: null,
      diseaseName: null,
      primaryTitle: 'Unknown Specimen',
      primaryConfidence: 0,
    };
  }

  const rawType = (detection.detection_type || '').toLowerCase();
  const rawPest = (detection.detected_pest_name || '').trim();
  const rawDisease = (detection.detected_disease_name || detection.disease_details?.name || '').trim();

  const pestLooksEmpty =
    !rawPest ||
    rawPest.toLowerCase() === 'no pest detected' ||
    rawPest.toLowerCase().startsWith('healthy / no pest') ||
    rawPest.toLowerCase().startsWith('healthy ');

  let isHealthy = false;
  let hasPest = false;
  let hasDisease = false;

  if (rawType === 'healthy') {
    isHealthy = true;
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
    // Legacy record fallback
    hasPest = !pestLooksEmpty;
    hasDisease = Boolean(rawDisease);
    isHealthy = !hasPest && !hasDisease;
  }

  const outcome = isHealthy
    ? 'healthy'
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
    hasDisease,
    pestName: hasPest ? rawPest : null,
    diseaseName: hasDisease ? rawDisease : null,
    primaryTitle,
    primaryConfidence,
  };
}
