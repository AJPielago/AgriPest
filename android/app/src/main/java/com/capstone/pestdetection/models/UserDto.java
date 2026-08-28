package com.capstone.pestdetection.models;

import com.google.gson.annotations.SerializedName;

public class UserDto {
    @SerializedName("id")
    private int id;

    @SerializedName("email")
    private String email;

    @SerializedName("full_name")
    private String fullName;

    @SerializedName("role_id")
    private int roleId;

    @SerializedName("is_active")
    private boolean isActive;

    @SerializedName("role")
    private RoleDto role;

    public int getId() { return id; }
    public String getEmail() { return email; }
    public String getFullName() { return fullName; }
    public int getRoleId() { return roleId; }
    public boolean isActive() { return isActive; }
    public RoleDto getRole() { return role; }
}
