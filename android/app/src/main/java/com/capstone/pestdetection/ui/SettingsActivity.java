package com.capstone.pestdetection.ui;

import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatDelegate;
import androidx.drawerlayout.widget.DrawerLayout;

import com.capstone.pestdetection.R;
import com.capstone.pestdetection.models.ChangePasswordRequest;
import com.capstone.pestdetection.network.ApiClient;
import com.capstone.pestdetection.network.ApiService;
import com.capstone.pestdetection.network.SessionManager;
import com.capstone.pestdetection.utils.LocaleHelper;
import com.google.android.material.appbar.MaterialToolbar;
import com.google.android.material.button.MaterialButtonToggleGroup;
import com.google.android.material.switchmaterial.SwitchMaterial;

import okhttp3.ResponseBody;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class SettingsActivity extends BaseActivity {

    private SessionManager sessionManager;
    private TextView tvSettingsFullName, tvSettingsEmail, tvSettingsRole, tvSettingsActiveUrl, tvSettingsAvatarCircle;
    private EditText etOldPassword, etNewPassword;
    private SwitchMaterial switchDarkMode;
    private MaterialButtonToggleGroup toggleLanguageGroup;

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
        toggleLanguageGroup = findViewById(R.id.toggleLanguageGroup);

        findViewById(R.id.btnNavNotifications).setOnClickListener(v -> {
            startActivity(new Intent(SettingsActivity.this, NotificationsActivity.class));
        });

        populateProfileInfo();
        setupDarkModeToggle();
        setupLanguageToggle();

        findViewById(R.id.btnUpdatePassword).setOnClickListener(v -> handlePasswordUpdate());
        findViewById(R.id.btnSettingsConfigServer).setOnClickListener(v -> showServerConfigDialog());
        findViewById(R.id.btnSettingsInstallApp).setOnClickListener(v -> {
            Intent browserIntent = new Intent(Intent.ACTION_VIEW, android.net.Uri.parse("https://drive.google.com/drive/folders/1yNTXrAt92d6L1nB0SQVe8zG-OukoPrbH"));
            startActivity(browserIntent);
        });
    }

    private void populateProfileInfo() {
        String name = sessionManager.getFullName();
        String email = sessionManager.getEmail();
        String role = sessionManager.getRole();
        String currentLang = LocaleHelper.getLanguage(this);

        String defaultName = "tl".equals(currentLang) ? "Magsasaka" : "Alex Rivers";
        tvSettingsFullName.setText(!name.isEmpty() ? name : defaultName);
        tvSettingsEmail.setText(!email.isEmpty() ? email : "farmer@agrimonitor.local");

        boolean isAdmin = "admin".equalsIgnoreCase(role);
        String roleText = isAdmin
                ? ("tl".equals(currentLang) ? "TAGAPAMAHALA NG SISTEMA (ADMIN)" : "SYSTEM ADMIN")
                : ("tl".equals(currentLang) ? "TAGAPAMAHALA NG BUKID" : "FARM MANAGER");
        tvSettingsRole.setText("ROLE: " + roleText);
        tvSettingsAvatarCircle.setText(!name.isEmpty() ? String.valueOf(name.charAt(0)).toUpperCase() : "A");

        tvSettingsActiveUrl.setText(getString(R.string.active_server_display, sessionManager.getBaseUrl()));
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

    private void setupLanguageToggle() {
        String currentLang = LocaleHelper.getLanguage(this);
        if ("tl".equalsIgnoreCase(currentLang)) {
            toggleLanguageGroup.check(R.id.btnLangTl);
        } else {
            toggleLanguageGroup.check(R.id.btnLangEn);
        }

        toggleLanguageGroup.addOnButtonCheckedListener((group, checkedId, isChecked) -> {
            if (!isChecked) return;

            String targetLang = (checkedId == R.id.btnLangTl) ? "tl" : "en";
            if (!targetLang.equals(LocaleHelper.getLanguage(this))) {
                LocaleHelper.setLocale(this, targetLang);
                Toast.makeText(this, targetLang.equals("tl") ? getString(R.string.lang_switched_fil) : getString(R.string.lang_switched_en), Toast.LENGTH_SHORT).show();
                recreate();
            }
        });
    }

    private void handlePasswordUpdate() {
        String oldPass = etOldPassword.getText().toString().trim();
        String newPass = etNewPassword.getText().toString().trim();

        if (oldPass.isEmpty() || newPass.isEmpty()) {
            Toast.makeText(this, getString(R.string.error_password_fields_empty), Toast.LENGTH_SHORT).show();
            return;
        }

        ChangePasswordRequest request = new ChangePasswordRequest(oldPass, newPass);
        ApiService apiService = ApiClient.getApiService(this);
        apiService.changePassword(request).enqueue(new Callback<ResponseBody>() {
            @Override
            public void onResponse(Call<ResponseBody> call, Response<ResponseBody> response) {
                if (response.isSuccessful()) {
                    Toast.makeText(SettingsActivity.this, getString(R.string.password_updated), Toast.LENGTH_SHORT).show();
                    etOldPassword.setText("");
                    etNewPassword.setText("");
                } else {
                    Toast.makeText(SettingsActivity.this, getString(R.string.password_update_failed), Toast.LENGTH_LONG).show();
                }
            }

            @Override
            public void onFailure(Call<ResponseBody> call, Throwable t) {
                Toast.makeText(SettingsActivity.this, getString(R.string.network_error_generic, t.getLocalizedMessage()), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void showServerConfigDialog() {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle(getString(R.string.btn_configure_server));

        final EditText input = new EditText(this);
        input.setHint(getString(R.string.server_url_hint));
        input.setText(sessionManager.getBaseUrl());
        builder.setView(input);

        builder.setPositiveButton(getString(R.string.save), (dialog, which) -> {
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
                tvSettingsActiveUrl.setText(getString(R.string.active_server_display, newUrl));
                Toast.makeText(this, getString(R.string.base_url_updated), Toast.LENGTH_SHORT).show();
            }
        });
        builder.setNegativeButton(getString(R.string.cancel), (dialog, which) -> dialog.cancel());
        builder.show();
    }
}
