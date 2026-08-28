package com.capstone.pestdetection.models;

import com.google.gson.annotations.SerializedName;

public class DashboardStatsDto {
    @SerializedName("total_detections")
    private int totalDetections;

    @SerializedName("recent_detections_count")
    private int recentDetectionsCount;

    @SerializedName("avg_confidence")
    private double avgConfidence;

    @SerializedName("detection_mode")
    private String detectionMode;

    public int getTotalDetections() {
        return totalDetections;
    }

    public int getRecentDetectionsCount() {
        return recentDetectionsCount;
    }

    public double getAvgConfidence() {
        return avgConfidence;
    }

    public String getDetectionMode() {
        return detectionMode;
    }
}
