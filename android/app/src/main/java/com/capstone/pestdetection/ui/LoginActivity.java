package com.capstone.pestdetection.ui;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.EditText;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;

import com.capstone.pestdetection.R;
import com.capstone.pestdetection.models.AuthResponse;
import com.capstone.pestdetection.models.UserDto;
import com.capstone.pestdetection.network.ApiClient;
import com.capstone.pestdetection.network.ApiService;
import com.capstone.pestdetection.network.SessionManager;
import com.google.android.material.button.MaterialButton;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class LoginActivity extends AppCompatActivity {

    private EditText etEmail, etPassword;
    private MaterialButton btnLogin;
    private ProgressBar progressBar;
    private SessionManager sessionManager;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        sessionManager = new SessionManager(this);

        // Auto redirect if active token exists
        if (sessionManager.isLoggedIn()) {
            navigateToMain();
            return;
        }

        setContentView(R.layout.activity_login);

        etEmail = findViewById(R.id.etEmail);
        etPassword = findViewById(R.id.etPassword);
        btnLogin = findViewById(R.id.btnLogin);
        progressBar = findViewById(R.id.loginProgressBar);

        TextView tvRegisterLink = findViewById(R.id.tvRegisterLink);
        TextView btnConfigServerLogin = findViewById(R.id.btnConfigServerLogin);

        MaterialButton btnFillFarmer = findViewById(R.id.btnFillFarmer);
        MaterialButton btnFillAdmin = findViewById(R.id.btnFillAdmin);

        btnLogin.setOnClickListener(v -> attemptLogin());

        tvRegisterLink.setOnClickListener(v -> {
            Intent intent = new Intent(LoginActivity.this, RegisterActivity.class);
            startActivity(intent);
        });

        btnConfigServerLogin.setOnClickListener(v -> showServerConfigDialog());

        btnFillFarmer.setOnClickListener(v -> {
            etEmail.setText("farmer@pestdetect.com");
            etPassword.setText("farmer123");
        });

        btnFillAdmin.setOnClickListener(v -> {
            etEmail.setText("admin@pestdetect.com");
            etPassword.setText("admin123");
        });
    }

    private void attemptLogin() {
        String email = etEmail.getText().toString().trim();
        String password = etPassword.getText().toString().trim();

        if (email.isEmpty()) {
            etEmail.setError("Email address is required");
            etEmail.requestFocus();
            return;
        }

        if (password.isEmpty()) {
            etPassword.setError("Password is required");
            etPassword.requestFocus();
            return;
        }

        setLoading(true);

        ApiService apiService = ApiClient.getApiService(this);
        apiService.login(email, password).enqueue(new Callback<AuthResponse>() {
            @Override
            public void onResponse(Call<AuthResponse> call, Response<AuthResponse> response) {
                if (response.isSuccessful() && response.body() != null) {
                    AuthResponse authResponse = response.body();
                    sessionManager.saveAuthToken(authResponse.getAccessToken());

                    fetchUserProfile();
                } else {
                    setLoading(false);
                    Toast.makeText(LoginActivity.this, "Sign in failed: Invalid credentials (" + response.code() + ")", Toast.LENGTH_LONG).show();
                }
            }

            @Override
            public void onFailure(Call<AuthResponse> call, Throwable t) {
                setLoading(false);
                Toast.makeText(LoginActivity.this, "Network error: Unable to connect to " + sessionManager.getBaseUrl(), Toast.LENGTH_LONG).show();
            }
        });
    }

    private void fetchUserProfile() {
        ApiService apiService = ApiClient.getApiService(this);
        apiService.getMe().enqueue(new Callback<UserDto>() {
            @Override
            public void onResponse(Call<UserDto> call, Response<UserDto> response) {
                setLoading(false);
                if (response.isSuccessful() && response.body() != null) {
                    UserDto user = response.body();
                    String roleName = (user.getRole() != null && user.getRole().getName() != null)
                            ? user.getRole().getName()
                            : "farmer";

                    sessionManager.saveUserDetails(user.getId(), user.getEmail(), user.getFullName(), roleName);
                    Toast.makeText(LoginActivity.this, "Welcome back, " + user.getFullName() + "!", Toast.LENGTH_SHORT).show();
                    navigateToMain();
                } else {
                    sessionManager.saveUserDetails(1, etEmail.getText().toString(), "Agri Farmer", "farmer");
                    navigateToMain();
                }
            }

            @Override
            public void onFailure(Call<UserDto> call, Throwable t) {
                setLoading(false);
                sessionManager.saveUserDetails(1, etEmail.getText().toString(), "Agri Farmer", "farmer");
                navigateToMain();
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
                Toast.makeText(this, "Base URL updated to " + newUrl, Toast.LENGTH_SHORT).show();
            }
        });
        builder.setNegativeButton("Cancel", (dialog, which) -> dialog.cancel());
        builder.show();
    }

    private void setLoading(boolean isLoading) {
        progressBar.setVisibility(isLoading ? View.VISIBLE : View.GONE);
        btnLogin.setEnabled(!isLoading);
    }

    private void navigateToMain() {
        Intent intent = new Intent(LoginActivity.this, MainActivity.class);
        startActivity(intent);
        finish();
    }
}
