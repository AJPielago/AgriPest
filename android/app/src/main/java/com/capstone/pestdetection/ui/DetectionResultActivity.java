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

import java.util.List;
import java.util.Locale;
import java.util.Map;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class DetectionResultActivity extends BaseActivity {

    private ImageView ivResultImage;
    private BoundingBoxOverlayView overlayBoundingBox;
    private MaterialCardView cardTotalCondition, cardProbablePests, cardNutrientDeficiency;
    private TextView tvOverallCondition, tvHealthScore, tvConditionSummary;
    private TextView tvSignalGreen, tvSignalYellow, tvSignalBrown, tvSignalHoles;
    private TextView tvDamageType, tvDamageDescription;
    private LinearLayout layoutCulpritsContainer;
    private TextView tvNutrientName, tvNutrientBadge, tvNutrientSymptoms, tvNutrientCauses, tvNutrientAction;
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

            if (holes >= 10) {
                tvSignalHoles.setVisibility(View.VISIBLE);
                tvSignalHoles.setText(String.format(Locale.US, "Leaf Perforations Detected: %d holes (%.1f%% blade area)", holes, holeArea));
            } else {
                tvSignalHoles.setVisibility(View.GONE);
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
