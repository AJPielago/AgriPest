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

public class PestLibraryActivity extends BaseActivity {

    private RecyclerView rvPestLibrary;
    private ProgressBar pestProgressBar;
    private PestAdapter adapter;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_pest_library);

        MaterialToolbar toolbar = findViewById(R.id.pestLibraryToolbar);
        DrawerLayout drawerLayout = findViewById(R.id.drawer_layout);
        NavigationDrawerHelper.setupDrawer(this, drawerLayout, toolbar, R.id.nav_pests);

        rvPestLibrary = findViewById(R.id.rvPestLibrary);
        pestProgressBar = findViewById(R.id.pestProgressBar);

        rvPestLibrary.setLayoutManager(new LinearLayoutManager(this));
        adapter = new PestAdapter();
        rvPestLibrary.setAdapter(adapter);

        loadPestCatalog();
    }

    private void loadPestCatalog() {
        pestProgressBar.setVisibility(View.VISIBLE);
        ApiService apiService = ApiClient.getApiService(this);
        apiService.getPests(null).enqueue(new Callback<List<PestDto>>() {
            @Override
            public void onResponse(Call<List<PestDto>> call, Response<List<PestDto>> response) {
                pestProgressBar.setVisibility(View.GONE);
                if (response.isSuccessful() && response.body() != null) {
                    adapter.setPests(response.body());
                } else {
                    Toast.makeText(PestLibraryActivity.this, getString(R.string.load_pest_catalog_failed), Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(Call<List<PestDto>> call, Throwable t) {
                pestProgressBar.setVisibility(View.GONE);
                Toast.makeText(PestLibraryActivity.this, getString(R.string.network_error_generic, t.getLocalizedMessage()), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private static class PestAdapter extends RecyclerView.Adapter<PestAdapter.PestViewHolder> {
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
            holder.tvPestTitle.setText(pest.getName() != null ? pest.getName() : "Unknown Pest");
            holder.tvPestScientific.setText(pest.getScientificName() != null ? pest.getScientificName() : "Species unmapped");
            holder.tvPestDescription.setText(pest.getDescription() != null ? pest.getDescription() : (pest.getSymptoms() != null ? pest.getSymptoms() : "No details provided."));
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
