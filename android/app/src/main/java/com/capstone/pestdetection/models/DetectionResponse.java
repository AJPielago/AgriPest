package com.capstone.pestdetection.models;

import com.google.gson.annotations.SerializedName;
import java.io.Serializable;
import java.util.List;

public class DetectionResponse implements Serializable {
    @SerializedName("id")
    private int id;

    @SerializedName("user_id")
    private int userId;

    @SerializedName("crop_id")
    private Integer cropId;

    @SerializedName("pest_id")
    private Integer pestId;

    @SerializedName("image_path")
    private String imagePath;

    @SerializedName("confidence_score")
    private float confidenceScore;

    @SerializedName("severity")
    private String severity;

    @SerializedName("detected_pest_name")
    private String detectedPestName;

    @SerializedName("recommended_action")
    private String recommendedAction;

    @SerializedName("bounding_boxes")
    private List<BoundingBoxDto> boundingBoxes;

    @SerializedName("status")
    private String status;

    @SerializedName("created_at")
    private String createdAt;

    @SerializedName("crop_name")
    private String cropName;

    @SerializedName("scientific_name")
    private String scientificName;

    @SerializedName("pest_description")
    private String pestDescription;

    @SerializedName("weather_condition")
    private String weatherCondition;

    @SerializedName("field_location")
    private String fieldLocation;

    @SerializedName("detected_disease_name")
    private String detectedDiseaseName;

    @SerializedName("disease_scientific_name")
    private String diseaseScientificName;

    @SerializedName("disease_pathogen_type")
    private String diseasePathogenType;

    @SerializedName("disease_confidence_score")
    private Float diseaseConfidenceScore;

    @SerializedName("disease_severity")
    private String diseaseSeverity;

    @SerializedName("disease_symptoms")
    private String diseaseSymptoms;

    @SerializedName("disease_recommended_action")
    private String diseaseRecommendedAction;

    @SerializedName("feedback_accurate")
    private Boolean feedbackAccurate;

    @SerializedName("feedback_notes")
    private String feedbackNotes;

    public int getId() { return id; }
    public int getUserId() { return userId; }
    public Integer getCropId() { return cropId; }
    public Integer getPestId() { return pestId; }
    public String getImagePath() { return imagePath; }
    public float getConfidenceScore() { return confidenceScore; }
    public String getSeverity() { return severity; }
    public String getDetectedPestName() { return detectedPestName; }
    public String getRecommendedAction() { return recommendedAction; }
    public List<BoundingBoxDto> getBoundingBoxes() { return boundingBoxes; }
    public String getStatus() { return status; }
    public String getCreatedAt() { return createdAt; }
    public String getCropName() { return cropName; }
    public String getScientificName() { return scientificName; }
    public String getPestDescription() { return pestDescription; }
    public String getWeatherCondition() { return weatherCondition; }
    public String getFieldLocation() { return fieldLocation; }
    public String getDetectedDiseaseName() { return detectedDiseaseName; }
    public String getDiseaseScientificName() { return diseaseScientificName; }
    public String getDiseasePathogenType() { return diseasePathogenType; }
    public Float getDiseaseConfidenceScore() { return diseaseConfidenceScore; }
    public String getDiseaseSeverity() { return diseaseSeverity; }
    public String getDiseaseSymptoms() { return diseaseSymptoms; }
    public String getDiseaseRecommendedAction() { return diseaseRecommendedAction; }
    public Boolean getFeedbackAccurate() { return feedbackAccurate; }
    public String getFeedbackNotes() { return feedbackNotes; }
}
