package com.capstone.pestdetection.ui;

import android.content.Intent;
import android.graphics.Typeface;
import android.os.Bundle;
import android.view.View;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.core.content.ContextCompat;

import com.bumptech.glide.Glide;
import com.capstone.pestdetection.R;
import com.capstone.pestdetection.models.DetectionResponse;
import com.capstone.pestdetection.models.FeedbackRequest;
import com.capstone.pestdetection.network.ApiClient;
import com.capstone.pestdetection.network.ApiService;
import com.capstone.pestdetection.network.SessionManager;
import com.capstone.pestdetection.views.BoundingBoxOverlayView;
import com.google.android.material.appbar.MaterialToolbar;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.card.MaterialCardView;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class DetectionResultActivity extends BaseActivity {

    private ImageView ivResultImage;
    private BoundingBoxOverlayView overlayBoundingBox;
    private MaterialCardView cardTotalCondition, cardProbablePests, cardNutrientDeficiency;
    private TextView tvOverallCondition, tvHealthScore, tvConditionSummary;
    private TextView tvSignalGreen, tvSignalYellow, tvSignalBrown, tvSignalHoles, tvScanExtras;
    private TextView tvDamageType, tvDamageDescription;
    private LinearLayout layoutCulpritsContainer;
    private TextView tvNutrientName, tvNutrientBadge, tvNutrientSymptoms, tvNutrientCauses, tvNutrientAction;
    private TextView tvBreakdownSubtitle, tvBreakdownPestsHeader, tvBreakdownDiseasesHeader, tvBreakdownNutrientsHeader;
    private LinearLayout layoutBreakdownPests, layoutBreakdownDiseases, layoutBreakdownNutrients;
    private TextView tvPestName, tvScientificName, tvSeverityBadge, tvConfidenceScore, tvResultCropName, tvRecommendation;
    private TextView tvResultLocation, tvResultWeather, tvResultTimestamp;
    private View cardDiseaseDiagnosis;
    private TextView tvDiseaseName, tvDiseaseScientific, tvDiseaseSeverityBadge, tvDiseasePathogen, tvDiseaseConfidence, tvDiseaseSymptoms, tvDiseaseRecommendation;
    private MaterialButton btnFeedbackAccurate, btnFeedbackInaccurate, btnNewScanFromReport;

    private DetectionResponse detectionResult;
    private SessionManager sessionManager;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_result);

        sessionManager = new SessionManager(this);

        MaterialToolbar toolbar = findViewById(R.id.resultToolbar);
        toolbar.setNavigationOnClickListener(v -> finish());

        ivResultImage = findViewById(R.id.ivResultImage);
        overlayBoundingBox = findViewById(R.id.overlayBoundingBox);

        cardTotalCondition = findViewById(R.id.cardTotalCondition);
        tvOverallCondition = findViewById(R.id.tvOverallCondition);
        tvHealthScore = findViewById(R.id.tvHealthScore);
        tvConditionSummary = findViewById(R.id.tvConditionSummary);
        tvSignalGreen = findViewById(R.id.tvSignalGreen);
        tvSignalYellow = findViewById(R.id.tvSignalYellow);
        tvSignalBrown = findViewById(R.id.tvSignalBrown);
        tvSignalHoles = findViewById(R.id.tvSignalHoles);
        tvScanExtras = findViewById(R.id.tvScanExtras);

        cardProbablePests = findViewById(R.id.cardProbablePests);
        tvDamageType = findViewById(R.id.tvDamageType);
        tvDamageDescription = findViewById(R.id.tvDamageDescription);
        layoutCulpritsContainer = findViewById(R.id.layoutCulpritsContainer);

        cardNutrientDeficiency = findViewById(R.id.cardNutrientDeficiency);
        tvNutrientName = findViewById(R.id.tvNutrientName);
        tvNutrientBadge = findViewById(R.id.tvNutrientBadge);
        tvNutrientSymptoms = findViewById(R.id.tvNutrientSymptoms);
        tvNutrientCauses = findViewById(R.id.tvNutrientCauses);
        tvNutrientAction = findViewById(R.id.tvNutrientAction);

        tvBreakdownSubtitle = findViewById(R.id.tvBreakdownSubtitle);
        tvBreakdownPestsHeader = findViewById(R.id.tvBreakdownPestsHeader);
        tvBreakdownDiseasesHeader = findViewById(R.id.tvBreakdownDiseasesHeader);
        tvBreakdownNutrientsHeader = findViewById(R.id.tvBreakdownNutrientsHeader);
        layoutBreakdownPests = findViewById(R.id.layoutBreakdownPests);
        layoutBreakdownDiseases = findViewById(R.id.layoutBreakdownDiseases);
        layoutBreakdownNutrients = findViewById(R.id.layoutBreakdownNutrients);

        tvPestName = findViewById(R.id.tvPestName);
        tvScientificName = findViewById(R.id.tvScientificName);
        tvSeverityBadge = findViewById(R.id.tvSeverityBadge);
        tvConfidenceScore = findViewById(R.id.tvConfidenceScore);
        tvResultCropName = findViewById(R.id.tvResultCropName);
        tvRecommendation = findViewById(R.id.tvRecommendation);
        tvResultLocation = findViewById(R.id.tvResultLocation);
        tvResultWeather = findViewById(R.id.tvResultWeather);
        tvResultTimestamp = findViewById(R.id.tvResultTimestamp);

        cardDiseaseDiagnosis = findViewById(R.id.cardDiseaseDiagnosis);
        tvDiseaseName = findViewById(R.id.tvDiseaseName);
        tvDiseaseScientific = findViewById(R.id.tvDiseaseScientific);
        tvDiseaseSeverityBadge = findViewById(R.id.tvDiseaseSeverityBadge);
        tvDiseasePathogen = findViewById(R.id.tvDiseasePathogen);
        tvDiseaseConfidence = findViewById(R.id.tvDiseaseConfidence);
        tvDiseaseSymptoms = findViewById(R.id.tvDiseaseSymptoms);
        tvDiseaseRecommendation = findViewById(R.id.tvDiseaseRecommendation);

        btnFeedbackAccurate = findViewById(R.id.btnFeedbackAccurate);
        btnFeedbackInaccurate = findViewById(R.id.btnFeedbackInaccurate);
        btnNewScanFromReport = findViewById(R.id.btnNewScanFromReport);

        detectionResult = (DetectionResponse) getIntent().getSerializableExtra("DETECTION_RESULT");

        if (detectionResult != null) {
            displayResults();
        } else {
            Toast.makeText(this, getString(R.string.diagnostic_data_unavailable), Toast.LENGTH_SHORT).show();
            finish();
        }

        btnFeedbackAccurate.setOnClickListener(v -> submitFeedback(true, "Farmer confirmed accurate diagnosis."));
        btnFeedbackInaccurate.setOnClickListener(v -> showInaccurateNotesDialog());

        btnNewScanFromReport.setOnClickListener(v -> {
            Intent intent = new Intent(DetectionResultActivity.this, DetectActivity.class);
            startActivity(intent);
            finish();
        });
    }

    private void displayResults() {
        String detType = detectionResult.getDetectionType() != null
                ? detectionResult.getDetectionType().toLowerCase()
                : "";
        String rawPestName = detectionResult.getDetectedPestName();
        String rawDiseaseName = detectionResult.getDetectedDiseaseName();

        boolean isHealthy = "healthy".equals(detType)
                || (rawPestName != null && rawPestName.toLowerCase().startsWith("healthy ") && (rawDiseaseName == null || rawDiseaseName.isEmpty()));
        boolean isPestDamage = "pest_damage".equals(detType);
        boolean isNutrientDeficiency = "nutrient_deficiency".equals(detType);
        boolean isDiseaseOnly = "disease".equals(detType)
                || (!isPestDamage && !isNutrientDeficiency && (rawPestName == null || "No Pest Detected".equalsIgnoreCase(rawPestName)) && rawDiseaseName != null && !rawDiseaseName.isEmpty());
        boolean hasDualDisease = !isHealthy && !isDiseaseOnly && !isPestDamage && !isNutrientDeficiency && rawDiseaseName != null && !rawDiseaseName.isEmpty();

        if (isDiseaseOnly) {
            tvPestName.setText(rawDiseaseName);
            String disSci = detectionResult.getDiseaseScientificName();
            String pathogen = detectionResult.getDiseasePathogenType();
            String subtitle = (disSci != null && !disSci.isEmpty()) ? disSci : "Plant Pathogen";
            if (pathogen != null && !pathogen.isEmpty()) {
                subtitle = subtitle + " (" + pathogen + ")";
            }
            tvScientificName.setText(subtitle);
        } else if (isPestDamage) {
            tvPestName.setText(rawPestName != null ? rawPestName : "Pest-Damaged Foliage");
            String sciName = detectionResult.getScientificName();
            tvScientificName.setText(sciName != null && !sciName.isEmpty()
                    ? "Indirect Pest Damage • Probable: " + sciName
                    : "Indirect Pest Feeding Damage (Insect not in frame)");
        } else if (isNutrientDeficiency) {
            tvPestName.setText(rawPestName != null ? rawPestName : "Nutrient Deficiency");
            String sciName = detectionResult.getScientificName();
            tvScientificName.setText(sciName != null && !sciName.isEmpty() ? sciName : "Abiotic / Nutritional Disorder");
        } else if (isHealthy) {
            tvPestName.setText(rawPestName != null ? rawPestName : "Healthy Leafy Green");
            String sciName = detectionResult.getScientificName();
            tvScientificName.setText(sciName != null && !sciName.isEmpty() ? sciName : "No pest or disease detected");
        } else {
            tvPestName.setText(rawPestName != null ? rawPestName : "Pest Species Detected");
            String sciName = detectionResult.getScientificName();
            tvScientificName.setText(sciName != null && !sciName.isEmpty() ? sciName : "Identified Insect Pest");
        }

        String severity = isDiseaseOnly && detectionResult.getDiseaseSeverity() != null
                ? detectionResult.getDiseaseSeverity()
                : (detectionResult.getSeverity() != null ? detectionResult.getSeverity() : "Low");
        String severityKey = severity.toLowerCase();
        String localizedSeverity;
        if (severityKey.contains("crit")) {
            localizedSeverity = getString(R.string.risk_critical);
        } else if (severityKey.contains("high")) {
            localizedSeverity = getString(R.string.risk_high);
        } else if (severityKey.contains("mod")) {
            localizedSeverity = getString(R.string.risk_moderate);
        } else {
            localizedSeverity = getString(R.string.risk_low);
        }
        tvSeverityBadge.setText(localizedSeverity.toUpperCase());

        boolean isCritical = "Critical".equalsIgnoreCase(severity) || "High".equalsIgnoreCase(severity);
        boolean isModerate = "Moderate".equalsIgnoreCase(severity);
        if (isCritical) {
            tvSeverityBadge.setBackgroundResource(R.drawable.bg_badge_error);
            tvSeverityBadge.setTextColor(ContextCompat.getColor(this, R.color.error));
        } else if (isModerate) {
            tvSeverityBadge.setBackgroundResource(R.drawable.bg_badge_warning);
            tvSeverityBadge.setTextColor(ContextCompat.getColor(this, R.color.amber_accent));
        } else if (isHealthy) {
            tvSeverityBadge.setBackgroundResource(R.drawable.bg_badge_success);
            tvSeverityBadge.setTextColor(ContextCompat.getColor(this, R.color.primary));
        } else {
            tvSeverityBadge.setBackgroundResource(R.drawable.bg_badge_neutral);
            tvSeverityBadge.setTextColor(ContextCompat.getColor(this, R.color.outline));
        }

        // Render Holistic Total Plant Condition, Probable Culprits & Nutrient Deficiency Cards
        renderConditionAssessment(detectionResult.getConditionAssessment());

        float primaryConf = isDiseaseOnly && detectionResult.getDiseaseConfidenceScore() != null
                ? detectionResult.getDiseaseConfidenceScore()
                : detectionResult.getConfidenceScore();
        int confPercent = Math.round(primaryConf * 100);
        tvConfidenceScore.setText(confPercent + "%");

        String cropName = detectionResult.getCropName() != null ? detectionResult.getCropName() : getString(R.string.crop_cabbage_default);
        tvResultCropName.setText(cropName);

        // Always render full Detectable Pest, Disease & Nutrient Screening Breakdown
        renderDiagnosticBreakdown(cropName, detType, rawPestName, rawDiseaseName, detectionResult.getConditionAssessment());

        String action = isDiseaseOnly && detectionResult.getDiseaseRecommendedAction() != null
                ? detectionResult.getDiseaseRecommendedAction()
                : detectionResult.getRecommendedAction();
        tvRecommendation.setText(action != null ? action : "Continue regular field scouting and preventive crop care.");

        tvResultLocation.setText(detectionResult.getFieldLocation() != null ? detectionResult.getFieldLocation() : getString(R.string.default_sector_location));
        tvResultWeather.setText(detectionResult.getWeatherCondition() != null ? detectionResult.getWeatherCondition() : "Sunny / Clear");

        String dateStr = detectionResult.getCreatedAt() != null ? detectionResult.getCreatedAt().replace("T", " ").substring(0, Math.min(16, detectionResult.getCreatedAt().length())) : "Recent";
        tvResultTimestamp.setText(dateStr);

        // Plant Disease Diagnosis Card: show secondary disease card ONLY for dual pest+disease detections
        // (disease-only scans already display the disease cleanly in the primary summary card above)
        if (hasDualDisease) {
            cardDiseaseDiagnosis.setVisibility(View.VISIBLE);
            tvDiseaseName.setText(rawDiseaseName);
            tvDiseaseScientific.setText(detectionResult.getDiseaseScientificName() != null ? detectionResult.getDiseaseScientificName() : "Plant Pathogen");
            tvDiseasePathogen.setText(detectionResult.getDiseasePathogenType() != null ? detectionResult.getDiseasePathogenType() : "Fungal");

            float disConf = detectionResult.getDiseaseConfidenceScore() != null ? detectionResult.getDiseaseConfidenceScore() : 0.88f;
            tvDiseaseConfidence.setText(Math.round(disConf * 100) + "%");

            String disSeverity = detectionResult.getDiseaseSeverity() != null ? detectionResult.getDiseaseSeverity() : "Moderate";
            tvDiseaseSeverityBadge.setText(disSeverity.toUpperCase());

            if (detectionResult.getDiseaseSymptoms() != null && !detectionResult.getDiseaseSymptoms().isEmpty()) {
                tvDiseaseSymptoms.setVisibility(View.VISIBLE);
                tvDiseaseSymptoms.setText("Symptoms: " + detectionResult.getDiseaseSymptoms());
            } else {
                tvDiseaseSymptoms.setVisibility(View.GONE);
            }

            tvDiseaseRecommendation.setText(detectionResult.getDiseaseRecommendedAction() != null
                    ? detectionResult.getDiseaseRecommendedAction()
                    : "Apply protective copper hydroxide spray or contact protectant as per extension office protocols.");
        } else {
            cardDiseaseDiagnosis.setVisibility(View.GONE);
        }

        // Load Specimen Image
        String imageUrl = detectionResult.getImagePath();
        if (imageUrl != null && !imageUrl.isEmpty()) {
            if (!imageUrl.startsWith("http")) {
                String baseUrl = sessionManager.getBaseUrl();
                if (baseUrl.endsWith("/") && imageUrl.startsWith("/")) {
                    imageUrl = baseUrl.substring(0, baseUrl.length() - 1) + imageUrl;
                } else {
                    imageUrl = baseUrl + imageUrl;
                }
            }
            Glide.with(this)
                    .load(imageUrl)
                    .placeholder(R.drawable.bg_card_stitch)
                    .error(R.drawable.ic_bug_report)
                    .into(ivResultImage);
        }

        // Overlay Bounding Boxes
        if (detectionResult.getBoundingBoxes() != null && !detectionResult.getBoundingBoxes().isEmpty()) {
            overlayBoundingBox.setBoundingBoxes(detectionResult.getBoundingBoxes());
        }
    }

    @SuppressWarnings("unchecked")
    private void renderConditionAssessment(Map<String, Object> ca) {
        if (ca == null || ca.isEmpty()) {
            cardTotalCondition.setVisibility(View.GONE);
            cardProbablePests.setVisibility(View.GONE);
            cardNutrientDeficiency.setVisibility(View.GONE);
            return;
        }

        // 1. Total Plant Condition Card
        cardTotalCondition.setVisibility(View.VISIBLE);
        String overall = asString(ca.get("overall_condition"), "Plant Condition");
        String summary = asString(ca.get("condition_summary"), "");
        int healthScore = asInt(ca.get("health_score"), 75);

        tvOverallCondition.setText(overall);
        tvConditionSummary.setText(summary);
        tvHealthScore.setText(String.format(Locale.US, "%d / 100", healthScore));

        if (healthScore >= 80) {
            cardTotalCondition.setStrokeColor(ContextCompat.getColor(this, R.color.primary));
            tvHealthScore.setBackgroundResource(R.drawable.bg_badge_success);
            tvHealthScore.setTextColor(ContextCompat.getColor(this, R.color.primary));
        } else if (healthScore >= 55) {
            cardTotalCondition.setStrokeColor(ContextCompat.getColor(this, R.color.amber_600));
            tvHealthScore.setBackgroundResource(R.drawable.bg_badge_warning);
            tvHealthScore.setTextColor(ContextCompat.getColor(this, R.color.amber_accent));
        } else {
            cardTotalCondition.setStrokeColor(ContextCompat.getColor(this, R.color.error));
            tvHealthScore.setBackgroundResource(R.drawable.bg_badge_error);
            tvHealthScore.setTextColor(ContextCompat.getColor(this, R.color.error));
        }

        Object vsObj = ca.get("visual_signals");
        if (vsObj instanceof Map) {
            Map<String, Object> vs = (Map<String, Object>) vsObj;
            double green = asDouble(vs.get("green_foliage_pct"), 0.0);
            double yellow = asDouble(vs.get("yellow_chlorosis_pct"), 0.0);
            double brown = asDouble(vs.get("brown_necrosis_pct"), 0.0);
            int holes = asInt(vs.get("leaf_hole_count"), 0);
            double holeArea = asDouble(vs.get("hole_area_pct"), 0.0);

            tvSignalGreen.setText(String.format(Locale.US, "Green %.0f%%", green));
            tvSignalYellow.setText(String.format(Locale.US, "Chlorosis %.0f%%", yellow));
            tvSignalBrown.setText(String.format(Locale.US, "Necrosis %.0f%%", brown));

            if (holes >= 10 || (holes >= 4 && holeArea >= 0.80)) {
                tvSignalHoles.setVisibility(View.VISIBLE);
                tvSignalHoles.setText(String.format(Locale.US, "Leaf Perforations Detected: %d holes (%.1f%% blade area)", holes, holeArea));
            } else {
                tvSignalHoles.setVisibility(View.GONE);
            }
        }

        // Optional 2-Angle Scan & Photo Quality Tips
        StringBuilder extras = new StringBuilder();
        if (ca.get("two_angle_scan") instanceof Map) {
            Map<String, Object> twoAngle = (Map<String, Object>) ca.get("two_angle_scan");
            if (Boolean.TRUE.equals(twoAngle.get("enabled"))) {
                extras.append("2-Angle Scan (Top + Underside): ")
                        .append(asString(twoAngle.get("underside_summary"), "Underside analyzed."));
            }
        }
        if (ca.get("image_quality") instanceof Map) {
            Map<String, Object> iq = (Map<String, Object>) ca.get("image_quality");
            String qHint = asString(iq.get("quality_hint"), "");
            if (!qHint.isEmpty() && !"null".equalsIgnoreCase(qHint)) {
                if (extras.length() > 0) extras.append("\n");
                extras.append("Photo Tip: ").append(qHint);
            }
        }
        if (tvScanExtras != null) {
            if (extras.length() > 0) {
                tvScanExtras.setVisibility(View.VISIBLE);
                tvScanExtras.setText(extras.toString());
            } else {
                tvScanExtras.setVisibility(View.GONE);
            }
        }

        // 2. Indirect Pest Damage & Probable Causal Pests Card
        Object dmgObj = ca.get("pest_damage");
        Object culpritsObj = ca.get("probable_pests");
        List<Object> culprits = (culpritsObj instanceof List) ? (List<Object>) culpritsObj : null;

        if ((dmgObj instanceof Map) || (culprits != null && !culprits.isEmpty())) {
            cardProbablePests.setVisibility(View.VISIBLE);
            if (dmgObj instanceof Map) {
                Map<String, Object> dmg = (Map<String, Object>) dmgObj;
                tvDamageType.setText(asString(dmg.get("damage_type"), "Indirect Pest Feeding Damage"));
                tvDamageDescription.setText(asString(dmg.get("description"), ""));
                tvDamageDescription.setVisibility(tvDamageDescription.getText().length() > 0 ? View.VISIBLE : View.GONE);
            } else {
                tvDamageType.setText("Indirect Pest Feeding Damage");
                tvDamageDescription.setVisibility(View.GONE);
            }

            layoutCulpritsContainer.removeAllViews();
            if (culprits != null) {
                int dp8 = Math.round(8 * getResources().getDisplayMetrics().density);
                int dp10 = Math.round(10 * getResources().getDisplayMetrics().density);
                for (Object item : culprits) {
                    if (!(item instanceof Map)) continue;
                    Map<String, Object> c = (Map<String, Object>) item;
                    String cName = asString(c.get("name"), "Unknown Pest");
                    String cSci = asString(c.get("scientific_name"), "");
                    String cLike = asString(c.get("likelihood"), "Moderate");
                    String cEvidence = asString(c.get("evidence"), "");

                    LinearLayout row = new LinearLayout(this);
                    row.setOrientation(LinearLayout.VERTICAL);
                    row.setBackgroundResource(R.drawable.bg_card_stitch);
                    row.setPadding(dp10, dp8, dp10, dp8);
                    LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                            LinearLayout.LayoutParams.MATCH_PARENT,
                            LinearLayout.LayoutParams.WRAP_CONTENT
                    );
                    lp.bottomMargin = dp8;
                    row.setLayoutParams(lp);

                    TextView tvTitle = new TextView(this);
                    tvTitle.setText(cName + "  •  " + cLike.toUpperCase(Locale.US) + " LIKELIHOOD");
                    tvTitle.setTextSize(13f);
                    tvTitle.setTypeface(null, Typeface.BOLD);
                    tvTitle.setTextColor(ContextCompat.getColor(this,
                            "High".equalsIgnoreCase(cLike) ? R.color.error : R.color.amber_accent));
                    row.addView(tvTitle);

                    if (!cSci.isEmpty()) {
                        TextView tvSci = new TextView(this);
                        tvSci.setText(cSci);
                        tvSci.setTextSize(11f);
                        tvSci.setTypeface(null, Typeface.ITALIC);
                        tvSci.setTextColor(ContextCompat.getColor(this, R.color.outline));
                        row.addView(tvSci);
                    }

                    if (!cEvidence.isEmpty()) {
                        TextView tvEv = new TextView(this);
                        tvEv.setText(cEvidence);
                        tvEv.setTextSize(12f);
                        tvEv.setTextColor(ContextCompat.getColor(this, R.color.on_surface_variant));
                        row.addView(tvEv);
                    }

                    layoutCulpritsContainer.addView(row);
                }
            }
        } else {
            cardProbablePests.setVisibility(View.GONE);
        }

        // 3. Nutrient Deficiency / Abiotic Stress Card
        Object nutObj = ca.get("nutrient_deficiency");
        if (nutObj instanceof Map) {
            Map<String, Object> nut = (Map<String, Object>) nutObj;
            cardNutrientDeficiency.setVisibility(View.VISIBLE);
            tvNutrientName.setText(asString(nut.get("name"), "Nutrient Deficiency"));
            tvNutrientBadge.setText(asString(nut.get("nutrient"), "ABIOTIC").toUpperCase(Locale.US));
            String symptoms = asString(nut.get("symptoms"), "");
            String causes = asString(nut.get("causes"), "");
            tvNutrientSymptoms.setText(symptoms.isEmpty() ? "" : "Symptoms: " + symptoms);
            tvNutrientCauses.setText(causes.isEmpty() ? "" : "Likely Cause: " + causes);
            tvNutrientAction.setText(asString(nut.get("recommended_action"), ""));
        } else {
            cardNutrientDeficiency.setVisibility(View.GONE);
        }
    }

    private String asString(Object val, String fallback) {
        return val != null ? String.valueOf(val) : fallback;
    }

    private int asInt(Object val, int fallback) {
        if (val instanceof Number) return ((Number) val).intValue();
        try {
            return val != null ? (int) Math.round(Double.parseDouble(String.valueOf(val))) : fallback;
        } catch (Exception ignored) {
            return fallback;
        }
    }

    private double asDouble(Object val, double fallback) {
        if (val instanceof Number) return ((Number) val).doubleValue();
        try {
            return val != null ? Double.parseDouble(String.valueOf(val)) : fallback;
        } catch (Exception ignored) {
            return fallback;
        }
    }

    @SuppressWarnings("unchecked")
    private void renderDiagnosticBreakdown(
            String cropName,
            String detType,
            String rawPestName,
            String rawDiseaseName,
            Map<String, Object> ca
    ) {
        boolean isBrassica = cropName != null && (
                cropName.toLowerCase(Locale.US).contains("bok")
                        || cropName.toLowerCase(Locale.US).contains("pechay")
                        || cropName.toLowerCase(Locale.US).contains("petsay")
                        || cropName.toLowerCase(Locale.US).contains("mustard")
                        || cropName.toLowerCase(Locale.US).contains("mustasa")
        );

        List<String> pests = null;
        List<String> diseases = null;
        List<String> nutrients = null;

        if (ca != null && ca.get("screened_targets") instanceof Map) {
            Map<String, Object> targets = (Map<String, Object>) ca.get("screened_targets");
            pests = toStringList(targets.get("pests"));
            diseases = toStringList(targets.get("diseases"));
            nutrients = toStringList(targets.get("nutrients"));
        }

        if (pests == null || pests.isEmpty()) {
            pests = isBrassica
                    ? new ArrayList<>(Arrays.asList(
                            "Diamondback Moth", "Striped Flea Beetle", "Turnip / Mustard Aphid",
                            "Green Peach Aphid", "Cabbage Looper", "Common Cutworm",
                            "Beet Armyworm", "Cabbage Cluster Caterpillar", "Cabbage Webworm",
                            "Serpentine Leafminer", "Silverleaf Whitefly", "Onion / Leaf Thrips"))
                    : new ArrayList<>(Arrays.asList(
                            "Green Peach Aphid", "Cabbage Looper", "Common Cutworm",
                            "Beet Armyworm", "Serpentine Leafminer", "Silverleaf Whitefly",
                            "Onion / Leaf Thrips"));
        }
        if (diseases == null || diseases.isEmpty()) {
            diseases = isBrassica
                    ? new ArrayList<>(Arrays.asList(
                            "Alternaria Leaf Spot of Brassicas", "Black Rot of Brassicas",
                            "Downy Mildew of Brassicas", "White Rust of Crucifers",
                            "Bacterial Soft Rot"))
                    : new ArrayList<>(Arrays.asList(
                            "Downy Mildew of Lettuce", "Powdery Mildew of Lettuce",
                            "Bacterial Soft Rot", "Bottom Rot & Drop of Lettuce",
                            "Septoria Leaf Spot of Lettuce", "Lettuce Mosaic / Viral Infection"));
        }
        if (nutrients == null || nutrients.isEmpty()) {
            nutrients = new ArrayList<>(Arrays.asList(
                    "Nitrogen (N) Deficiency",
                    "Calcium (Ca) Deficiency / Tipburn",
                    "Potassium (K) Deficiency / Marginal Scorch",
                    "Magnesium (Mg) / Iron (Fe) Interveinal Chlorosis",
                    "Heat / Water / Sunscald Stress (Abiotic)"
            ));
        }

        // Collect matched names for status badges
        String detectedPestLower = ("pest".equals(detType) || "pest_and_disease".equals(detType)) && rawPestName != null
                ? rawPestName.trim().toLowerCase(Locale.US)
                : "";
        String detectedDiseaseLower = ("disease".equals(detType) || "pest_and_disease".equals(detType)) && rawDiseaseName != null
                ? rawDiseaseName.trim().toLowerCase(Locale.US)
                : "";

        Set<String> probablePestLower = new HashSet<>();
        String detectedNutrientLower = "";
        if (ca != null) {
            if (ca.get("probable_pests") instanceof List) {
                for (Object item : (List<Object>) ca.get("probable_pests")) {
                    if (item instanceof Map) {
                        String cName = asString(((Map<String, Object>) item).get("name"), "").trim();
                        if (!cName.isEmpty()) {
                            probablePestLower.add(cName.toLowerCase(Locale.US));
                            // Ensure cross-crop probable culprits (e.g. Striped Flea Beetle on lettuce) appear in the list
                            boolean exists = false;
                            for (String existing : pests) {
                                if (existing.equalsIgnoreCase(cName)) {
                                    exists = true;
                                    break;
                                }
                            }
                            if (!exists) {
                                pests.add(0, cName);
                            }
                        }
                    }
                }
            }
            if (ca.get("nutrient_deficiency") instanceof Map) {
                detectedNutrientLower = asString(((Map<String, Object>) ca.get("nutrient_deficiency")).get("name"), "")
                        .trim().toLowerCase(Locale.US);
            }
        }

        String displayCrop = (cropName != null && !cropName.isEmpty()) ? cropName : "Leafy Green";
        tvBreakdownSubtitle.setText(String.format(
                Locale.US,
                "Screened for %s: %d insect pests, %d plant diseases & %d nutrient/abiotic disorders",
                displayCrop, pests.size(), diseases.size(), nutrients.size()
        ));
        tvBreakdownPestsHeader.setText(String.format(Locale.US, "DETECTABLE INSECT PESTS (%d)", pests.size()));
        tvBreakdownDiseasesHeader.setText(String.format(Locale.US, "DETECTABLE PLANT DISEASES (%d)", diseases.size()));
        tvBreakdownNutrientsHeader.setText(String.format(Locale.US, "NUTRIENT & ABIOTIC CONDITIONS (%d)", nutrients.size()));

        layoutBreakdownPests.removeAllViews();
        for (String pest : pests) {
            String lower = pest.toLowerCase(Locale.US);
            if (!detectedPestLower.isEmpty() && lower.equals(detectedPestLower)) {
                addBreakdownRow(layoutBreakdownPests, pest, "DETECTED", R.drawable.bg_badge_error, R.color.error, true);
            } else if (probablePestLower.contains(lower)) {
                addBreakdownRow(layoutBreakdownPests, pest, "PROBABLE", R.drawable.bg_badge_warning, R.color.amber_accent, true);
            } else {
                addBreakdownRow(layoutBreakdownPests, pest, "CLEAR", R.drawable.bg_badge_success, R.color.primary, false);
            }
        }

        layoutBreakdownDiseases.removeAllViews();
        for (String dis : diseases) {
            String lower = dis.toLowerCase(Locale.US);
            if (!detectedDiseaseLower.isEmpty() && lower.equals(detectedDiseaseLower)) {
                addBreakdownRow(layoutBreakdownDiseases, dis, "DETECTED", R.drawable.bg_badge_warning, R.color.amber_accent, true);
            } else {
                addBreakdownRow(layoutBreakdownDiseases, dis, "CLEAR", R.drawable.bg_badge_success, R.color.primary, false);
            }
        }

        layoutBreakdownNutrients.removeAllViews();
        for (String nut : nutrients) {
            String lower = nut.toLowerCase(Locale.US);
            if (!detectedNutrientLower.isEmpty() && lower.equals(detectedNutrientLower)) {
                addBreakdownRow(layoutBreakdownNutrients, nut, "DETECTED", R.drawable.bg_badge_warning, R.color.blue_accent, true);
            } else {
                addBreakdownRow(layoutBreakdownNutrients, nut, "CLEAR", R.drawable.bg_badge_success, R.color.primary, false);
            }
        }
    }

    private void addBreakdownRow(
            LinearLayout container,
            String label,
            String statusText,
            int badgeBgRes,
            int badgeColorRes,
            boolean highlight
    ) {
        float density = getResources().getDisplayMetrics().density;
        int dp4 = Math.round(4 * density);
        int dp6 = Math.round(6 * density);
        int dp8 = Math.round(8 * density);

        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(android.view.Gravity.CENTER_VERTICAL);
        row.setPadding(dp8, dp6, dp8, dp6);
        if (highlight) {
            row.setBackgroundResource(R.drawable.bg_card_stitch);
        }
        LinearLayout.LayoutParams rowParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
        );
        rowParams.bottomMargin = dp4;
        row.setLayoutParams(rowParams);

        TextView tvName = new TextView(this);
        LinearLayout.LayoutParams nameParams = new LinearLayout.LayoutParams(
                0,
                LinearLayout.LayoutParams.WRAP_CONTENT,
                1f
        );
        nameParams.setMarginEnd(dp8);
        tvName.setLayoutParams(nameParams);
        tvName.setText(label);
        tvName.setTextSize(12f);
        tvName.setTypeface(null, highlight ? Typeface.BOLD : Typeface.NORMAL);
        tvName.setTextColor(ContextCompat.getColor(this, highlight ? R.color.on_surface : R.color.on_surface_variant));
        row.addView(tvName);

        TextView tvBadge = new TextView(this);
        tvBadge.setText(statusText);
        tvBadge.setTextSize(9f);
        tvBadge.setTypeface(null, Typeface.BOLD);
        tvBadge.setBackgroundResource(badgeBgRes);
        tvBadge.setTextColor(ContextCompat.getColor(this, badgeColorRes));
        tvBadge.setPadding(dp8, Math.round(2 * density), dp8, Math.round(2 * density));
        row.addView(tvBadge);

        container.addView(row);
    }

    private List<String> toStringList(Object obj) {
        if (!(obj instanceof List)) return null;
        List<String> out = new ArrayList<>();
        for (Object item : (List<?>) obj) {
            if (item != null) {
                String s = String.valueOf(item).trim();
                if (!s.isEmpty()) out.add(s);
            }
        }
        return out;
    }

    private void showInaccurateNotesDialog() {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("Diagnostic Feedback");
        builder.setMessage("Please specify observed discrepancy:");

        final EditText input = new EditText(this);
        input.setHint("e.g. Specimen is Diamondback Moth larvae.");
        builder.setView(input);

        builder.setPositiveButton("Submit", (dialog, which) -> {
            String notes = input.getText().toString().trim();
            submitFeedback(false, !notes.isEmpty() ? notes : "Farmer flagged diagnosis as inaccurate.");
        });
        builder.setNegativeButton("Cancel", (dialog, which) -> dialog.cancel());
        builder.show();
    }

    private void submitFeedback(boolean accurate, String notes) {
        if (detectionResult == null) return;

        FeedbackRequest req = new FeedbackRequest(accurate, notes);
        ApiService apiService = ApiClient.getApiService(this);
        apiService.submitFeedback(detectionResult.getId(), req).enqueue(new Callback<DetectionResponse>() {
            @Override
            public void onResponse(Call<DetectionResponse> call, Response<DetectionResponse> response) {
                if (response.isSuccessful()) {
                    Toast.makeText(DetectionResultActivity.this, getString(R.string.feedback_recorded_success), Toast.LENGTH_SHORT).show();
                    btnFeedbackAccurate.setEnabled(false);
                    btnFeedbackInaccurate.setEnabled(false);
                } else {
                    Toast.makeText(DetectionResultActivity.this, getString(R.string.feedback_submission_failed), Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(Call<DetectionResponse> call, Throwable t) {
                Toast.makeText(DetectionResultActivity.this, getString(R.string.feedback_network_error), Toast.LENGTH_SHORT).show();
            }
        });
    }
}
