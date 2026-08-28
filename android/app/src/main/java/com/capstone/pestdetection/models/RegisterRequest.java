package com.capstone.pestdetection.models;

import com.google.gson.annotations.SerializedName;

public class RegisterRequest {
    @SerializedName("email")
    private String email;

    @SerializedName("full_name")
    private String fullName;

    @SerializedName("password")
    private String password;

    @SerializedName("role_id")
    private Integer roleId;

    public RegisterRequest(String email, String fullName, String password, Integer roleId) {
        this.email = email;
        this.fullName = fullName;
        this.password = password;
        this.roleId = roleId != null ? roleId : 2;
    }

    public String getEmail() { return email; }
    public String getFullName() { return fullName; }
    public String getPassword() { return password; }
    public Integer getRoleId() { return roleId; }
}
