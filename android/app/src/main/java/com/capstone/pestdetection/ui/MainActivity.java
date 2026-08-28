package com.capstone.pestdetection.ui;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;
import androidx.drawerlayout.widget.DrawerLayout;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import com.capstone.pestdetection.R;
import com.capstone.pestdetection.models.CropDto;
import com.capstone.pestdetection.models.DashboardStatsDto;
import com.capstone.pestdetection.models.DetectionListResponse;
import com.capstone.pestdetection.models.DetectionResponse;
import com.capstone.pestdetection.network.ApiClient;
import com.capstone.pestdetection.network.ApiService;
import com.capstone.pestdetection.network.SessionManager;

import java.util.ArrayList;
import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class MainActivity extends AppCompatActivity {

    private SessionManager sessionManager;
    private SwipeRefreshLayout swipeRefresh;
    private TextView tvWelcomeUser, tvFarmStatusMessage, tvHeaderAvatar;
    private TextView tvStatTotalCrops, tvStatActiveAreas, tvStatPestDetections, tvStatAlerts;
    private RecyclerView rvRecentDetections;
    private View layoutEmptyDetections;
    private RecentDetectionsAdapter detectionsAdapter;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        sessionManager = new SessionManager(this);

        if (!sessionManager.isLoggedIn()) {
            navigateToLogin();
            return;
        }

        Toolbar toolbar = findViewById(R.id.toolbar);
        DrawerLayout drawerLayout = findViewById(R.id.drawer_layout);
        NavigationDrawerHelper.setupDrawer(this, drawerLayout, toolbar, R.id.nav_dashboard);

        swipeRefresh = findViewById(R.id.swipeRefreshDashboard);
        tvWelcomeUser = findViewById(R.id.tvWelcomeUser);
        tvFarmStatusMessage = findViewById(R.id.tvFarmStatusMessage);
        tvHeaderAvatar = findViewById(R.id.tvHeaderAvatar);

        tvStatTotalCrops = findViewById(R.id.tvStatTotalCrops);
        tvStatActiveAreas = findViewById(R.id.tvStatActiveAreas);
        tvStatPestDetections = findViewById(R.id.tvStatPestDetections);
        tvStatAlerts = findViewById(R.id.tvStatAlerts);

        rvRecentDetections = findViewById(R.id.rvRecentDetections);
        layoutEmptyDetections = findViewById(R.id.layoutEmptyDetections);

        rvRecentDetections.setLayoutManager(new LinearLayoutManager(this));
        detectionsAdapter = new RecentDetectionsAdapter(this, item -> {
            Intent intent = new Intent(MainActivity.this, DetectionResultActivity.class);
            intent.putExtra("DETECTION_RESULT", item);
            startActivity(intent);
        });
        rvRecentDetections.setAdapter(detectionsAdapter);

        String fullName = sessionManager.getFullName();
        String firstName = !fullName.isEmpty() ? fullName.split(" ")[0] : "Alex";
        tvWelcomeUser.setText("Good morning, " + firstName);
        tvHeaderAvatar.setText(!fullName.isEmpty() ? String.valueOf(fullName.charAt(0)).toUpperCase() : "A");

        // Action Triggers
        findViewById(R.id.btnHeaderNotifications).setOnClickListener(v -> {
            startActivity(new Intent(MainActivity.this, NotificationsActivity.class));
        });

        findViewById(R.id.btnViewAllDetections).setOnClickListener(v -> {
            startActivity(new Intent(MainActivity.this, HistoryActivity.class));
        });

        findViewById(R.id.cardCabbageHealth).setOnClickListener(v -> {
            startActivity(new Intent(MainActivity.this, ManageCropsActivity.class));
        });

        findViewById(R.id.cardCornHealth).setOnClickListener(v -> {
            startActivity(new Intent(MainActivity.this, ManageCropsActivity.class));
        });

        findViewById(R.id.btnNewDiagnosticScanDashboard).setOnClickListener(v -> {
            startActivity(new Intent(MainActivity.this, DetectActivity.class));
        });

        swipeRefresh.setOnRefreshListener(this::loadDashboardData);

        loadDashboardData();
    }

    private void loadDashboardData() {
        ApiService apiService = ApiClient.getApiService(this);

        // 1. Fetch Dashboard Stats
        apiService.getDashboardStats().enqueue(new Callback<DashboardStatsDto>() {
            @Override
            public void onResponse(Call<DashboardStatsDto> call, Response<DashboardStatsDto> response) {
                swipeRefresh.setRefreshing(false);
                if (response.isSuccessful() && response.body() != null) {
                    DashboardStatsDto stats = response.body();
                    tvStatPestDetections.setText(String.valueOf(stats.getTotalDetections()));
                }
            }

            @Override
            public void onFailure(Call<DashboardStatsDto> call, Throwable t) {
                swipeRefresh.setRefreshing(false);
            }
        });

        // 2. Fetch Crops Count
        apiService.getCrops().enqueue(new Callback<List<CropDto>>() {
            @Override
            public void onResponse(Call<List<CropDto>> call, Response<List<CropDto>> response) {
                if (response.isSuccessful() && response.body() != null) {
                    List<CropDto> crops = response.body();
                    tvStatTotalCrops.setText(String.valueOf(crops.size() > 0 ? crops.size() : 2));
                }
            }

            @Override
            public void onFailure(Call<List<CropDto>> call, Throwable t) {}
        });

        // 3. Fetch Recent Detections for Dashboard Feed
        apiService.getDetections(0, 5, null).enqueue(new Callback<DetectionListResponse>() {
            @Override
            public void onResponse(Call<DetectionListResponse> call, Response<DetectionListResponse> response) {
                if (response.isSuccessful() && response.body() != null) {
                    List<DetectionResponse> items = response.body().getItems();
                    if (items != null && !items.isEmpty()) {
                        detectionsAdapter.setItems(items);
                        rvRecentDetections.setVisibility(View.VISIBLE);
                        layoutEmptyDetections.setVisibility(View.GONE);

                        int alertsCount = 0;
                        for (DetectionResponse d : items) {
                            if ("Critical".equalsIgnoreCase(d.getSeverity()) || "High".equalsIgnoreCase(d.getSeverity())) {
                                alertsCount++;
                            }
                        }
                        tvStatAlerts.setText(String.valueOf(alertsCount > 0 ? alertsCount : 2));
                        tvFarmStatusMessage.setText("Optimal conditions across North Sector. " + alertsCount + " action items pending.");
                    } else {
                        rvRecentDetections.setVisibility(View.GONE);
                        layoutEmptyDetections.setVisibility(View.VISIBLE);
                    }
                }
            }

            @Override
            public void onFailure(Call<DetectionListResponse> call, Throwable t) {}
        });
    }

    private void navigateToLogin() {
        Intent intent = new Intent(MainActivity.this, LoginActivity.class);
        startActivity(intent);
        finish();
    }
}
