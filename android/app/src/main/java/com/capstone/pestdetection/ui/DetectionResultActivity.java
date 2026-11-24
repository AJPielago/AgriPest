package com.capstone.pestdetection.ui;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
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

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class DetectionResultActivity extends BaseActivity {

    private ImageView ivResultImage;
    private BoundingBoxOverlayView overlayBoundingBox;
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
        if (isCritical) {
            tvSeverityBadge.setBackgroundResource(R.drawable.bg_badge_error);
            tvSeverityBadge.setTextColor(ContextCompat.getColor(this, R.color.error));
        } else {
            tvSeverityBadge.setBackgroundResource(R.drawable.bg_badge_neutral);
            tvSeverityBadge.setTextColor(ContextCompat.getColor(this, R.color.outline));
        }

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
