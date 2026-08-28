package com.capstone.pestdetection.ui;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.drawerlayout.widget.DrawerLayout;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.capstone.pestdetection.R;
import com.capstone.pestdetection.models.AuditLogDto;
import com.capstone.pestdetection.network.ApiClient;
import com.capstone.pestdetection.network.ApiService;
import com.google.android.material.appbar.MaterialToolbar;

import java.util.ArrayList;
import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class AuditLogsActivity extends AppCompatActivity {

    private RecyclerView rvAuditLogs;
    private ProgressBar auditProgressBar;
    private AuditLogAdapter adapter;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_audit_logs);

        MaterialToolbar toolbar = findViewById(R.id.auditLogsToolbar);
        DrawerLayout drawerLayout = findViewById(R.id.drawer_layout);
        NavigationDrawerHelper.setupDrawer(this, drawerLayout, toolbar, R.id.nav_admin_audit);

        rvAuditLogs = findViewById(R.id.rvAuditLogs);
        auditProgressBar = findViewById(R.id.auditProgressBar);

        rvAuditLogs.setLayoutManager(new LinearLayoutManager(this));
        adapter = new AuditLogAdapter();
        rvAuditLogs.setAdapter(adapter);

        loadAuditLogs();
    }

    private void loadAuditLogs() {
        auditProgressBar.setVisibility(View.VISIBLE);
        ApiService apiService = ApiClient.getApiService(this);
        apiService.getAuditLogs(0, 50).enqueue(new Callback<AuditLogDto.AuditLogListResponse>() {
            @Override
            public void onResponse(Call<AuditLogDto.AuditLogListResponse> call, Response<AuditLogDto.AuditLogListResponse> response) {
                auditProgressBar.setVisibility(View.GONE);
                if (response.isSuccessful() && response.body() != null && response.body().getItems() != null) {
                    adapter.setLogs(response.body().getItems());
                } else {
                    Toast.makeText(AuditLogsActivity.this, "Failed to load audit logs", Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(Call<AuditLogDto.AuditLogListResponse> call, Throwable t) {
                auditProgressBar.setVisibility(View.GONE);
                Toast.makeText(AuditLogsActivity.this, "Network error: " + t.getLocalizedMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private static class AuditLogAdapter extends RecyclerView.Adapter<AuditLogAdapter.AuditViewHolder> {
        private final List<AuditLogDto> logs = new ArrayList<>();

        void setLogs(List<AuditLogDto> newLogs) {
            this.logs.clear();
            if (newLogs != null) {
                this.logs.addAll(newLogs);
            }
            notifyDataSetChanged();
        }

        @NonNull
        @Override
        public AuditViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_audit_log, parent, false);
            return new AuditViewHolder(view);
        }

        @Override
        public void onBindViewHolder(@NonNull AuditViewHolder holder, int position) {
            AuditLogDto log = logs.get(position);
            holder.tvAuditAction.setText(log.getAction() != null ? log.getAction() : "SYSTEM_LOG");
            holder.tvAuditUser.setText(log.getUserName() != null ? log.getUserName() : "System");
            holder.tvAuditDetails.setText(log.getDetails() != null ? log.getDetails() : "No additional log metadata");
            String dateStr = log.getCreatedAt() != null ? log.getCreatedAt().replace("T", " ").substring(0, Math.min(16, log.getCreatedAt().length())) : "";
            holder.tvAuditDate.setText(dateStr);
        }

        @Override
        public int getItemCount() {
            return logs.size();
        }

        static class AuditViewHolder extends RecyclerView.ViewHolder {
            TextView tvAuditAction, tvAuditUser, tvAuditDetails, tvAuditDate;

            AuditViewHolder(@NonNull View itemView) {
                super(itemView);
                tvAuditAction = itemView.findViewById(R.id.tvAuditAction);
                tvAuditUser = itemView.findViewById(R.id.tvAuditUser);
                tvAuditDetails = itemView.findViewById(R.id.tvAuditDetails);
                tvAuditDate = itemView.findViewById(R.id.tvAuditDate);
            }
        }
    }
}
