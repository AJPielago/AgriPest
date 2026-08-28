package com.capstone.pestdetection.models;

import com.google.gson.annotations.SerializedName;
import java.util.List;

public class DetectionListResponse {
    @SerializedName("total")
    private int total;

    @SerializedName("items")
    private List<DetectionResponse> items;

    public int getTotal() { return total; }
    public List<DetectionResponse> getItems() { return items; }
}
