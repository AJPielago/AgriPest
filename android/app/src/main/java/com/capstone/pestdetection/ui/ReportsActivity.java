package com.capstone.pestdetection.ui;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.widget.ArrayAdapter;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.FileProvider;
import androidx.drawerlayout.widget.DrawerLayout;

import com.capstone.pestdetection.R;
import com.capstone.pestdetection.models.CropDto;
import com.capstone.pestdetection.models.DashboardStatsDto;
import com.capstone.pestdetection.models.DetectionListResponse;
import com.capstone.pestdetection.models.DetectionResponse;
import com.capstone.pestdetection.network.ApiClient;
import com.capstone.pestdetection.network.ApiService;
import com.google.android.material.appbar.MaterialToolbar;
import com.google.android.material.button.MaterialButton;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ReportsActivity extends BaseActivity {

    private TextView tvReportTotalScans, tvReportCriticalCount, tvReportAvgConf;
    private Spinner spinnerReportType, spinnerReportCrop, spinnerReportTimeframe;
    private MaterialButton btnExportCSV;

    private List<DetectionResponse> detectionRecords = new ArrayList<>();
    private List<CropDto> cropList = new ArrayList<>();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_reports);

        MaterialToolbar toolbar = findViewById(R.id.reportsToolbar);
        DrawerLayout drawerLayout = findViewById(R.id.drawer_layout);
        NavigationDrawerHelper.setupDrawer(this, drawerLayout, toolbar, R.id.nav_reports);

        tvReportTotalScans = findViewById(R.id.tvReportTotalScans);
        tvReportCriticalCount = findViewById(R.id.tvReportCriticalCount);
        tvReportAvgConf = findViewById(R.id.tvReportAvgConf);

        spinnerReportType = findViewById(R.id.spinnerReportType);
        spinnerReportCrop = findViewById(R.id.spinnerReportCrop);
        spinnerReportTimeframe = findViewById(R.id.spinnerReportTimeframe);
        btnExportCSV = findViewById(R.id.btnExportCSV);

        findViewById(R.id.btnNavNotifications).setOnClickListener(v -> {
            startActivity(new Intent(ReportsActivity.this, NotificationsActivity.class));
        });

        setupSpinners();
        loadTelemetryData();

        btnExportCSV.setOnClickListener(v -> exportDataToCSV());
    }

    private void setupSpinners() {
        String[] reportTypes = {
                "Executive Surveillance Summary",
                "Pest Outbreak Audit Report",
                "Host Crop Health & Telemetry"
        };
        ArrayAdapter<String> typeAdapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, reportTypes);
        spinnerReportType.setAdapter(typeAdapter);

        String[] timeframes = {
                "All Historic Data",
                "Last 30 Days",
                "Last 7 Days"
        };
        ArrayAdapter<String> timeAdapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, timeframes);
        spinnerReportTimeframe.setAdapter(timeAdapter);

        List<String> defaultCrops = new ArrayList<>();
        defaultCrops.add("All Leafy Green Crops");
        defaultCrops.add("Lettuce (Lactuca sativa)");
        defaultCrops.add("Bok Choy (Brassica rapa)");
        defaultCrops.add("Mustard Greens (Brassica juncea)");
        ArrayAdapter<String> cropAdapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, defaultCrops);
        spinnerReportCrop.setAdapter(cropAdapter);
    }

    private void loadTelemetryData() {
        ApiService apiService = ApiClient.getApiService(this);

        apiService.getDashboardStats().enqueue(new Callback<DashboardStatsDto>() {
            @Override
            public void onResponse(Call<DashboardStatsDto> call, Response<DashboardStatsDto> response) {
                if (response.isSuccessful() && response.body() != null) {
                    DashboardStatsDto stats = response.body();
                    tvReportTotalScans.setText(String.valueOf(stats.getTotalDetections()));
                    tvReportAvgConf.setText(String.format("%.0f%%", stats.getAvgConfidence() * 100));
                }
            }

            @Override
            public void onFailure(Call<DashboardStatsDto> call, Throwable t) {}
        });

        apiService.getDetections(0, 100, null).enqueue(new Callback<DetectionListResponse>() {
            @Override
            public void onResponse(Call<DetectionListResponse> call, Response<DetectionListResponse> response) {
                if (response.isSuccessful() && response.body() != null) {
                    detectionRecords = response.body().getItems();
                    if (detectionRecords != null) {
                        int criticals = 0;
                        for (DetectionResponse d : detectionRecords) {
                            if ("Critical".equalsIgnoreCase(d.getSeverity()) || "High".equalsIgnoreCase(d.getSeverity())) {
                                criticals++;
                            }
                        }
                        tvReportCriticalCount.setText(String.valueOf(criticals));
                    }
                }
            }

            @Override
            public void onFailure(Call<DetectionListResponse> call, Throwable t) {}
        });
    }

    private void exportDataToCSV() {
        if (detectionRecords == null || detectionRecords.isEmpty()) {
            Toast.makeText(this, getString(R.string.no_records_export), Toast.LENGTH_SHORT).show();
            return;
        }

        try {
            File exportDir = new File(getExternalFilesDir(null), "reports");
            if (!exportDir.exists()) exportDir.mkdirs();

            String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(new Date());
            File csvFile = new File(exportDir, "AgriMonitor_Report_" + timeStamp + ".csv");

            FileWriter writer = new FileWriter(csvFile);
            writer.append("ID,Detected_Pest,Crop_Name,Confidence,Severity,Location,Weather,Timestamp\n");

            for (DetectionResponse d : detectionRecords) {
                writer.append(String.valueOf(d.getId())).append(",");
                writer.append("\"").append(d.getDetectedPestName() != null ? d.getDetectedPestName() : "Unknown").append("\",");
                writer.append("\"").append(d.getCropName() != null ? d.getCropName() : "N/A").append("\",");
                writer.append(String.format(Locale.US, "%.2f%%", d.getConfidenceScore() * 100)).append(",");
                writer.append("\"").append(d.getSeverity() != null ? d.getSeverity() : "N/A").append("\",");
                writer.append("\"").append(d.getFieldLocation() != null ? d.getFieldLocation() : "Plot A1").append("\",");
                writer.append("\"").append(d.getWeatherCondition() != null ? d.getWeatherCondition() : "Sunny").append("\",");
                writer.append("\"").append(d.getCreatedAt() != null ? d.getCreatedAt() : "").append("\"\n");
            }
            writer.flush();
            writer.close();

            Uri fileUri = FileProvider.getUriForFile(this, "com.capstone.pestdetection.fileprovider", csvFile);
            Intent sendIntent = new Intent(Intent.ACTION_SEND);
            sendIntent.setType("text/csv");
            sendIntent.putExtra(Intent.EXTRA_SUBJECT, "AgriMonitor Diagnostic Report");
            sendIntent.putExtra(Intent.EXTRA_STREAM, fileUri);
            sendIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            startActivity(Intent.createChooser(sendIntent, "Share Analytical Report"));

        } catch (IOException e) {
            Toast.makeText(this, getString(R.string.export_error, e.getMessage()), Toast.LENGTH_SHORT).show();
        }
    }
}
