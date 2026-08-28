package com.capstone.pestdetection.ui;

import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.app.AppCompatDelegate;
import androidx.drawerlayout.widget.DrawerLayout;

import com.capstone.pestdetection.R;
import com.capstone.pestdetection.models.ChangePasswordRequest;
import com.capstone.pestdetection.network.ApiClient;
import com.capstone.pestdetection.network.ApiService;
import com.capstone.pestdetection.network.SessionManager;
import com.google.android.material.appbar.MaterialToolbar;
import com.google.android.material.switchmaterial.SwitchMaterial;

import okhttp3.ResponseBody;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class SettingsActivity extends AppCompatActivity {

    private SessionManager sessionManager;
    private TextView tvSettingsFullName, tvSettingsEmail, tvSettingsRole, tvSettingsActiveUrl, tvSettingsAvatarCircle;
    private EditText etOldPassword, etNewPassword;
    private SwitchMaterial switchDarkMode;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_settings);

        sessionManager = new SessionManager(this);

        MaterialToolbar toolbar = findViewById(R.id.settingsToolbar);
        DrawerLayout drawerLayout = findViewById(R.id.drawer_layout);
        NavigationDrawerHelper.setupDrawer(this, drawerLayout, toolbar, R.id.nav_settings);

        tvSettingsFullName = findViewById(R.id.tvSettingsFullName);
        tvSettingsEmail = findViewById(R.id.tvSettingsEmail);
        tvSettingsRole = findViewById(R.id.tvSettingsRole);
        tvSettingsActiveUrl = findViewById(R.id.tvSettingsActiveUrl);
        tvSettingsAvatarCircle = findViewById(R.id.tvSettingsAvatarCircle);

        etOldPassword = findViewById(R.id.etOldPassword);
        etNewPassword = findViewById(R.id.etNewPassword);
        switchDarkMode = findViewById(R.id.switchDarkMode);

        findViewById(R.id.btnNavNotifications).setOnClickListener(v -> {
            startActivity(new Intent(SettingsActivity.this, NotificationsActivity.class));
        });

        populateProfileInfo();
        setupDarkModeToggle();

        findViewById(R.id.btnUpdatePassword).setOnClickListener(v -> handlePasswordUpdate());
        findViewById(R.id.btnSettingsConfigServer).setOnClickListener(v -> showServerConfigDialog());
    }

    private void populateProfileInfo() {
        String name = sessionManager.getFullName();
        String email = sessionManager.getEmail();
        String role = sessionManager.getRole();

        tvSettingsFullName.setText(!name.isEmpty() ? name : "Alex Rivers");
        tvSettingsEmail.setText(!email.isEmpty() ? email : "farmer@agrimonitor.local");
        tvSettingsRole.setText("ROLE: " + ("admin".equalsIgnoreCase(role) ? "SYSTEM ADMIN" : "FARM MANAGER"));
        tvSettingsAvatarCircle.setText(!name.isEmpty() ? String.valueOf(name.charAt(0)).toUpperCase() : "A");

        tvSettingsActiveUrl.setText("Active Server Endpoint: " + sessionManager.getBaseUrl());
    }

    private void setupDarkModeToggle() {
        SharedPreferences prefs = getSharedPreferences("app_settings", MODE_PRIVATE);
        boolean isDark = prefs.getBoolean("dark_mode", false);
        switchDarkMode.setChecked(isDark);

        switchDarkMode.setOnCheckedChangeListener((buttonView, isChecked) -> {
            prefs.edit().putBoolean("dark_mode", isChecked).apply();
            AppCompatDelegate.setDefaultNightMode(
                    isChecked ? AppCompatDelegate.MODE_NIGHT_YES : AppCompatDelegate.MODE_NIGHT_NO
            );
        });
    }

    private void handlePasswordUpdate() {
        String oldPass = etOldPassword.getText().toString().trim();
        String newPass = etNewPassword.getText().toString().trim();

        if (oldPass.isEmpty() || newPass.isEmpty()) {
            Toast.makeText(this, "Please enter both current and new password", Toast.LENGTH_SHORT).show();
            return;
        }

        ChangePasswordRequest request = new ChangePasswordRequest(oldPass, newPass);
        ApiService apiService = ApiClient.getApiService(this);
        apiService.changePassword(request).enqueue(new Callback<ResponseBody>() {
            @Override
            public void onResponse(Call<ResponseBody> call, Response<ResponseBody> response) {
                if (response.isSuccessful()) {
                    Toast.makeText(SettingsActivity.this, "Password updated successfully", Toast.LENGTH_SHORT).show();
                    etOldPassword.setText("");
                    etNewPassword.setText("");
                } else {
                    Toast.makeText(SettingsActivity.this, "Failed to update password. Verify current password.", Toast.LENGTH_LONG).show();
                }
            }

            @Override
            public void onFailure(Call<ResponseBody> call, Throwable t) {
                Toast.makeText(SettingsActivity.this, "Network error: " + t.getLocalizedMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void showServerConfigDialog() {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("Configure Server Endpoint");

        final EditText input = new EditText(this);
        input.setHint("e.g. http://10.0.2.2:8000/");
        input.setText(sessionManager.getBaseUrl());
        builder.setView(input);

        builder.setPositiveButton("Save", (dialog, which) -> {
            String newUrl = input.getText().toString().trim();
            if (!newUrl.isEmpty()) {
                if (!newUrl.startsWith("http://") && !newUrl.startsWith("https://")) {
                    newUrl = "http://" + newUrl;
                }
                if (!newUrl.endsWith("/")) {
                    newUrl = newUrl + "/";
                }
                sessionManager.saveBaseUrl(newUrl);
                ApiClient.resetClient();
                tvSettingsActiveUrl.setText("Active Server Endpoint: " + newUrl);
                Toast.makeText(this, "Base URL updated", Toast.LENGTH_SHORT).show();
            }
        });
        builder.setNegativeButton("Cancel", (dialog, which) -> dialog.cancel());
        builder.show();
    }
}
