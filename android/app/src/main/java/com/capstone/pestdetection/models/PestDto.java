package com.capstone.pestdetection.models;

import com.google.gson.annotations.SerializedName;
import java.io.Serializable;

public class PestDto implements Serializable {
    @SerializedName("id")
    private int id;

    @SerializedName("name")
    private String name;

    @SerializedName("scientific_name")
    private String scientificName;

    @SerializedName("description")
    private String description;

    @SerializedName("symptoms")
    private String symptoms;

    @SerializedName("severity_default")
    private String severityDefault;

    public int getId() { return id; }
    public String getName() { return name; }
    public String getScientificName() { return scientificName; }
    public String getDescription() { return description; }
    public String getSymptoms() { return symptoms; }
    public String getSeverityDefault() { return severityDefault; }
}
