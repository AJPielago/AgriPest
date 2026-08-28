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
import com.capstone.pestdetection.models.PestDto;
import com.capstone.pestdetection.network.ApiClient;
import com.capstone.pestdetection.network.ApiService;
import com.google.android.material.appbar.MaterialToolbar;

import java.util.ArrayList;
import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ManagePestsActivity extends AppCompatActivity {

    private RecyclerView rvManagePests;
    private ProgressBar managePestsProgressBar;
    private ManagePestAdapter adapter;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_manage_pests);

        MaterialToolbar toolbar = findViewById(R.id.managePestsToolbar);
        DrawerLayout drawerLayout = findViewById(R.id.drawer_layout);
        NavigationDrawerHelper.setupDrawer(this, drawerLayout, toolbar, R.id.nav_admin_pests);

        rvManagePests = findViewById(R.id.rvManagePests);
        managePestsProgressBar = findViewById(R.id.managePestsProgressBar);

        rvManagePests.setLayoutManager(new LinearLayoutManager(this));
        adapter = new ManagePestAdapter();
        rvManagePests.setAdapter(adapter);

        loadPests();
    }

    private void loadPests() {
        managePestsProgressBar.setVisibility(View.VISIBLE);
        ApiService apiService = ApiClient.getApiService(this);
        apiService.getPests(null).enqueue(new Callback<List<PestDto>>() {
            @Override
            public void onResponse(Call<List<PestDto>> call, Response<List<PestDto>> response) {
                managePestsProgressBar.setVisibility(View.GONE);
                if (response.isSuccessful() && response.body() != null) {
                    adapter.setPests(response.body());
                } else {
                    Toast.makeText(ManagePestsActivity.this, "Failed to load pest entries (" + response.code() + ")", Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(Call<List<PestDto>> call, Throwable t) {
                managePestsProgressBar.setVisibility(View.GONE);
                Toast.makeText(ManagePestsActivity.this, "Network error: " + t.getLocalizedMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private static class ManagePestAdapter extends RecyclerView.Adapter<ManagePestAdapter.PestViewHolder> {
        private final List<PestDto> pests = new ArrayList<>();

        void setPests(List<PestDto> newPests) {
            this.pests.clear();
            if (newPests != null) {
                this.pests.addAll(newPests);
            }
            notifyDataSetChanged();
        }

        @NonNull
        @Override
        public PestViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_pest, parent, false);
            return new PestViewHolder(view);
        }

        @Override
        public void onBindViewHolder(@NonNull PestViewHolder holder, int position) {
            PestDto pest = pests.get(position);
            holder.tvPestTitle.setText(pest.getName() != null ? pest.getName() : "Pest #" + pest.getId());
            holder.tvPestScientific.setText(pest.getScientificName() != null ? pest.getScientificName() : "Scientific name unmapped");
            holder.tvPestDescription.setText(pest.getDescription() != null ? pest.getDescription() : "No description");
            holder.tvPestSeverityBadge.setText(pest.getSeverityDefault() != null ? pest.getSeverityDefault().toUpperCase() : "MODERATE");
        }

        @Override
        public int getItemCount() {
            return pests.size();
        }

        static class PestViewHolder extends RecyclerView.ViewHolder {
            TextView tvPestTitle, tvPestScientific, tvPestDescription, tvPestSeverityBadge;

            PestViewHolder(@NonNull View itemView) {
                super(itemView);
                tvPestTitle = itemView.findViewById(R.id.tvPestTitle);
                tvPestScientific = itemView.findViewById(R.id.tvPestScientific);
                tvPestDescription = itemView.findViewById(R.id.tvPestDescription);
                tvPestSeverityBadge = itemView.findViewById(R.id.tvPestSeverityBadge);
            }
        }
    }
}
