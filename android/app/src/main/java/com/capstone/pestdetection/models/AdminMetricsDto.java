package com.capstone.pestdetection.models;

import com.google.gson.annotations.SerializedName;

public class AdminMetricsDto {
    @SerializedName("total_users")
    private int totalUsers;

    @SerializedName("total_crops")
    private int totalCrops;

    @SerializedName("total_pests")
    private int totalPests;

    @SerializedName("total_detections")
    private int totalDetections;

    @SerializedName("detection_mode")
    private String detectionMode;

    public int getTotalUsers() { return totalUsers; }
    public int getTotalCrops() { return totalCrops; }
    public int getTotalPests() { return totalPests; }
    public int getTotalDetections() { return totalDetections; }
    public String getDetectionMode() { return detectionMode; }
}
