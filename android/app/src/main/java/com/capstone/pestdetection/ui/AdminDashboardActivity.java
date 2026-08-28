package com.capstone.pestdetection.ui;

import android.os.Bundle;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.drawerlayout.widget.DrawerLayout;

import com.capstone.pestdetection.R;
import com.capstone.pestdetection.models.AdminMetricsDto;
import com.capstone.pestdetection.network.ApiClient;
import com.capstone.pestdetection.network.ApiService;
import com.google.android.material.appbar.MaterialToolbar;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class AdminDashboardActivity extends AppCompatActivity {

    private TextView tvAdminEngineMode, tvAdminTotalUsers, tvAdminTotalCrops, tvAdminTotalPests, tvAdminTotalDetections;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_admin_dashboard);

        MaterialToolbar toolbar = findViewById(R.id.adminToolbar);
        DrawerLayout drawerLayout = findViewById(R.id.drawer_layout);
        NavigationDrawerHelper.setupDrawer(this, drawerLayout, toolbar, R.id.nav_admin_dashboard);

        tvAdminEngineMode = findViewById(R.id.tvAdminEngineMode);
        tvAdminTotalUsers = findViewById(R.id.tvAdminTotalUsers);
        tvAdminTotalCrops = findViewById(R.id.tvAdminTotalCrops);
        tvAdminTotalPests = findViewById(R.id.tvAdminTotalPests);
        tvAdminTotalDetections = findViewById(R.id.tvAdminTotalDetections);

        findViewById(R.id.btnManageUsers).setOnClickListener(v -> {
            startActivity(new android.content.Intent(this, ManageUsersActivity.class));
        });

        findViewById(R.id.btnManageCrops).setOnClickListener(v -> {
            startActivity(new android.content.Intent(this, ManageCropsActivity.class));
        });

        findViewById(R.id.btnManagePests).setOnClickListener(v -> {
            startActivity(new android.content.Intent(this, ManagePestsActivity.class));
        });

        findViewById(R.id.btnViewAuditLogs).setOnClickListener(v -> {
            startActivity(new android.content.Intent(this, AuditLogsActivity.class));
        });

        loadMetrics();
    }

    private void loadMetrics() {
        ApiService apiService = ApiClient.getApiService(this);
        apiService.getAdminMetrics().enqueue(new Callback<AdminMetricsDto>() {
            @Override
            public void onResponse(Call<AdminMetricsDto> call, Response<AdminMetricsDto> response) {
                if (response.isSuccessful() && response.body() != null) {
                    AdminMetricsDto metrics = response.body();
                    tvAdminTotalUsers.setText(String.valueOf(metrics.getTotalUsers()));
                    tvAdminTotalCrops.setText(String.valueOf(metrics.getTotalCrops()));
                    tvAdminTotalPests.setText(String.valueOf(metrics.getTotalPests()));
                    tvAdminTotalDetections.setText(String.valueOf(metrics.getTotalDetections()));
                    tvAdminEngineMode.setText("Pest Inference Engine: " + metrics.getDetectionMode().toUpperCase() + " MODE");
                } else {
                    Toast.makeText(AdminDashboardActivity.this, "Failed to load admin metrics", Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(Call<AdminMetricsDto> call, Throwable t) {
                Toast.makeText(AdminDashboardActivity.this, "Network error: " + t.getLocalizedMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }
}
