package com.capstone.pestdetection.ui;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
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
                    currentPhotoFile = null;
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
                    cropList = new ArrayList<>();
                    cropList.add(new CropDto(-1, "Auto-Detect (Leafy Green)"));
                    cropList.addAll(response.body());
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
        ivSpecimenPreview.setImageDrawable(null);
        ivSpecimenPreview.setImageURI(null);
        com.bumptech.glide.Glide.with(this)
                .load(uri)
                .skipMemoryCache(true)
                .diskCacheStrategy(com.bumptech.glide.load.engine.DiskCacheStrategy.NONE)
                .into(ivSpecimenPreview);
        layoutUploadPlaceholder.setVisibility(View.GONE);
    }

    private void submitDiagnosticRequest() {
        if (selectedImageUri == null) {
            Toast.makeText(this, getString(R.string.select_capture_specimen), Toast.LENGTH_LONG).show();
            return;
        }

        final File uploadFile = getFileFromUri(selectedImageUri);
        if (uploadFile == null || !uploadFile.exists()) {
            Toast.makeText(this, getString(R.string.prepare_image_failed), Toast.LENGTH_LONG).show();
            return;
        }

        setLoading(true);

        String uniqueUploadName = "specimen_" + System.currentTimeMillis() + ".jpg";
        RequestBody requestFile = RequestBody.create(MediaType.parse("image/jpeg"), uploadFile);
        MultipartBody.Part body = MultipartBody.Part.createFormData("file", uniqueUploadName, requestFile);

        RequestBody cropIdBody = null;
        if (spinnerCrops.getSelectedItem() != null) {
            CropDto selectedCrop = (CropDto) spinnerCrops.getSelectedItem();
            if (selectedCrop.getId() > 0) {
                cropIdBody = RequestBody.create(MediaType.parse("text/plain"), String.valueOf(selectedCrop.getId()));
            }
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
                    String errorMsg = getString(R.string.diagnostic_analysis_failed, response.code());
                    try {
                        if (response.errorBody() != null) {
                            String errJson = response.errorBody().string();
                            org.json.JSONObject obj = new org.json.JSONObject(errJson);
                            if (obj.has("detail") && !obj.isNull("detail")) {
                                errorMsg = obj.getString("detail");
                            }
                        }
                    } catch (Exception ignored) {
                    }
                    Toast.makeText(DetectActivity.this, errorMsg, Toast.LENGTH_LONG).show();
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
        File sourceFile = null;
        if ("file".equalsIgnoreCase(uri.getScheme()) && uri.getPath() != null) {
            sourceFile = new File(uri.getPath());
        } else {
            try (InputStream inputStream = getContentResolver().openInputStream(uri)) {
                if (inputStream == null) return null;
                File tempFile = File.createTempFile("upload_crop_raw_", ".jpg", getCacheDir());
                try (FileOutputStream out = new FileOutputStream(tempFile)) {
                    byte[] buffer = new byte[8192];
                    int read;
                    while ((read = inputStream.read(buffer)) != -1) {
                        out.write(buffer, 0, read);
                    }
                    out.flush();
                }
                sourceFile = tempFile;
            } catch (IOException e) {
                return null;
            }
        }
        return compressImageIfNeeded(sourceFile, 1280, 85);
    }

    /**
     * Downscales oversized smartphone photos to <= maxDimension px JPEG to speed up rural uploads
     * and reduce mobile data usage without sacrificing detection clarity.
     */
    private File compressImageIfNeeded(File sourceFile, int maxDimension, int jpegQuality) {
        if (sourceFile == null || !sourceFile.exists()) return sourceFile;
        try {
            BitmapFactory.Options bounds = new BitmapFactory.Options();
            bounds.inJustDecodeBounds = true;
            BitmapFactory.decodeFile(sourceFile.getAbsolutePath(), bounds);
            int width = bounds.outWidth;
            int height = bounds.outHeight;
            if (width <= 0 || height <= 0) return sourceFile;

            if (Math.max(width, height) <= maxDimension && sourceFile.length() <= 800 * 1024) {
                return sourceFile;
            }

            int inSampleSize = 1;
            while ((width / inSampleSize) > maxDimension * 2 || (height / inSampleSize) > maxDimension * 2) {
                inSampleSize *= 2;
            }

            BitmapFactory.Options decodeOpts = new BitmapFactory.Options();
            decodeOpts.inSampleSize = inSampleSize;
            Bitmap bitmap = BitmapFactory.decodeFile(sourceFile.getAbsolutePath(), decodeOpts);
            if (bitmap == null) return sourceFile;

            int curW = bitmap.getWidth();
            int curH = bitmap.getHeight();
            float scale = Math.min(1.0f, (float) maxDimension / Math.max(curW, curH));
            Bitmap finalBitmap = bitmap;
            if (scale < 1.0f) {
                finalBitmap = Bitmap.createScaledBitmap(
                        bitmap,
                        Math.max(1, Math.round(curW * scale)),
                        Math.max(1, Math.round(curH * scale)),
                        true
                );
                if (finalBitmap != bitmap) {
                    bitmap.recycle();
                }
            }

            File compressedFile = File.createTempFile("upload_crop_opt_", ".jpg", getCacheDir());
            try (FileOutputStream out = new FileOutputStream(compressedFile)) {
                finalBitmap.compress(Bitmap.CompressFormat.JPEG, jpegQuality, out);
                out.flush();
            } finally {
                finalBitmap.recycle();
            }
            return compressedFile.length() < sourceFile.length() ? compressedFile : sourceFile;
        } catch (Exception e) {
            return sourceFile;
        }
    }

    private void setLoading(boolean loading) {
        detectProgressBar.setVisibility(loading ? View.VISIBLE : View.GONE);
        btnSubmitDetection.setEnabled(!loading);
        btnCamera.setEnabled(!loading);
        btnGallery.setEnabled(!loading);
    }
}
