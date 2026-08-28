package com.capstone.pestdetection.models;

import com.google.gson.annotations.SerializedName;
import java.io.Serializable;

public class BoundingBoxDto implements Serializable {
    @SerializedName("x_min")
    private float xMin;

    @SerializedName("y_min")
    private float yMin;

    @SerializedName("x_max")
    private float xMax;

    @SerializedName("y_max")
    private float yMax;

    @SerializedName("label")
    private String label;

    @SerializedName("confidence")
    private float confidence;

    public float getXMin() { return xMin; }
    public float getYMin() { return yMin; }
    public float getXMax() { return xMax; }
    public float getYMax() { return yMax; }
    public String getLabel() { return label; }
    public float getConfidence() { return confidence; }
}
