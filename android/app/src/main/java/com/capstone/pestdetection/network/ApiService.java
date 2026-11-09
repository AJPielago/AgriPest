package com.capstone.pestdetection.network;

import com.capstone.pestdetection.models.AuthResponse;
import com.capstone.pestdetection.models.CropDto;
import com.capstone.pestdetection.models.DetectionListResponse;
import com.capstone.pestdetection.models.DetectionResponse;
import com.capstone.pestdetection.models.FeedbackRequest;
import com.capstone.pestdetection.models.RegisterRequest;
import com.capstone.pestdetection.models.UserDto;

import java.util.List;

import okhttp3.MultipartBody;
import okhttp3.RequestBody;
import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.Field;
import retrofit2.http.FormUrlEncoded;
import retrofit2.http.GET;
import retrofit2.http.Multipart;
import retrofit2.http.POST;
import retrofit2.http.Part;
import retrofit2.http.Path;
import retrofit2.http.Query;

public interface ApiService {

    @FormUrlEncoded
    @POST("api/v1/auth/login")
    Call<AuthResponse> login(
            @Field("username") String username,
            @Field("password") String password
    );

    @POST("api/v1/auth/register")
    Call<UserDto> register(
            @Body RegisterRequest request
    );

    @GET("api/v1/auth/me")
    Call<UserDto> getMe();

    @GET("api/v1/crops")
    Call<List<CropDto>> getCrops();

    @GET("api/v1/crops/all")
    Call<List<CropDto>> getAllCrops();

    @Multipart
    @POST("api/v1/detections/live-check")
    Call<com.capstone.pestdetection.models.LiveCheckResponse> liveCheckFrame(
            @Part MultipartBody.Part file,
            @Part("crop_id") RequestBody cropId
    );

    @Multipart
    @POST("api/v1/detections/detect")
    Call<DetectionResponse> detectPest(
            @Part MultipartBody.Part file,
            @Part("crop_id") RequestBody cropId,
            @Part("weather_condition") RequestBody weatherCondition,
            @Part("field_location") RequestBody fieldLocation
    );

    @GET("api/v1/detections")
    Call<DetectionListResponse> getDetections(
            @Query("skip") int skip,
            @Query("limit") int limit,
            @Query("crop_id") Integer cropId
    );

    @GET("api/v1/detections/{detection_id}")
    Call<DetectionResponse> getDetectionDetail(
            @Path("detection_id") int detectionId
    );

    @POST("api/v1/detections/{detection_id}/feedback")
    Call<DetectionResponse> submitFeedback(
            @Path("detection_id") int detectionId,
            @Body FeedbackRequest feedback
    );

    @GET("api/v1/dashboard/stats")
    Call<com.capstone.pestdetection.models.DashboardStatsDto> getDashboardStats();

    @GET("api/v1/pests")
    Call<List<com.capstone.pestdetection.models.PestDto>> getPests(@Query("crop_id") Integer cropId);

    @GET("api/v1/pests/{pest_id}")
    Call<com.capstone.pestdetection.models.PestDto> getPestById(@Path("pest_id") int pestId);

    @POST("api/v1/auth/change-password")
    Call<okhttp3.ResponseBody> changePassword(@Body com.capstone.pestdetection.models.ChangePasswordRequest request);

    @GET("api/v1/admin/metrics")
    Call<com.capstone.pestdetection.models.AdminMetricsDto> getAdminMetrics();

    @GET("api/v1/users")
    Call<List<com.capstone.pestdetection.models.UserDto>> getUsers();

    @GET("api/v1/audit/logs")
    Call<com.capstone.pestdetection.models.AuditLogDto.AuditLogListResponse> getAuditLogs(@Query("skip") int skip, @Query("limit") int limit);

    @retrofit2.http.DELETE("api/v1/detections/{detection_id}")
    Call<okhttp3.ResponseBody> deleteDetection(@Path("detection_id") int detectionId);

    // Disease Endpoints
    @GET("api/v1/diseases")
    Call<List<com.capstone.pestdetection.models.DiseaseDto>> getDiseases(
            @Query("crop_id") Integer cropId,
            @Query("pathogen_type") String pathogenType
    );

    @GET("api/v1/diseases/{disease_id}")
    Call<com.capstone.pestdetection.models.DiseaseDto> getDiseaseById(@Path("disease_id") int diseaseId);

    @POST("api/v1/diseases")
    Call<com.capstone.pestdetection.models.DiseaseDto> createDisease(@Body com.capstone.pestdetection.models.DiseaseDto disease);

    @retrofit2.http.DELETE("api/v1/diseases/{disease_id}")
    Call<okhttp3.ResponseBody> deleteDisease(@Path("disease_id") int diseaseId);

    // Crops Endpoints
    @GET("api/v1/crops/{crop_id}")
    Call<CropDto> getCropById(@Path("crop_id") int cropId);

    @POST("api/v1/crops")
    Call<CropDto> createCrop(@Body CropDto crop);

    @retrofit2.http.DELETE("api/v1/crops/{crop_id}")
    Call<okhttp3.ResponseBody> deleteCrop(@Path("crop_id") int cropId);

    // Pests Endpoints
    @POST("api/v1/pests")
    Call<com.capstone.pestdetection.models.PestDto> createPest(@Body com.capstone.pestdetection.models.PestDto pest);

    @retrofit2.http.DELETE("api/v1/pests/{pest_id}")
    Call<okhttp3.ResponseBody> deletePest(@Path("pest_id") int pestId);
}
