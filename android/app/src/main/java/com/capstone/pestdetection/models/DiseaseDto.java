package com.capstone.pestdetection.models;

import com.google.gson.annotations.SerializedName;
import java.io.Serializable;
import java.util.List;

public class DiseaseDto implements Serializable {
    @SerializedName("id")
    private int id;

    @SerializedName("name")
    private String name;

    @SerializedName("name_tl")
    private String nameTl;

    @SerializedName("scientific_name")
    private String scientificName;

    @SerializedName("pathogen_type")
    private String pathogenType;

    @SerializedName("description")
    private String description;

    @SerializedName("description_tl")
    private String descriptionTl;

    @SerializedName("symptoms")
    private String symptoms;

    @SerializedName("symptoms_tl")
    private String symptomsTl;

    @SerializedName("severity_default")
    private String severityDefault;

    @SerializedName("recommendations")
    private List<DiseaseRecommendationDto> recommendations;

    public int getId() { return id; }
    public String getName() { return name; }
    public String getNameTl() { return nameTl; }
    public String getScientificName() { return scientificName; }
    public String getPathogenType() { return pathogenType != null ? pathogenType : "Fungal"; }
    public String getDescription() { return description; }
    public String getDescriptionTl() { return descriptionTl; }
    public String getSymptoms() { return symptoms; }
    public String getSymptomsTl() { return symptomsTl; }
    public String getSeverityDefault() { return severityDefault != null ? severityDefault : "Moderate"; }
    public List<DiseaseRecommendationDto> getRecommendations() { return recommendations; }

    public void setId(int id) { this.id = id; }
    public void setName(String name) { this.name = name; }
    public void setScientificName(String scientificName) { this.scientificName = scientificName; }
    public void setPathogenType(String pathogenType) { this.pathogenType = pathogenType; }
    public void setDescription(String description) { this.description = description; }
    public void setSymptoms(String symptoms) { this.symptoms = symptoms; }
    public void setSeverityDefault(String severityDefault) { this.severityDefault = severityDefault; }

    public static class DiseaseRecommendationDto implements Serializable {
        @SerializedName("id")
        private int id;

        @SerializedName("action_title")
        private String actionTitle;

        @SerializedName("action_title_tl")
        private String actionTitleTl;

        @SerializedName("description")
        private String description;

        @SerializedName("description_tl")
        private String descriptionTl;

        @SerializedName("management_type")
        private String managementType;

        public int getId() { return id; }
        public String getActionTitle() { return actionTitle; }
        public String getActionTitleTl() { return actionTitleTl; }
        public String getDescription() { return description; }
        public String getDescriptionTl() { return descriptionTl; }
        public String getManagementType() { return managementType != null ? managementType : "Preventative"; }
    }
}

