package com.capstone.pestdetection.ui;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AlertDialog;
import androidx.drawerlayout.widget.DrawerLayout;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.capstone.pestdetection.R;
import com.capstone.pestdetection.models.DiseaseDto;
import com.capstone.pestdetection.network.ApiClient;
import com.capstone.pestdetection.network.ApiService;
import com.google.android.material.appbar.MaterialToolbar;
import com.google.android.material.floatingactionbutton.ExtendedFloatingActionButton;

import java.util.ArrayList;
import java.util.List;

import okhttp3.ResponseBody;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ManageDiseasesActivity extends BaseActivity {

    private RecyclerView rvManageDiseases;
    private ProgressBar manageDiseasesProgressBar;
    private ExtendedFloatingActionButton fabAddDisease;
    private ManageDiseaseAdapter adapter;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_manage_diseases);

        MaterialToolbar toolbar = findViewById(R.id.manageDiseasesToolbar);
        DrawerLayout drawerLayout = findViewById(R.id.drawer_layout);
        NavigationDrawerHelper.setupDrawer(this, drawerLayout, toolbar, R.id.nav_admin_dashboard);

        rvManageDiseases = findViewById(R.id.rvManageDiseases);
        manageDiseasesProgressBar = findViewById(R.id.manageDiseasesProgressBar);
        fabAddDisease = findViewById(R.id.fabAddDisease);

        rvManageDiseases.setLayoutManager(new LinearLayoutManager(this));
        adapter = new ManageDiseaseAdapter(this::confirmDeleteDisease);
        rvManageDiseases.setAdapter(adapter);

        fabAddDisease.setOnClickListener(v -> showAddDiseaseDialog());

        loadDiseases();
    }

    private void loadDiseases() {
        manageDiseasesProgressBar.setVisibility(View.VISIBLE);
        ApiService apiService = ApiClient.getApiService(this);
        apiService.getDiseases(null, null).enqueue(new Callback<List<DiseaseDto>>() {
            @Override
            public void onResponse(Call<List<DiseaseDto>> call, Response<List<DiseaseDto>> response) {
                manageDiseasesProgressBar.setVisibility(View.GONE);
                if (response.isSuccessful() && response.body() != null) {
                    adapter.setDiseases(response.body());
                } else {
                    Toast.makeText(ManageDiseasesActivity.this, "Failed to load diseases.", Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(Call<List<DiseaseDto>> call, Throwable t) {
                manageDiseasesProgressBar.setVisibility(View.GONE);
                Toast.makeText(ManageDiseasesActivity.this, "Network error: " + t.getLocalizedMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void showAddDiseaseDialog() {
        View dialogView = LayoutInflater.from(this).inflate(android.R.layout.select_dialog_item, null);
        
        android.widget.LinearLayout layout = new android.widget.LinearLayout(this);
        layout.setOrientation(android.widget.LinearLayout.VERTICAL);
        layout.setPadding(48, 24, 48, 24);

        final EditText etName = new EditText(this);
        etName.setHint("Disease Common Name (e.g. Bacterial Wilt)");
        layout.addView(etName);

        final EditText etSci = new EditText(this);
        etSci.setHint("Scientific Name (e.g. Ralstonia solanacearum)");
        layout.addView(etSci);

        final Spinner spinnerPathogen = new Spinner(this);
        ArrayAdapter<String> pathogenAdapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item,
                new String[]{"Fungal", "Bacterial", "Viral", "Oomycete", "Nematode"});
        spinnerPathogen.setAdapter(pathogenAdapter);
        layout.addView(spinnerPathogen);

        final EditText etSymptoms = new EditText(this);
        etSymptoms.setHint("Identified Symptoms");
        layout.addView(etSymptoms);

        final EditText etDesc = new EditText(this);
        etDesc.setHint("Management / Pathology notes");
        layout.addView(etDesc);

        new AlertDialog.Builder(this)
                .setTitle("Register New Crop Disease")
                .setView(layout)
                .setPositiveButton("Create", (dialog, which) -> {
                    String name = etName.getText().toString().trim();
                    if (name.isEmpty()) {
                        Toast.makeText(this, "Disease name is required.", Toast.LENGTH_SHORT).show();
                        return;
                    }
                    DiseaseDto newDisease = new DiseaseDto();
                    newDisease.setName(name);
                    newDisease.setScientificName(etSci.getText().toString().trim());
                    newDisease.setPathogenType((String) spinnerPathogen.getSelectedItem());
                    newDisease.setSymptoms(etSymptoms.getText().toString().trim());
                    newDisease.setDescription(etDesc.getText().toString().trim());
                    newDisease.setSeverityDefault("Moderate");

                    createDiseaseOnServer(newDisease);
                })
                .setNegativeButton("Cancel", null)
                .show();
    }

    private void createDiseaseOnServer(DiseaseDto disease) {
        manageDiseasesProgressBar.setVisibility(View.VISIBLE);
        ApiService apiService = ApiClient.getApiService(this);
        apiService.createDisease(disease).enqueue(new Callback<DiseaseDto>() {
            @Override
            public void onResponse(Call<DiseaseDto> call, Response<DiseaseDto> response) {
                manageDiseasesProgressBar.setVisibility(View.GONE);
                if (response.isSuccessful()) {
                    Toast.makeText(ManageDiseasesActivity.this, "Disease created successfully!", Toast.LENGTH_SHORT).show();
                    loadDiseases();
                } else {
                    Toast.makeText(ManageDiseasesActivity.this, "Failed to create disease (" + response.code() + ").", Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(Call<DiseaseDto> call, Throwable t) {
                manageDiseasesProgressBar.setVisibility(View.GONE);
                Toast.makeText(ManageDiseasesActivity.this, "Error: " + t.getLocalizedMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void confirmDeleteDisease(DiseaseDto disease) {
        new AlertDialog.Builder(this)
                .setTitle("Delete Disease")
                .setMessage("Are you sure you want to remove '" + disease.getName() + "' from the system?")
                .setPositiveButton("Delete", (dialog, which) -> {
                    ApiService apiService = ApiClient.getApiService(this);
                    apiService.deleteDisease(disease.getId()).enqueue(new Callback<ResponseBody>() {
                        @Override
                        public void onResponse(Call<ResponseBody> call, Response<ResponseBody> response) {
                            if (response.isSuccessful()) {
                                Toast.makeText(ManageDiseasesActivity.this, "Disease deleted.", Toast.LENGTH_SHORT).show();
                                loadDiseases();
                            } else {
                                Toast.makeText(ManageDiseasesActivity.this, "Failed to delete disease.", Toast.LENGTH_SHORT).show();
                            }
                        }

                        @Override
                        public void onFailure(Call<ResponseBody> call, Throwable t) {
                            Toast.makeText(ManageDiseasesActivity.this, "Error: " + t.getLocalizedMessage(), Toast.LENGTH_SHORT).show();
                        }
                    });
                })
                .setNegativeButton("Cancel", null)
                .show();
    }

    interface OnDeleteClickListener {
        void onDelete(DiseaseDto disease);
    }

    private static class ManageDiseaseAdapter extends RecyclerView.Adapter<ManageDiseaseAdapter.ViewHolder> {
        private final List<DiseaseDto> list = new ArrayList<>();
        private final OnDeleteClickListener deleteListener;

        ManageDiseaseAdapter(OnDeleteClickListener deleteListener) {
            this.deleteListener = deleteListener;
        }

        void setDiseases(List<DiseaseDto> newList) {
            list.clear();
            if (newList != null) list.addAll(newList);
            notifyDataSetChanged();
        }

        @NonNull
        @Override
        public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_manage_disease, parent, false);
            return new ViewHolder(v);
        }

        @Override
        public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
            DiseaseDto item = list.get(position);
            holder.tvTitle.setText(item.getName());
            holder.tvSci.setText(item.getScientificName() != null ? item.getScientificName() : "Species unmapped");
            holder.tvPathogen.setText(item.getPathogenType().toUpperCase());
            holder.tvSymptoms.setText(item.getSymptoms() != null ? item.getSymptoms() : (item.getDescription() != null ? item.getDescription() : "No details recorded."));
            holder.btnDelete.setOnClickListener(v -> deleteListener.onDelete(item));
        }

        @Override
        public int getItemCount() {
            return list.size();
        }

        static class ViewHolder extends RecyclerView.ViewHolder {
            TextView tvTitle, tvSci, tvPathogen, tvSymptoms;
            ImageView btnDelete;

            ViewHolder(@NonNull View v) {
                super(v);
                tvTitle = v.findViewById(R.id.tvManageDiseaseTitle);
                tvSci = v.findViewById(R.id.tvManageDiseaseScientific);
                tvPathogen = v.findViewById(R.id.tvManageDiseasePathogen);
                tvSymptoms = v.findViewById(R.id.tvManageDiseaseSymptoms);
                btnDelete = v.findViewById(R.id.btnDeleteDisease);
            }
        }
    }
}

