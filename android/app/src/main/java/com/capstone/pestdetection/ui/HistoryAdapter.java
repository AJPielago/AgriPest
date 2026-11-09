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
import com.google.android.material.card.MaterialCardView;

import java.util.ArrayList;
import java.util.List;

public class HistoryAdapter extends RecyclerView.Adapter<HistoryAdapter.ViewHolder> {

    public interface OnItemClickListener {
        void onItemClick(DetectionResponse item);
        default void onItemLongClick(DetectionResponse item) {}
    }

    private final Context context;
    private final List<DetectionResponse> items = new ArrayList<>();
    private final OnItemClickListener listener;
    private final SessionManager sessionManager;

    public HistoryAdapter(Context context, OnItemClickListener listener) {
        this.context = context;
        this.listener = listener;
        this.sessionManager = new SessionManager(context);
    }

    public void setItems(List<DetectionResponse> newItems) {
        this.items.clear();
        if (newItems != null) {
            this.items.addAll(newItems);
        }
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(context).inflate(R.layout.item_history, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        DetectionResponse item = items.get(position);

        holder.tvPestName.setText(item.getDetectedPestName() != null ? item.getDetectedPestName() : "Pest Detected");

        String crop = item.getCropName() != null ? item.getCropName() : context.getString(R.string.crop_cabbage_default);
        String location = item.getFieldLocation() != null ? item.getFieldLocation() : "Field #1";
        holder.tvCropName.setText(context.getString(R.string.host_crop_tag) + ": " + crop + " • " + location);

        String dateStr = item.getCreatedAt() != null ? item.getCreatedAt().replace("T", " ").substring(0, Math.min(16, item.getCreatedAt().length())) : "Recent";
        holder.tvDate.setText(dateStr);

        String severity = item.getSeverity() != null ? item.getSeverity() : "Low";
        String severityKey = severity.toLowerCase();
        String localizedSeverity;
        if (severityKey.contains("crit")) {
            localizedSeverity = context.getString(R.string.risk_critical);
        } else if (severityKey.contains("high")) {
            localizedSeverity = context.getString(R.string.risk_high);
        } else if (severityKey.contains("mod")) {
            localizedSeverity = context.getString(R.string.risk_moderate);
        } else {
            localizedSeverity = context.getString(R.string.risk_low);
        }
        holder.tvSeverity.setText(localizedSeverity);

        boolean isHighRisk = "Critical".equalsIgnoreCase(severity) || "High".equalsIgnoreCase(severity);
        if (isHighRisk) {
            holder.card.setStrokeColor(ContextCompat.getColor(context, R.color.error));
            holder.tvSeverity.setBackgroundResource(R.drawable.bg_badge_error);
            holder.tvSeverity.setTextColor(ContextCompat.getColor(context, R.color.error));
        } else {
            holder.card.setStrokeColor(ContextCompat.getColor(context, R.color.outline_variant));
            holder.tvSeverity.setBackgroundResource(R.drawable.bg_badge_neutral);
            holder.tvSeverity.setTextColor(ContextCompat.getColor(context, R.color.outline));
        }

        // Construct complete image URL
        String imageUrl = item.getImagePath();
        if (imageUrl != null && !imageUrl.isEmpty()) {
            if (!imageUrl.startsWith("http")) {
                String baseUrl = sessionManager.getBaseUrl();
                if (baseUrl.endsWith("/") && imageUrl.startsWith("/")) {
                    imageUrl = baseUrl.substring(0, baseUrl.length() - 1) + imageUrl;
                } else {
                    imageUrl = baseUrl + imageUrl;
                }
            }
            Glide.with(context)
                    .load(imageUrl)
                    .placeholder(R.drawable.bg_card_stitch)
                    .error(R.drawable.ic_bug_report)
                    .into(holder.ivThumbnail);
        } else {
            holder.ivThumbnail.setImageResource(R.drawable.ic_bug_report);
        }

        holder.itemView.setOnClickListener(v -> {
            if (listener != null) listener.onItemClick(item);
        });

        holder.itemView.setOnLongClickListener(v -> {
            if (listener != null) listener.onItemLongClick(item);
            return true;
        });
    }

    @Override
    public int getItemCount() {
        return items.size();
    }

    static class ViewHolder extends RecyclerView.ViewHolder {
        MaterialCardView card;
        ImageView ivThumbnail;
        TextView tvPestName, tvCropName, tvDate, tvSeverity;

        ViewHolder(@NonNull View itemView) {
            super(itemView);
            card = (MaterialCardView) itemView;
            ivThumbnail = itemView.findViewById(R.id.ivHistoryThumbnail);
            tvPestName = itemView.findViewById(R.id.tvHistoryPestName);
            tvCropName = itemView.findViewById(R.id.tvHistoryCropName);
            tvDate = itemView.findViewById(R.id.tvHistoryDate);
            tvSeverity = itemView.findViewById(R.id.tvHistorySeverity);
        }
    }
}
