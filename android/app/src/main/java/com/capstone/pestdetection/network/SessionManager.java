package com.capstone.pestdetection.network;

import android.content.Context;
import android.content.SharedPreferences;

public class SessionManager {
    private static final String PREF_NAME = "agricultural_diagnostic_session";
    private static final String KEY_TOKEN = "jwt_token";
    private static final String KEY_USER_ID = "user_id";
    private static final String KEY_EMAIL = "email";
    private static final String KEY_FULL_NAME = "full_name";
    private static final String KEY_ROLE = "role";
    private static final String KEY_BASE_URL = "base_url";

    // Default development URL (10.0.2.2 points to host machine from Android
    // Emulator)
    public static final String DEFAULT_BASE_URL = "https://agripest.onrender.com/";
    private final SharedPreferences pref;
    private final SharedPreferences.Editor editor;

    public SessionManager(Context context) {
        this.pref = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
        this.editor = pref.edit();
    }

    public void saveAuthToken(String token) {
        editor.putString(KEY_TOKEN, token);
        editor.apply();
    }

    public void saveUserDetails(int userId, String email, String fullName, String role) {
        editor.putInt(KEY_USER_ID, userId);
        editor.putString(KEY_EMAIL, email);
        editor.putString(KEY_FULL_NAME, fullName);
        editor.putString(KEY_ROLE, role);
        editor.apply();
    }

    public void saveAuthToken(String token, int userId, String email, String fullName, String role) {
        editor.putString(KEY_TOKEN, token);
        editor.putInt(KEY_USER_ID, userId);
        editor.putString(KEY_EMAIL, email);
        editor.putString(KEY_FULL_NAME, fullName);
        editor.putString(KEY_ROLE, role);
        editor.apply();
    }

    public String fetchAuthToken() {
        return pref.getString(KEY_TOKEN, null);
    }

    public boolean isLoggedIn() {
        return fetchAuthToken() != null;
    }

    public String getEmail() {
        return pref.getString(KEY_EMAIL, "");
    }

    public String getFullName() {
        return pref.getString(KEY_FULL_NAME, "");
    }

    public String getRole() {
        return pref.getString(KEY_ROLE, "farmer");
    }

    public void saveBaseUrl(String url) {
        if (!url.endsWith("/")) {
            url += "/";
        }
        editor.putString(KEY_BASE_URL, url);
        editor.apply();
    }

    public String getBaseUrl() {
        return pref.getString(KEY_BASE_URL, DEFAULT_BASE_URL);
    }

    public void clearSession() {
        editor.remove(KEY_TOKEN);
        editor.remove(KEY_USER_ID);
        editor.remove(KEY_EMAIL);
        editor.remove(KEY_FULL_NAME);
        editor.remove(KEY_ROLE);
        editor.apply();
    }
}
