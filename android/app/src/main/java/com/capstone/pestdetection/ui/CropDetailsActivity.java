package com.capstone.pestdetection.ui;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import com.capstone.pestdetection.R;
import com.capstone.pestdetection.models.CropDto;
import com.capstone.pestdetection.models.DiseaseDto;
import com.capstone.pestdetection.models.PestDto;
import com.capstone.pestdetection.network.ApiClient;
import com.capstone.pestdetection.network.ApiService;
import com.google.android.material.appbar.MaterialToolbar;
import com.google.android.material.button.MaterialButton;

import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class CropDetailsActivity extends BaseActivity {

    private TextView tvCropDetailName, tvCropDetailScientific, tvCropDetailStatusBadge, tvCropDetailDescription;
    private TextView tvAssociatedPests, tvAssociatedDiseases;
    private ProgressBar cropDetailProgressBar;
    private MaterialButton btnDetectForThisCrop;

    private int cropId;
    private String cropName = "Crop";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_crop_details);

        MaterialToolbar toolbar = findViewById(R.id.cropDetailsToolbar);
        toolbar.setNavigationOnClickListener(v -> finish());

        tvCropDetailName = findViewById(R.id.tvCropDetailName);
        tvCropDetailScientific = findViewById(R.id.tvCropDetailScientific);
        tvCropDetailStatusBadge = findViewById(R.id.tvCropDetailStatusBadge);
        tvCropDetailDescription = findViewById(R.id.tvCropDetailDescription);
        tvAssociatedPests = findViewById(R.id.tvAssociatedPests);
        tvAssociatedDiseases = findViewById(R.id.tvAssociatedDiseases);
        cropDetailProgressBar = findViewById(R.id.cropDetailProgressBar);
        btnDetectForThisCrop = findViewById(R.id.btnDetectForThisCrop);

        cropId = getIntent().getIntExtra("CROP_ID", -1);
        String passedName = getIntent().getStringExtra("CROP_NAME");
        String passedSci = getIntent().getStringExtra("CROP_SCIENTIFIC");
        String passedDesc = getIntent().getStringExtra("CROP_DESCRIPTION");

        if (passedName != null) {
            cropName = passedName;
            tvCropDetailName.setText(passedName);
            toolbar.setTitle(passedName);
        }
        if (passedSci != null) tvCropDetailScientific.setText(passedSci);
        if (passedDesc != null) tvCropDetailDescription.setText(passedDesc);

        btnDetectForThisCrop.setOnClickListener(v -> {
            Intent intent = new Intent(CropDetailsActivity.this, DetectActivity.class);
            intent.putExtra("PRESELECTED_CROP_ID", cropId);
            startActivity(intent);
        });

        if (cropId != -1) {
            loadAssociatedData();
        } else {
            Toast.makeText(this, "Crop not found", Toast.LENGTH_SHORT).show();
            finish();
        }
    }

    private void loadAssociatedData() {
        cropDetailProgressBar.setVisibility(View.VISIBLE);
        ApiService apiService = ApiClient.getApiService(this);

        // 1. Load Pests for this crop
        apiService.getPests(cropId).enqueue(new Callback<List<PestDto>>() {
            @Override
            public void onResponse(Call<List<PestDto>> call, Response<List<PestDto>> response) {
                if (response.isSuccessful() && response.body() != null && !response.body().isEmpty()) {
                    StringBuilder sb = new StringBuilder();
                    for (PestDto pest : response.body()) {
                        if (sb.length() > 0) sb.append("\n• ");
                        else sb.append("• ");
                        sb.append(pest.getName());
                        if (pest.getScientificName() != null) {
                            sb.append(" (").append(pest.getScientificName()).append(")");
                        }
                    }
                    tvAssociatedPests.setText(sb.toString());
                } else {
                    tvAssociatedPests.setText("No specific pest infestations linked to this crop yet.");
                }
            }

            @Override
            public void onFailure(Call<List<PestDto>> call, Throwable t) {
                tvAssociatedPests.setText("Failed to load pests: " + t.getLocalizedMessage());
            }
        });

        // 2. Load Diseases for this crop
        apiService.getDiseases(cropId, null).enqueue(new Callback<List<DiseaseDto>>() {
            @Override
            public void onResponse(Call<List<DiseaseDto>> call, Response<List<DiseaseDto>> response) {
                cropDetailProgressBar.setVisibility(View.GONE);
                if (response.isSuccessful() && response.body() != null && !response.body().isEmpty()) {
                    StringBuilder sb = new StringBuilder();
                    for (DiseaseDto disease : response.body()) {
                        if (sb.length() > 0) sb.append("\n• ");
                        else sb.append("• ");
                        sb.append(disease.getName()).append(" [").append(disease.getPathogenType()).append("]");
                        if (disease.getScientificName() != null) {
                            sb.append(" - ").append(disease.getScientificName());
                        }
                    }
                    tvAssociatedDiseases.setText(sb.toString());
                } else {
                    tvAssociatedDiseases.setText("No registered foliar/vascular pathogens for this crop yet.");
                }
            }

            @Override
            public void onFailure(Call<List<DiseaseDto>> call, Throwable t) {
                cropDetailProgressBar.setVisibility(View.GONE);
                tvAssociatedDiseases.setText("Failed to load plant diseases.");
            }
        });
    }
}

