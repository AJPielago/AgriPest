package com.capstone.pestdetection.ui;

import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;
import androidx.drawerlayout.widget.DrawerLayout;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import com.capstone.pestdetection.R;
import com.capstone.pestdetection.models.DetectionListResponse;
import com.capstone.pestdetection.models.DetectionResponse;
import com.capstone.pestdetection.network.ApiClient;
import com.capstone.pestdetection.network.ApiService;
import com.google.android.material.appbar.MaterialToolbar;
import com.google.android.material.card.MaterialCardView;

import java.util.ArrayList;
import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class NotificationsActivity extends AppCompatActivity {

    private RecyclerView rvNotifications;
    private SwipeRefreshLayout swipeRefresh;
    private ProgressBar progressBar;
    private NotificationsAdapter adapter;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_notifications);

        MaterialToolbar toolbar = findViewById(R.id.notificationsToolbar);
        DrawerLayout drawerLayout = findViewById(R.id.drawer_layout);
        NavigationDrawerHelper.setupDrawer(this, drawerLayout, toolbar, R.id.nav_notifications);

        rvNotifications = findViewById(R.id.rvNotifications);
        swipeRefresh = findViewById(R.id.swipeRefreshNotifications);
        progressBar = findViewById(R.id.notificationsProgressBar);

        rvNotifications.setLayoutManager(new LinearLayoutManager(this));
        adapter = new NotificationsAdapter(item -> {
            Intent intent = new Intent(NotificationsActivity.this, DetectionResultActivity.class);
            intent.putExtra("DETECTION_RESULT", item);
            startActivity(intent);
        });
        rvNotifications.setAdapter(adapter);

        swipeRefresh.setOnRefreshListener(this::loadNotifications);
        findViewById(R.id.btnMarkAllRead).setOnClickListener(v -> {
            Toast.makeText(this, "All notifications marked as read", Toast.LENGTH_SHORT).show();
        });

        loadNotifications();
    }

    private void loadNotifications() {
        progressBar.setVisibility(View.VISIBLE);
        ApiService apiService = ApiClient.getApiService(this);
        apiService.getDetections(0, 30, null).enqueue(new Callback<DetectionListResponse>() {
            @Override
            public void onResponse(Call<DetectionListResponse> call, Response<DetectionListResponse> response) {
                progressBar.setVisibility(View.GONE);
                swipeRefresh.setRefreshing(false);
                if (response.isSuccessful() && response.body() != null) {
                    List<DetectionResponse> items = response.body().getItems();
                    adapter.setItems(items != null ? items : new ArrayList<>());
                }
            }

            @Override
            public void onFailure(Call<DetectionListResponse> call, Throwable t) {
                progressBar.setVisibility(View.GONE);
                swipeRefresh.setRefreshing(false);
            }
        });
    }

    private static class NotificationsAdapter extends RecyclerView.Adapter<NotificationsAdapter.ViewHolder> {
        private final List<DetectionResponse> items = new ArrayList<>();
        private final OnItemClickListener listener;

        interface OnItemClickListener {
            void onClick(DetectionResponse item);
        }

        NotificationsAdapter(OnItemClickListener listener) {
            this.listener = listener;
        }

        void setItems(List<DetectionResponse> newItems) {
            items.clear();
            if (newItems != null) items.addAll(newItems);
            notifyDataSetChanged();
        }

        @NonNull
        @Override
        public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_notification, parent, false);
            return new ViewHolder(v);
        }

        @Override
        public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
            DetectionResponse item = items.get(position);
            boolean isCritical = "Critical".equalsIgnoreCase(item.getSeverity()) || "High".equalsIgnoreCase(item.getSeverity());

            holder.tvNotifTitle.setText((item.getDetectedPestName() != null ? item.getDetectedPestName() : "Pest") + " Alert (" + (item.getSeverity() != null ? item.getSeverity() : "Active") + ")");
            String dateStr = item.getCreatedAt() != null ? item.getCreatedAt().replace("T", " ").substring(0, Math.min(16, item.getCreatedAt().length())) : "Recent";
            holder.tvNotifTime.setText(dateStr);

            String host = item.getCropName() != null ? item.getCropName() : "Host Crop";
            String rec = item.getRecommendedAction() != null ? item.getRecommendedAction() : "Targeted field protocol recommended.";
            holder.tvNotifMessage.setText("Incident recorded on " + host + " in " + (item.getFieldLocation() != null ? item.getFieldLocation() : "Field #1") + ". " + rec);

            if (isCritical) {
                holder.card.setStrokeColor(ContextCompat.getColor(holder.itemView.getContext(), R.color.error));
                holder.frameIcon.setBackgroundResource(R.drawable.bg_badge_error);
                holder.ivIcon.setImageResource(R.drawable.ic_bug_report);
                holder.ivIcon.setColorFilter(ContextCompat.getColor(holder.itemView.getContext(), R.color.error));
            } else {
                holder.card.setStrokeColor(ContextCompat.getColor(holder.itemView.getContext(), R.color.outline_variant));
                holder.frameIcon.setBackgroundResource(R.drawable.bg_badge_neutral);
                holder.ivIcon.setImageResource(R.drawable.ic_check_circle);
                holder.ivIcon.setColorFilter(ContextCompat.getColor(holder.itemView.getContext(), R.color.primary));
            }

            holder.itemView.setOnClickListener(v -> listener.onClick(item));
        }

        @Override
        public int getItemCount() {
            return items.size();
        }

        static class ViewHolder extends RecyclerView.ViewHolder {
            MaterialCardView card;
            FrameLayout frameIcon;
            ImageView ivIcon;
            TextView tvNotifTitle, tvNotifTime, tvNotifMessage, tvNotifActionHint;

            ViewHolder(@NonNull View itemView) {
                super(itemView);
                card = (MaterialCardView) itemView;
                frameIcon = itemView.findViewById(R.id.frameNotifIcon);
                ivIcon = itemView.findViewById(R.id.ivNotifIcon);
                tvNotifTitle = itemView.findViewById(R.id.tvNotifTitle);
                tvNotifTime = itemView.findViewById(R.id.tvNotifTime);
                tvNotifMessage = itemView.findViewById(R.id.tvNotifMessage);
                tvNotifActionHint = itemView.findViewById(R.id.tvNotifActionHint);
            }
        }
    }
}
