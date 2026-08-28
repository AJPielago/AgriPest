package com.capstone.pestdetection.models;

import com.google.gson.annotations.SerializedName;
import java.util.List;

public class LiveCheckResponse {
    @SerializedName("detected")
    private boolean detected;

    @SerializedName("crop_recognized")
    private boolean cropRecognized;

    @SerializedName("pest_detected")
    private boolean pestDetected;

    @SerializedName("confidence")
    private double confidence;

    @SerializedName("auto_trigger")
    private boolean autoTrigger;

    @SerializedName("message")
    private String message;

    @SerializedName("bounding_boxes")
    private List<BoundingBoxDto> boundingBoxes;

    public boolean isDetected() { return detected; }
    public boolean isCropRecognized() { return cropRecognized; }
    public boolean isPestDetected() { return pestDetected; }
    public double getConfidence() { return confidence; }
    public boolean isAutoTrigger() { return autoTrigger; }
    public String getMessage() { return message; }
    public List<BoundingBoxDto> getBoundingBoxes() { return boundingBoxes; }
}
