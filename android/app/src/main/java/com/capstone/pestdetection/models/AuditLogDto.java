package com.capstone.pestdetection.models;

import com.google.gson.annotations.SerializedName;
import java.util.List;

public class AuditLogDto {
    @SerializedName("id")
    private int id;

    @SerializedName("user_id")
    private Integer userId;

    @SerializedName("user_name")
    private String userName;

    @SerializedName("action")
    private String action;

    @SerializedName("details")
    private String details;

    @SerializedName("ip_address")
    private String ipAddress;

    @SerializedName("created_at")
    private String createdAt;

    public int getId() { return id; }
    public Integer getUserId() { return userId; }
    public String getUserName() { return userName; }
    public String getAction() { return action; }
    public String getDetails() { return details; }
    public String getIpAddress() { return ipAddress; }
    public String getCreatedAt() { return createdAt; }

    public static class AuditLogListResponse {
        @SerializedName("total")
        private int total;

        @SerializedName("items")
        private List<AuditLogDto> items;

        public int getTotal() { return total; }
        public List<AuditLogDto> getItems() { return items; }
    }
}
