package com.capstone.pestdetection.ui;

import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.EditText;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.drawerlayout.widget.DrawerLayout;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import com.capstone.pestdetection.R;
import com.capstone.pestdetection.models.DiseaseDto;
import com.capstone.pestdetection.network.ApiClient;
import com.capstone.pestdetection.network.ApiService;
import com.capstone.pestdetection.utils.LocaleHelper;
import com.google.android.material.appbar.MaterialToolbar;

import java.util.ArrayList;
import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class DiseaseLibraryActivity extends BaseActivity {

    private RecyclerView rvDiseaseLibrary;
    private ProgressBar diseaseProgressBar;
    private SwipeRefreshLayout swipeRefreshDiseases;
    private EditText etSearchDisease;
    private DiseaseAdapter adapter;
    private final List<DiseaseDto> allDiseases = new ArrayList<>();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_disease_library);

        MaterialToolbar toolbar = findViewById(R.id.diseaseLibraryToolbar);
        DrawerLayout drawerLayout = findViewById(R.id.drawer_layout);
        NavigationDrawerHelper.setupDrawer(this, drawerLayout, toolbar, R.id.nav_diseases);

        rvDiseaseLibrary = findViewById(R.id.rvDiseaseLibrary);
        diseaseProgressBar = findViewById(R.id.diseaseProgressBar);
        swipeRefreshDiseases = findViewById(R.id.swipeRefreshDiseases);
        etSearchDisease = findViewById(R.id.etSearchDisease);

        rvDiseaseLibrary.setLayoutManager(new LinearLayoutManager(this));
        adapter = new DiseaseAdapter(LocaleHelper.getLanguage(this));
        rvDiseaseLibrary.setAdapter(adapter);

        swipeRefreshDiseases.setOnRefreshListener(this::loadDiseaseCatalog);

        etSearchDisease.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                filterDiseases(s.toString());
            }

            @Override
            public void afterTextChanged(Editable s) {}
        });

        loadDiseaseCatalog();
    }

    private void loadDiseaseCatalog() {
        diseaseProgressBar.setVisibility(View.VISIBLE);
        ApiService apiService = ApiClient.getApiService(this);
        apiService.getDiseases(null, null).enqueue(new Callback<List<DiseaseDto>>() {
            @Override
            public void onResponse(Call<List<DiseaseDto>> call, Response<List<DiseaseDto>> response) {
                diseaseProgressBar.setVisibility(View.GONE);
                swipeRefreshDiseases.setRefreshing(false);
                if (response.isSuccessful() && response.body() != null) {
                    allDiseases.clear();
                    allDiseases.addAll(response.body());
                    filterDiseases(etSearchDisease.getText().toString());
                } else {
                    Toast.makeText(DiseaseLibraryActivity.this, "Failed to load plant disease catalog.", Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(Call<List<DiseaseDto>> call, Throwable t) {
                diseaseProgressBar.setVisibility(View.GONE);
                swipeRefreshDiseases.setRefreshing(false);
                Toast.makeText(DiseaseLibraryActivity.this, "Network error: " + t.getLocalizedMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void filterDiseases(String query) {
        if (query == null || query.trim().isEmpty()) {
            adapter.setDiseases(allDiseases);
            return;
        }
        String lowerQuery = query.toLowerCase().trim();
        List<DiseaseDto> filtered = new ArrayList<>();
        for (DiseaseDto d : allDiseases) {
            boolean matchName = d.getName() != null && d.getName().toLowerCase().contains(lowerQuery);
            boolean matchNameTl = d.getNameTl() != null && d.getNameTl().toLowerCase().contains(lowerQuery);
            boolean matchSci = d.getScientificName() != null && d.getScientificName().toLowerCase().contains(lowerQuery);
            boolean matchPath = d.getPathogenType() != null && d.getPathogenType().toLowerCase().contains(lowerQuery);
            boolean matchSym = d.getSymptoms() != null && d.getSymptoms().toLowerCase().contains(lowerQuery);
            if (matchName || matchNameTl || matchSci || matchPath || matchSym) {
                filtered.add(d);
            }
        }
        adapter.setDiseases(filtered);
    }

    private static class DiseaseAdapter extends RecyclerView.Adapter<DiseaseAdapter.DiseaseViewHolder> {
        private final List<DiseaseDto> diseases = new ArrayList<>();
        private final String lang;

        DiseaseAdapter(String lang) {
            this.lang = lang;
        }

        void setDiseases(List<DiseaseDto> newDiseases) {
            this.diseases.clear();
            if (newDiseases != null) {
                this.diseases.addAll(newDiseases);
            }
            notifyDataSetChanged();
        }

        @NonNull
        @Override
        public DiseaseViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_disease, parent, false);
            return new DiseaseViewHolder(view);
        }

        @Override
        public void onBindViewHolder(@NonNull DiseaseViewHolder holder, int position) {
            DiseaseDto disease = diseases.get(position);

            boolean isTl = "tl".equalsIgnoreCase(lang);
            String title = (isTl && disease.getNameTl() != null && !disease.getNameTl().isEmpty())
                    ? disease.getNameTl()
                    : disease.getName();

            holder.tvDiseaseTitle.setText(title != null ? title : "Unknown Disease");
            holder.tvDiseasePathogenBadge.setText(disease.getPathogenType().toUpperCase());
            holder.tvDiseaseScientific.setText(disease.getScientificName() != null ? disease.getScientificName() : "Plant Pathogen");

            String symptoms = (isTl && disease.getSymptomsTl() != null) ? disease.getSymptomsTl() : disease.getSymptoms();
            if (symptoms != null && !symptoms.isEmpty()) {
                holder.tvDiseaseSymptoms.setVisibility(View.VISIBLE);
                holder.tvDiseaseSymptoms.setText("Symptoms: " + symptoms);
            } else {
                holder.tvDiseaseSymptoms.setVisibility(View.GONE);
            }

            String desc = (isTl && disease.getDescriptionTl() != null) ? disease.getDescriptionTl() : disease.getDescription();
            if (desc != null && !desc.isEmpty()) {
                holder.tvDiseaseDescription.setVisibility(View.VISIBLE);
                holder.tvDiseaseDescription.setText(desc);
            } else {
                holder.tvDiseaseDescription.setVisibility(View.GONE);
            }

            // Recommendations
            if (disease.getRecommendations() != null && !disease.getRecommendations().isEmpty()) {
                StringBuilder recText = new StringBuilder();
                for (DiseaseDto.DiseaseRecommendationDto r : disease.getRecommendations()) {
                    String actionTitle = (isTl && r.getActionTitleTl() != null) ? r.getActionTitleTl() : r.getActionTitle();
                    String actionDesc = (isTl && r.getDescriptionTl() != null) ? r.getDescriptionTl() : r.getDescription();
                    if (recText.length() > 0) recText.append("\n\n");
                    recText.append("• ").append(actionTitle).append(" (").append(r.getManagementType()).append("):\n  ").append(actionDesc);
                }
                holder.tvDiseaseRecommendationText.setVisibility(View.VISIBLE);
                holder.tvDiseaseRecommendationText.setText(recText.toString());
                holder.tvDiseaseRecommendationsHeader.setVisibility(View.VISIBLE);
                holder.dividerRecs.setVisibility(View.VISIBLE);
            } else {
                holder.tvDiseaseRecommendationText.setVisibility(View.GONE);
                holder.tvDiseaseRecommendationsHeader.setVisibility(View.GONE);
                holder.dividerRecs.setVisibility(View.GONE);
            }
        }

        @Override
        public int getItemCount() {
            return diseases.size();
        }

        static class DiseaseViewHolder extends RecyclerView.ViewHolder {
            TextView tvDiseaseTitle, tvDiseasePathogenBadge, tvDiseaseScientific;
            TextView tvDiseaseSymptoms, tvDiseaseDescription;
            TextView tvDiseaseRecommendationsHeader, tvDiseaseRecommendationText;
            View dividerRecs;

            DiseaseViewHolder(@NonNull View itemView) {
                super(itemView);
                tvDiseaseTitle = itemView.findViewById(R.id.tvDiseaseTitle);
                tvDiseasePathogenBadge = itemView.findViewById(R.id.tvDiseasePathogenBadge);
                tvDiseaseScientific = itemView.findViewById(R.id.tvDiseaseScientific);
                tvDiseaseSymptoms = itemView.findViewById(R.id.tvDiseaseSymptoms);
                tvDiseaseDescription = itemView.findViewById(R.id.tvDiseaseDescription);
                tvDiseaseRecommendationsHeader = itemView.findViewById(R.id.tvDiseaseRecommendationsHeader);
                tvDiseaseRecommendationText = itemView.findViewById(R.id.tvDiseaseRecommendationText);
                dividerRecs = itemView.findViewById(R.id.dividerRecs);
            }
        }
    }
}

