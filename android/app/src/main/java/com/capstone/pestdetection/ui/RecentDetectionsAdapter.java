package com.capstone.pestdetection.ui;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.RecyclerView;

import com.bumptech.glide.Glide;
import com.capstone.pestdetection.R;
import com.capstone.pestdetection.models.DetectionResponse;
import com.capstone.pestdetection.network.SessionManager;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.card.MaterialCardView;

import java.util.ArrayList;
import java.util.List;

public class RecentDetectionsAdapter extends RecyclerView.Adapter<RecentDetectionsAdapter.ViewHolder> {

    private final Context context;
    private final List<DetectionResponse> items = new ArrayList<>();
    private final OnItemClickListener listener;
    private final String baseUrl;

    public interface OnItemClickListener {
        void onItemClick(DetectionResponse item);
    }

    public RecentDetectionsAdapter(Context context, OnItemClickListener listener) {
        this.context = context;
        this.listener = listener;
        SessionManager sessionManager = new SessionManager(context);
        this.baseUrl = sessionManager.getBaseUrl();
    }

    public void setItems(List<DetectionResponse> newItems) {
        items.clear();
        if (newItems != null) {
            items.addAll(newItems);
        }
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_recent_detection_card, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        DetectionResponse item = items.get(position);

        String pestName = item.getDetectedPestName() != null ? item.getDetectedPestName() : context.getString(R.string.pest_detected_default);
        String cropName = item.getCropName() != null ? item.getCropName() : context.getString(R.string.crop_cabbage_default);
        holder.tvRecentPestName.setText(context.getString(R.string.recent_pest_on_crop, pestName, cropName));

        String location = item.getFieldLocation() != null ? item.getFieldLocation() : context.getString(R.string.default_sector_location);
        holder.tvRecentLocation.setText(location);

        String dateStr = item.getCreatedAt() != null ? item.getCreatedAt().replace("T", " ").substring(0, Math.min(16, item.getCreatedAt().length())) : context.getString(R.string.time_recent);
        holder.tvRecentDate.setText(context.getString(R.string.detected_prefix, dateStr));

        String severity = item.getSeverity() != null ? item.getSeverity() : "Low";
        String displaySeverity;
        if ("Critical".equalsIgnoreCase(severity)) {
            displaySeverity = context.getString(R.string.severity_critical);
        } else if ("High".equalsIgnoreCase(severity)) {
            displaySeverity = context.getString(R.string.severity_high);
        } else if ("Moderate".equalsIgnoreCase(severity)) {
            displaySeverity = context.getString(R.string.severity_moderate);
        } else {
            displaySeverity = context.getString(R.string.severity_low);
        }
        holder.tvRecentSeverityBadge.setText(displaySeverity);

        boolean isHighRisk = "Critical".equalsIgnoreCase(severity) || "High".equalsIgnoreCase(severity);
        if (isHighRisk) {
            holder.card.setStrokeColor(ContextCompat.getColor(context, R.color.error));
            holder.tvRecentSeverityBadge.setBackgroundResource(R.drawable.bg_badge_error);
            holder.tvRecentSeverityBadge.setTextColor(ContextCompat.getColor(context, R.color.error));
        } else {
            holder.card.setStrokeColor(ContextCompat.getColor(context, R.color.outline_variant));
            holder.tvRecentSeverityBadge.setBackgroundResource(R.drawable.bg_badge_neutral);
            holder.tvRecentSeverityBadge.setTextColor(ContextCompat.getColor(context, R.color.outline));
        }

        String imagePath = item.getImagePath();
        if (imagePath != null && !imagePath.isEmpty()) {
            String fullImageUrl = imagePath.startsWith("http") ? imagePath : (baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl) + (imagePath.startsWith("/") ? imagePath : "/" + imagePath);
            Glide.with(context)
                    .load(fullImageUrl)
                    .placeholder(R.drawable.bg_card_stitch)
                    .error(R.drawable.ic_bug_report)
                    .into(holder.ivRecentPestThumb);
        } else {
            holder.ivRecentPestThumb.setImageResource(R.drawable.ic_bug_report);
        }

        View.OnClickListener clickListener = v -> {
            if (listener != null) listener.onItemClick(item);
        };
        holder.itemView.setOnClickListener(clickListener);
        holder.btnViewRecentDetails.setOnClickListener(clickListener);
    }

    @Override
    public int getItemCount() {
        return items.size();
    }

    static class ViewHolder extends RecyclerView.ViewHolder {
        MaterialCardView card;
        ImageView ivRecentPestThumb;
        TextView tvRecentPestName, tvRecentSeverityBadge, tvRecentLocation, tvRecentDate;
        MaterialButton btnViewRecentDetails;

        ViewHolder(@NonNull View itemView) {
            super(itemView);
            card = (MaterialCardView) itemView;
            ivRecentPestThumb = itemView.findViewById(R.id.ivRecentPestThumb);
            tvRecentPestName = itemView.findViewById(R.id.tvRecentPestName);
            tvRecentSeverityBadge = itemView.findViewById(R.id.tvRecentSeverityBadge);
            tvRecentLocation = itemView.findViewById(R.id.tvRecentLocation);
            tvRecentDate = itemView.findViewById(R.id.tvRecentDate);
            btnViewRecentDetails = itemView.findViewById(R.id.btnViewRecentDetails);
        }
    }
}
