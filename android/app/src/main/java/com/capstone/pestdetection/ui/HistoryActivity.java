package com.capstone.pestdetection.ui;

import android.content.Intent;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.View;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.drawerlayout.widget.DrawerLayout;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import com.capstone.pestdetection.R;
import com.capstone.pestdetection.models.DetectionListResponse;
import com.capstone.pestdetection.models.DetectionResponse;
import com.capstone.pestdetection.network.ApiClient;
import com.capstone.pestdetection.network.ApiService;
import com.capstone.pestdetection.network.SessionManager;
import com.google.android.material.appbar.MaterialToolbar;
import com.google.android.material.button.MaterialButton;

import java.util.ArrayList;
import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class HistoryActivity extends BaseActivity {

    private SwipeRefreshLayout swipeRefresh;
    private RecyclerView rvHistory;
    private LinearLayout layoutEmpty, layoutError;
    private TextView tvErrorMessage;
    private ProgressBar historyProgressBar;
    private EditText etSearchHistory;

    private HistoryAdapter adapter;
    private List<DetectionResponse> fullHistoryList = new ArrayList<>();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_history);

        MaterialToolbar toolbar = findViewById(R.id.historyToolbar);
        DrawerLayout drawerLayout = findViewById(R.id.drawer_layout);
        NavigationDrawerHelper.setupDrawer(this, drawerLayout, toolbar, R.id.nav_history);

        swipeRefresh = findViewById(R.id.swipeRefresh);
        rvHistory = findViewById(R.id.rvHistory);
        layoutEmpty = findViewById(R.id.layoutEmpty);
        layoutError = findViewById(R.id.layoutError);
        tvErrorMessage = findViewById(R.id.tvErrorMessage);
        historyProgressBar = findViewById(R.id.historyProgressBar);
        etSearchHistory = findViewById(R.id.etSearchHistory);
        MaterialButton btnRetryHistory = findViewById(R.id.btnRetryHistory);

        rvHistory.setLayoutManager(new LinearLayoutManager(this));
        adapter = new HistoryAdapter(this, new HistoryAdapter.OnItemClickListener() {
            @Override
            public void onItemClick(DetectionResponse item) {
                Intent intent = new Intent(HistoryActivity.this, DetectionResultActivity.class);
                intent.putExtra("DETECTION_RESULT", item);
                startActivity(intent);
            }

            @Override
            public void onItemLongClick(DetectionResponse item) {
                confirmDeleteDetection(item);
            }
        });
        rvHistory.setAdapter(adapter);

        findViewById(R.id.btnNavNotifications).setOnClickListener(v -> {
            startActivity(new Intent(HistoryActivity.this, NotificationsActivity.class));
        });

        findViewById(R.id.btnCompareDetections).setOnClickListener(v -> {
            if (fullHistoryList.size() < 2) {
                Toast.makeText(this, "Need at least 2 inspection reports to compare.", Toast.LENGTH_SHORT).show();
                return;
            }
            showCompareDialog(fullHistoryList.get(0), fullHistoryList.get(1));
        });

        swipeRefresh.setOnRefreshListener(this::fetchHistoryFromBackend);
        btnRetryHistory.setOnClickListener(v -> fetchHistoryFromBackend());

        etSearchHistory.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {
            }

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                filterHistory(s.toString());
            }

            @Override
            public void afterTextChanged(Editable s) {
            }
        });

        fetchHistoryFromBackend();
    }

    private void fetchHistoryFromBackend() {
        setViewState(ViewState.LOADING);

        ApiService apiService = ApiClient.getApiService(this);
        apiService.getDetections(0, 100, null).enqueue(new Callback<DetectionListResponse>() {
            @Override
            public void onResponse(Call<DetectionListResponse> call, Response<DetectionListResponse> response) {
                swipeRefresh.setRefreshing(false);
                if (response.isSuccessful() && response.body() != null) {
                    DetectionListResponse res = response.body();
                    if (res.getItems() != null && !res.getItems().isEmpty()) {
                        fullHistoryList = res.getItems();
                        adapter.setItems(fullHistoryList);
                        setViewState(ViewState.CONTENT);
                    } else {
                        setViewState(ViewState.EMPTY);
                    }
                } else {
                    if (response.code() == 401) {
                        Toast.makeText(HistoryActivity.this, getString(R.string.session_expired), Toast.LENGTH_LONG)
                                .show();
                        finish();
                    } else {
                        tvErrorMessage.setText(getString(R.string.load_failed_code, response.code()));
                        setViewState(ViewState.ERROR);
                    }
                }
            }

            @Override
            public void onFailure(Call<DetectionListResponse> call, Throwable t) {
                swipeRefresh.setRefreshing(false);
                tvErrorMessage.setText(getString(R.string.network_error_generic, t.getLocalizedMessage()));
                setViewState(ViewState.ERROR);
            }
        });
    }

    private void filterHistory(String query) {
        if (query == null || query.trim().isEmpty()) {
            adapter.setItems(fullHistoryList);
            setViewState(fullHistoryList.isEmpty() ? ViewState.EMPTY : ViewState.CONTENT);
            return;
        }

        String lower = query.toLowerCase().trim();
        List<DetectionResponse> filtered = new ArrayList<>();
        for (DetectionResponse d : fullHistoryList) {
            boolean matchPest = d.getDetectedPestName() != null
                    && d.getDetectedPestName().toLowerCase().contains(lower);
            boolean matchCrop = d.getCropName() != null && d.getCropName().toLowerCase().contains(lower);
            boolean matchLoc = d.getFieldLocation() != null && d.getFieldLocation().toLowerCase().contains(lower);
            boolean matchSev = d.getSeverity() != null && d.getSeverity().toLowerCase().contains(lower);
            if (matchPest || matchCrop || matchLoc || matchSev) {
                filtered.add(d);
            }
        }
        adapter.setItems(filtered);
        setViewState(filtered.isEmpty() ? ViewState.EMPTY : ViewState.CONTENT);
    }

    private void showCompareDialog(DetectionResponse rec1, DetectionResponse rec2) {
        View dialogView = android.view.LayoutInflater.from(this).inflate(R.layout.dialog_detection_compare, null);
        androidx.appcompat.app.AlertDialog dialog = new androidx.appcompat.app.AlertDialog.Builder(this)
                .setView(dialogView)
                .create();

        SessionManager sm = new SessionManager(this);

        ImageView iv1 = dialogView.findViewById(R.id.ivCompare1);
        TextView tvId1 = dialogView.findViewById(R.id.tvCompareId1);
        TextView tvPest1 = dialogView.findViewById(R.id.tvComparePest1);
        TextView tvDis1 = dialogView.findViewById(R.id.tvCompareDisease1);
        TextView tvCrop1 = dialogView.findViewById(R.id.tvCompareCrop1);
        TextView tvConf1 = dialogView.findViewById(R.id.tvCompareConf1);
        TextView tvSev1 = dialogView.findViewById(R.id.tvCompareSeverity1);

        tvId1.setText("Report #" + rec1.getId());
        tvPest1.setText(rec1.getDetectedPestName() != null ? rec1.getDetectedPestName() : "Pest Detected");
        if (rec1.getDetectedDiseaseName() != null && !rec1.getDetectedDiseaseName().isEmpty()) {
            tvDis1.setVisibility(View.VISIBLE);
            tvDis1.setText("Disease: " + rec1.getDetectedDiseaseName());
        }
        tvCrop1.setText("Crop: " + (rec1.getCropName() != null ? rec1.getCropName() : "Unspecified"));
        tvConf1.setText("Certainty: " + Math.round(rec1.getConfidenceScore() * 100) + "%");
        tvSev1.setText(rec1.getSeverity() != null ? rec1.getSeverity().toUpperCase() : "MODERATE");

        loadImage(sm, rec1.getImagePath(), iv1);

        ImageView iv2 = dialogView.findViewById(R.id.ivCompare2);
        TextView tvId2 = dialogView.findViewById(R.id.tvCompareId2);
        TextView tvPest2 = dialogView.findViewById(R.id.tvComparePest2);
        TextView tvDis2 = dialogView.findViewById(R.id.tvCompareDisease2);
        TextView tvCrop2 = dialogView.findViewById(R.id.tvCompareCrop2);
        TextView tvConf2 = dialogView.findViewById(R.id.tvCompareConf2);
        TextView tvSev2 = dialogView.findViewById(R.id.tvCompareSeverity2);

        tvId2.setText("Report #" + rec2.getId());
        tvPest2.setText(rec2.getDetectedPestName() != null ? rec2.getDetectedPestName() : "Pest Detected");
        if (rec2.getDetectedDiseaseName() != null && !rec2.getDetectedDiseaseName().isEmpty()) {
            tvDis2.setVisibility(View.VISIBLE);
            tvDis2.setText("Disease: " + rec2.getDetectedDiseaseName());
        }
        tvCrop2.setText("Crop: " + (rec2.getCropName() != null ? rec2.getCropName() : "Unspecified"));
        tvConf2.setText("Certainty: " + Math.round(rec2.getConfidenceScore() * 100) + "%");
        tvSev2.setText(rec2.getSeverity() != null ? rec2.getSeverity().toUpperCase() : "MODERATE");

        loadImage(sm, rec2.getImagePath(), iv2);

        dialogView.findViewById(R.id.btnCloseCompare).setOnClickListener(v -> dialog.dismiss());
        dialog.show();
    }

    private void loadImage(SessionManager sm, String path, ImageView iv) {
        if (path != null && !path.isEmpty()) {
            String url = path;
            if (!url.startsWith("http")) {
                String baseUrl = sm.getBaseUrl();
                url = baseUrl.endsWith("/") ? baseUrl + (url.startsWith("/") ? url.substring(1) : url)
                        : baseUrl + "/" + url;
            }
            com.bumptech.glide.Glide.with(this).load(url).placeholder(R.drawable.bg_card_stitch).into(iv);
        }
    }

    private void confirmDeleteDetection(DetectionResponse item) {
        new androidx.appcompat.app.AlertDialog.Builder(this)
                .setTitle(getString(R.string.delete))
                .setMessage(getString(R.string.confirm_delete_history))
                .setPositiveButton(getString(R.string.delete), (dialog, which) -> {
                    ApiService apiService = ApiClient.getApiService(this);
                    apiService.deleteDetection(item.getId()).enqueue(new Callback<okhttp3.ResponseBody>() {
                        @Override
                        public void onResponse(Call<okhttp3.ResponseBody> call,
                                Response<okhttp3.ResponseBody> response) {
                            if (response.isSuccessful()) {
                                Toast.makeText(HistoryActivity.this, getString(R.string.record_deleted),
                                        Toast.LENGTH_SHORT).show();
                                fetchHistoryFromBackend();
                            } else {
                                Toast.makeText(HistoryActivity.this, getString(R.string.record_delete_failed),
                                        Toast.LENGTH_SHORT).show();
                            }
                        }

                        @Override
                        public void onFailure(Call<okhttp3.ResponseBody> call, Throwable t) {
                            Toast.makeText(HistoryActivity.this,
                                    getString(R.string.network_error_generic, t.getLocalizedMessage()),
                                    Toast.LENGTH_SHORT).show();
                        }
                    });
                })
                .setNegativeButton(getString(R.string.cancel), null)
                .show();
    }

    private enum ViewState {
        LOADING, CONTENT, EMPTY, ERROR
    }

    private void setViewState(ViewState state) {
        historyProgressBar.setVisibility(state == ViewState.LOADING ? View.VISIBLE : View.GONE);
        rvHistory.setVisibility(state == ViewState.CONTENT ? View.VISIBLE : View.GONE);
        layoutEmpty.setVisibility(state == ViewState.EMPTY ? View.VISIBLE : View.GONE);
        layoutError.setVisibility(state == ViewState.ERROR ? View.VISIBLE : View.GONE);
    }
}
