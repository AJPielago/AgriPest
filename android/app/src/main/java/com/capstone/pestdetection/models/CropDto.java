package com.capstone.pestdetection.models;

import com.google.gson.annotations.SerializedName;

public class CropDto {
    @SerializedName("id")
    private int id;

    @SerializedName("name")
    private String name;

    @SerializedName("scientific_name")
    private String scientificName;

    @SerializedName("description")
    private String description;

    @SerializedName("status")
    private String status;

    public int getId() { return id; }
    public String getName() { return name; }
    public String getScientificName() { return scientificName; }
    public String getDescription() { return description; }
    public String getStatus() { return status; }

    @Override
    public String toString() {
        return name; // Useful for Spinner adapter display
    }
}
