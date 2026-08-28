package com.capstone.pestdetection.ui;

import android.content.Intent;
import android.os.Bundle;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;
import androidx.drawerlayout.widget.DrawerLayout;

import com.capstone.pestdetection.R;
import com.capstone.pestdetection.models.DashboardStatsDto;
import com.capstone.pestdetection.network.ApiClient;
import com.capstone.pestdetection.network.ApiService;
import com.google.android.material.appbar.MaterialToolbar;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class FarmMonitoringActivity extends AppCompatActivity {

    private TextView tvOverallCropHealth;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_farm_monitoring);

        MaterialToolbar toolbar = findViewById(R.id.monitoringToolbar);
        DrawerLayout drawerLayout = findViewById(R.id.drawer_layout);
        NavigationDrawerHelper.setupDrawer(this, drawerLayout, toolbar, R.id.nav_monitoring);

        tvOverallCropHealth = findViewById(R.id.tvOverallCropHealth);

        findViewById(R.id.btnNavNotifications).setOnClickListener(v -> {
            startActivity(new Intent(FarmMonitoringActivity.this, NotificationsActivity.class));
        });

        findViewById(R.id.btnNewDiagnosticScan).setOnClickListener(v -> {
            startActivity(new Intent(FarmMonitoringActivity.this, DetectActivity.class));
        });

        loadMonitoringTelemetry();
    }

    private void loadMonitoringTelemetry() {
        ApiService apiService = ApiClient.getApiService(this);
        apiService.getDashboardStats().enqueue(new Callback<DashboardStatsDto>() {
            @Override
            public void onResponse(Call<DashboardStatsDto> call, Response<DashboardStatsDto> response) {
                if (response.isSuccessful() && response.body() != null) {
                    DashboardStatsDto stats = response.body();
                    if (stats.getAvgConfidence() > 0) {
                        tvOverallCropHealth.setText(String.format("%.0f%%", stats.getAvgConfidence() * 100));
                    }
                }
            }

            @Override
            public void onFailure(Call<DashboardStatsDto> call, Throwable t) {
                // Keep default calculated values
            }
        });
    }
}
