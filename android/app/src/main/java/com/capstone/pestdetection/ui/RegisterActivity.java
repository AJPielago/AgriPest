package com.capstone.pestdetection.ui;

import android.os.Bundle;
import android.util.Patterns;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.EditText;
import android.widget.ProgressBar;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.capstone.pestdetection.R;
import com.capstone.pestdetection.models.RegisterRequest;
import com.capstone.pestdetection.models.UserDto;
import com.capstone.pestdetection.network.ApiClient;
import com.capstone.pestdetection.network.ApiService;
import com.google.android.material.button.MaterialButton;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class RegisterActivity extends AppCompatActivity {

    private EditText etFullName, etEmail, etPassword;
    private Spinner spinnerRole;
    private MaterialButton btnRegister;
    private ProgressBar progressBar;

    private static final String[] ROLES = new String[]{"Farmer", "Extension Worker", "Administrator"};

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_register);

        etFullName = findViewById(R.id.etRegFullName);
        etEmail = findViewById(R.id.etRegEmail);
        etPassword = findViewById(R.id.etRegPassword);
        spinnerRole = findViewById(R.id.spinnerRole);
        btnRegister = findViewById(R.id.btnRegister);
        progressBar = findViewById(R.id.regProgressBar);

        ArrayAdapter<String> adapter = new ArrayAdapter<>(
                this,
                android.R.layout.simple_spinner_dropdown_item,
                ROLES
        );
        spinnerRole.setAdapter(adapter);

        TextView tvLoginLink = findViewById(R.id.tvLoginLink);

        btnRegister.setOnClickListener(v -> attemptRegister());
        tvLoginLink.setOnClickListener(v -> finish());
    }

    private void attemptRegister() {
        String fullName = etFullName.getText().toString().trim();
        String email = etEmail.getText().toString().trim();
        String password = etPassword.getText().toString().trim();
        String selectedRole = spinnerRole.getSelectedItem() != null ? spinnerRole.getSelectedItem().toString() : "Farmer";

        if (fullName.isEmpty()) {
            etFullName.setError("Full name is required");
            etFullName.requestFocus();
            return;
        }

        if (email.isEmpty() || !Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            etEmail.setError("Valid email address is required");
            etEmail.requestFocus();
            return;
        }

        if (password.isEmpty() || password.length() < 4) {
            etPassword.setError("Password must be at least 4 characters");
            etPassword.requestFocus();
            return;
        }

        int roleId = 2; // Default to farmer
        if ("Extension Worker".equalsIgnoreCase(selectedRole)) {
            roleId = 3;
        } else if ("Administrator".equalsIgnoreCase(selectedRole)) {
            roleId = 1;
        }

        setLoading(true);

        RegisterRequest request = new RegisterRequest(email, fullName, password, roleId);
        ApiService apiService = ApiClient.getApiService(this);
        apiService.register(request).enqueue(new Callback<UserDto>() {
            @Override
            public void onResponse(Call<UserDto> call, Response<UserDto> response) {
                setLoading(false);
                if (response.isSuccessful()) {
                    Toast.makeText(RegisterActivity.this, "Account created successfully! Please log in.", Toast.LENGTH_LONG).show();
                    finish();
                } else {
                    Toast.makeText(RegisterActivity.this, "Registration failed. Email may already exist.", Toast.LENGTH_LONG).show();
                }
            }

            @Override
            public void onFailure(Call<UserDto> call, Throwable t) {
                setLoading(false);
                Toast.makeText(RegisterActivity.this, "Network error: " + t.getLocalizedMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void setLoading(boolean loading) {
        progressBar.setVisibility(loading ? View.VISIBLE : View.GONE);
        btnRegister.setEnabled(!loading);
    }
}
