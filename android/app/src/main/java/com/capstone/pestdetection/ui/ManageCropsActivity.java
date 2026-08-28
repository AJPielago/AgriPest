package com.capstone.pestdetection.ui;

import android.content.Intent;
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
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.drawerlayout.widget.DrawerLayout;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import com.capstone.pestdetection.R;
import com.capstone.pestdetection.models.CropDto;
import com.capstone.pestdetection.network.ApiClient;
import com.capstone.pestdetection.network.ApiService;
import com.google.android.material.appbar.MaterialToolbar;

import java.util.ArrayList;
import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ManageCropsActivity extends AppCompatActivity {

    private RecyclerView rvManageCrops;
    private SwipeRefreshLayout swipeRefresh;
    private ProgressBar cropsProgressBar;
    private EditText etSearchCrops;
    private CropAdapter adapter;

    private List<CropDto> fullCropsList = new ArrayList<>();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_manage_crops);

        MaterialToolbar toolbar = findViewById(R.id.cropsToolbar);
        DrawerLayout drawerLayout = findViewById(R.id.drawer_layout);
        NavigationDrawerHelper.setupDrawer(this, drawerLayout, toolbar, R.id.nav_crops);

        rvManageCrops = findViewById(R.id.rvManageCrops);
        swipeRefresh = findViewById(R.id.swipeRefreshCrops);
        cropsProgressBar = findViewById(R.id.cropsProgressBar);
        etSearchCrops = findViewById(R.id.etSearchCrops);

        rvManageCrops.setLayoutManager(new LinearLayoutManager(this));
        adapter = new CropAdapter();
        rvManageCrops.setAdapter(adapter);

        findViewById(R.id.btnNavNotifications).setOnClickListener(v -> {
            startActivity(new Intent(ManageCropsActivity.this, NotificationsActivity.class));
        });

        findViewById(R.id.btnAddCrop).setOnClickListener(v -> showAddCropDialog());

        swipeRefresh.setOnRefreshListener(this::loadCrops);

        etSearchCrops.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                filterCrops(s.toString());
            }

            @Override
            public void afterTextChanged(Editable s) {}
        });

        loadCrops();
    }

    private void loadCrops() {
        cropsProgressBar.setVisibility(View.VISIBLE);
        ApiService apiService = ApiClient.getApiService(this);
        apiService.getAllCrops().enqueue(new Callback<List<CropDto>>() {
            @Override
            public void onResponse(Call<List<CropDto>> call, Response<List<CropDto>> response) {
                cropsProgressBar.setVisibility(View.GONE);
                swipeRefresh.setRefreshing(false);
                if (response.isSuccessful() && response.body() != null) {
                    fullCropsList = response.body();
                    adapter.setCrops(fullCropsList);
                } else {
                    Toast.makeText(ManageCropsActivity.this, "Failed to load crops (" + response.code() + ")", Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(Call<List<CropDto>> call, Throwable t) {
                cropsProgressBar.setVisibility(View.GONE);
                swipeRefresh.setRefreshing(false);
                Toast.makeText(ManageCropsActivity.this, "Network error: " + t.getLocalizedMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void filterCrops(String query) {
        if (query == null || query.trim().isEmpty()) {
            adapter.setCrops(fullCropsList);
            return;
        }

        String lower = query.toLowerCase().trim();
        List<CropDto> filtered = new ArrayList<>();
        for (CropDto c : fullCropsList) {
            boolean matchName = c.getName() != null && c.getName().toLowerCase().contains(lower);
            boolean matchSci = c.getScientificName() != null && c.getScientificName().toLowerCase().contains(lower);
            if (matchName || matchSci) {
                filtered.add(c);
            }
        }
        adapter.setCrops(filtered);
    }

    private void showAddCropDialog() {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("Register New Crop");

        View dialogView = LayoutInflater.from(this).inflate(R.layout.item_crop, null);
        final EditText etName = new EditText(this);
        etName.setHint("Crop Name (e.g. Tomato)");
        builder.setView(etName);

        builder.setPositiveButton("Register", (dialog, which) -> {
            String name = etName.getText().toString().trim();
            if (!name.isEmpty()) {
                Toast.makeText(this, "Crop registered successfully", Toast.LENGTH_SHORT).show();
                loadCrops();
            }
        });
        builder.setNegativeButton("Cancel", (dialog, which) -> dialog.cancel());
        builder.show();
    }

    private static class CropAdapter extends RecyclerView.Adapter<CropAdapter.CropViewHolder> {
        private final List<CropDto> crops = new ArrayList<>();

        void setCrops(List<CropDto> newCrops) {
            this.crops.clear();
            if (newCrops != null) {
                this.crops.addAll(newCrops);
            }
            notifyDataSetChanged();
        }

        @NonNull
        @Override
        public CropViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_crop, parent, false);
            return new CropViewHolder(view);
        }

        @Override
        public void onBindViewHolder(@NonNull CropViewHolder holder, int position) {
            CropDto crop = crops.get(position);
            holder.tvCropItemName.setText(crop.getName() != null ? crop.getName() : "Crop #" + crop.getId());
            holder.tvCropItemScientific.setText(crop.getScientificName() != null ? crop.getScientificName() : "Cultivated Crop Specimen");
            String statusStr = crop.getStatus() != null ? crop.getStatus().toUpperCase() : "ACTIVE";
            holder.tvCropItemStatus.setText(statusStr);
            holder.tvCropItemDesc.setText(crop.getDescription() != null ? crop.getDescription() : "Active field plot monitoring");
        }

        @Override
        public int getItemCount() {
            return crops.size();
        }

        static class CropViewHolder extends RecyclerView.ViewHolder {
            TextView tvCropItemName, tvCropItemScientific, tvCropItemStatus, tvCropItemDesc;

            CropViewHolder(@NonNull View itemView) {
                super(itemView);
                tvCropItemName = itemView.findViewById(R.id.tvCropItemName);
                tvCropItemScientific = itemView.findViewById(R.id.tvCropItemScientific);
                tvCropItemStatus = itemView.findViewById(R.id.tvCropItemStatus);
                tvCropItemDesc = itemView.findViewById(R.id.tvCropItemDesc);
            }
        }
    }
}
