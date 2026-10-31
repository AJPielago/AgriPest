package com.capstone.pestdetection.ui;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.Spinner;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import androidx.drawerlayout.widget.DrawerLayout;

import com.capstone.pestdetection.R;
import com.capstone.pestdetection.models.CropDto;
import com.capstone.pestdetection.models.DetectionResponse;
import com.capstone.pestdetection.network.ApiClient;
import com.capstone.pestdetection.network.ApiService;
import com.google.android.material.appbar.MaterialToolbar;
import com.google.android.material.button.MaterialButton;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

import okhttp3.MediaType;
import okhttp3.MultipartBody;
import okhttp3.RequestBody;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class DetectActivity extends BaseActivity {

    private ImageView ivSpecimenPreview;
    private LinearLayout layoutUploadPlaceholder;
    private Spinner spinnerCrops, spinnerWeather;
    private EditText etFieldLocation;
    private MaterialButton btnCamera, btnGallery, btnSubmitDetection;
    private ProgressBar detectProgressBar;

    private File currentPhotoFile;
    private Uri selectedImageUri;
    private List<CropDto> cropList = new ArrayList<>();

    private final ActivityResultLauncher<Intent> cameraLauncher = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(),
            result -> {
                if (result.getResultCode() == RESULT_OK && currentPhotoFile != null && currentPhotoFile.exists()) {
                    selectedImageUri = Uri.fromFile(currentPhotoFile);
                    displayPreviewImage(selectedImageUri);
                }
            }
    );

    private final ActivityResultLauncher<String> galleryLauncher = registerForActivityResult(
            new ActivityResultContracts.GetContent(),
            uri -> {
                if (uri != null) {
                    selectedImageUri = uri;
                    displayPreviewImage(selectedImageUri);
                }
            }
    );

    private final ActivityResultLauncher<String> requestPermissionLauncher = registerForActivityResult(
            new ActivityResultContracts.RequestPermission(),
            isGranted -> {
                if (isGranted) {
                    launchCameraIntent();
                } else {
                    Toast.makeText(this, getString(R.string.camera_permission_required), Toast.LENGTH_SHORT).show();
                }
            }
    );

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_detect);

        MaterialToolbar toolbar = findViewById(R.id.detectToolbar);
        DrawerLayout drawerLayout = findViewById(R.id.drawer_layout);
        NavigationDrawerHelper.setupDrawer(this, drawerLayout, toolbar, R.id.nav_detect);

        ivSpecimenPreview = findViewById(R.id.ivSpecimenPreview);
        layoutUploadPlaceholder = findViewById(R.id.layoutUploadPlaceholder);
        spinnerCrops = findViewById(R.id.spinnerCrops);
        spinnerWeather = findViewById(R.id.spinnerWeather);
        etFieldLocation = findViewById(R.id.etFieldLocation);
        btnCamera = findViewById(R.id.btnCamera);
        btnGallery = findViewById(R.id.btnGallery);
        btnSubmitDetection = findViewById(R.id.btnSubmitDetection);
        detectProgressBar = findViewById(R.id.detectProgressBar);

        View btnNavNotifications = findViewById(R.id.btnNavNotifications);
        if (btnNavNotifications != null) {
            btnNavNotifications.setOnClickListener(v -> startActivity(new Intent(DetectActivity.this, NotificationsActivity.class)));
        }

        setupWeatherSpinner();
        loadCropsFromBackend();

        btnCamera.setOnClickListener(v -> checkCameraPermissionAndLaunch());
        btnGallery.setOnClickListener(v -> galleryLauncher.launch("image/*"));
        btnSubmitDetection.setOnClickListener(v -> submitDiagnosticRequest());
    }

    private void runLivePreScreeningCheck() {
        if (selectedImageUri == null) {
            Toast.makeText(this, getString(R.string.select_capture_specimen), Toast.LENGTH_SHORT).show();
            return;
        }

        File uploadFile = getFileFromUri(selectedImageUri);
        if (uploadFile == null || !uploadFile.exists()) {
            Toast.makeText(this, getString(R.string.prepare_image_failed), Toast.LENGTH_SHORT).show();
            return;
        }

        setLoading(true);

        RequestBody requestFile = RequestBody.create(MediaType.parse("image/*"), uploadFile);
        MultipartBody.Part body = MultipartBody.Part.createFormData("file", uploadFile.getName(), requestFile);

        RequestBody cropIdBody = null;
        if (spinnerCrops.getSelectedItem() != null) {
            CropDto selectedCrop = (CropDto) spinnerCrops.getSelectedItem();
            cropIdBody = RequestBody.create(MediaType.parse("text/plain"), String.valueOf(selectedCrop.getId()));
        }

        ApiService apiService = ApiClient.getApiService(this);
        apiService.liveCheckFrame(body, cropIdBody).enqueue(new Callback<com.capstone.pestdetection.models.LiveCheckResponse>() {
            @Override
            public void onResponse(Call<com.capstone.pestdetection.models.LiveCheckResponse> call, Response<com.capstone.pestdetection.models.LiveCheckResponse> response) {
                setLoading(false);
                if (response.isSuccessful() && response.body() != null) {
                    com.capstone.pestdetection.models.LiveCheckResponse res = response.body();
                    String msg = res.getMessage() + " (Confidence: " + (int)(res.getConfidence() * 100) + "%)";
                    Toast.makeText(DetectActivity.this, msg, Toast.LENGTH_LONG).show();
                } else {
                    Toast.makeText(DetectActivity.this, getString(R.string.prescreen_check_failed), Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(Call<com.capstone.pestdetection.models.LiveCheckResponse> call, Throwable t) {
                setLoading(false);
                Toast.makeText(DetectActivity.this, getString(R.string.network_error_generic, t.getLocalizedMessage()), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void setupWeatherSpinner() {
        String[] weatherOptions = new String[]{"Sunny", "Rainy", "Humid", "Overcast"};
        ArrayAdapter<String> adapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, weatherOptions);
        spinnerWeather.setAdapter(adapter);
    }

    private void loadCropsFromBackend() {
        ApiService apiService = ApiClient.getApiService(this);
        apiService.getCrops().enqueue(new Callback<List<CropDto>>() {
            @Override
            public void onResponse(Call<List<CropDto>> call, Response<List<CropDto>> response) {
                if (response.isSuccessful() && response.body() != null) {
                    cropList = response.body();
                    ArrayAdapter<CropDto> cropAdapter = new ArrayAdapter<>(DetectActivity.this, android.R.layout.simple_spinner_dropdown_item, cropList);
                    spinnerCrops.setAdapter(cropAdapter);
                } else {
                    Toast.makeText(DetectActivity.this, getString(R.string.load_crop_catalog_failed), Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(Call<List<CropDto>> call, Throwable t) {
                Toast.makeText(DetectActivity.this, getString(R.string.network_error_generic, t.getLocalizedMessage()), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void checkCameraPermissionAndLaunch() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
            launchCameraIntent();
        } else {
            requestPermissionLauncher.launch(Manifest.permission.CAMERA);
        }
    }

    private void launchCameraIntent() {
        Intent takePictureIntent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        if (takePictureIntent.resolveActivity(getPackageManager()) != null) {
            try {
                currentPhotoFile = createImageFile();
                Uri photoURI = FileProvider.getUriForFile(this, "com.capstone.pestdetection.fileprovider", currentPhotoFile);
                takePictureIntent.putExtra(MediaStore.EXTRA_OUTPUT, photoURI);
                cameraLauncher.launch(takePictureIntent);
            } catch (IOException ex) {
                Toast.makeText(this, getString(R.string.create_image_file_failed), Toast.LENGTH_SHORT).show();
            }
        }
    }

    private File createImageFile() throws IOException {
        String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(new Date());
        String imageFileName = "CROP_PEST_" + timeStamp + "_";
        File storageDir = getExternalFilesDir(Environment.DIRECTORY_PICTURES);
        return File.createTempFile(imageFileName, ".jpg", storageDir);
    }

    private void displayPreviewImage(Uri uri) {
        ivSpecimenPreview.setImageURI(uri);
        layoutUploadPlaceholder.setVisibility(View.GONE);
    }

    private void submitDiagnosticRequest() {
        if (selectedImageUri == null) {
            Toast.makeText(this, getString(R.string.select_capture_specimen), Toast.LENGTH_LONG).show();
            return;
        }

        File uploadFile = getFileFromUri(selectedImageUri);
        if (uploadFile == null || !uploadFile.exists()) {
            Toast.makeText(this, getString(R.string.prepare_image_failed), Toast.LENGTH_LONG).show();
            return;
        }

        setLoading(true);

        RequestBody requestFile = RequestBody.create(MediaType.parse("image/*"), uploadFile);
        MultipartBody.Part body = MultipartBody.Part.createFormData("file", uploadFile.getName(), requestFile);

        RequestBody cropIdBody = null;
        if (spinnerCrops.getSelectedItem() != null) {
            CropDto selectedCrop = (CropDto) spinnerCrops.getSelectedItem();
            cropIdBody = RequestBody.create(MediaType.parse("text/plain"), String.valueOf(selectedCrop.getId()));
        }

        String weatherVal = spinnerWeather.getSelectedItem() != null ? spinnerWeather.getSelectedItem().toString() : "Sunny";
        RequestBody weatherBody = RequestBody.create(MediaType.parse("text/plain"), weatherVal);

        String locationVal = etFieldLocation.getText().toString().trim();
        RequestBody locationBody = !locationVal.isEmpty() ? RequestBody.create(MediaType.parse("text/plain"), locationVal) : null;

        ApiService apiService = ApiClient.getApiService(this);
        apiService.detectPest(body, cropIdBody, weatherBody, locationBody).enqueue(new Callback<DetectionResponse>() {
            @Override
            public void onResponse(Call<DetectionResponse> call, Response<DetectionResponse> response) {
                setLoading(false);
                if (response.isSuccessful() && response.body() != null) {
                    DetectionResponse result = response.body();
                    Intent intent = new Intent(DetectActivity.this, DetectionResultActivity.class);
                    intent.putExtra("DETECTION_RESULT", result);
                    startActivity(intent);
                    finish();
                } else {
                    Toast.makeText(DetectActivity.this, getString(R.string.diagnostic_analysis_failed, response.code()), Toast.LENGTH_LONG).show();
                }
            }

            @Override
            public void onFailure(Call<DetectionResponse> call, Throwable t) {
                setLoading(false);
                Toast.makeText(DetectActivity.this, getString(R.string.network_error_generic, t.getLocalizedMessage()), Toast.LENGTH_LONG).show();
            }
        });
    }

    private File getFileFromUri(Uri uri) {
        if ("file".equalsIgnoreCase(uri.getScheme())) {
            return new File(uri.getPath());
        }

        try (InputStream inputStream = getContentResolver().openInputStream(uri)) {
            File tempFile = File.createTempFile("upload_crop_", ".jpg", getCacheDir());
            try (FileOutputStream out = new FileOutputStream(tempFile)) {
                byte[] buffer = new byte[1024];
                int read;
                while ((read = inputStream.read(buffer)) != -1) {
                    out.write(buffer, 0, read);
                }
                out.flush();
            }
            return tempFile;
        } catch (IOException e) {
            return null;
        }
    }

    private void setLoading(boolean loading) {
        detectProgressBar.setVisibility(loading ? View.VISIBLE : View.GONE);
        btnSubmitDetection.setEnabled(!loading);
        btnCamera.setEnabled(!loading);
        btnGallery.setEnabled(!loading);
    }
}
