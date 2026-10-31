package com.capstone.pestdetection.ui;

import android.content.Context;
import androidx.appcompat.app.AppCompatActivity;
import com.capstone.pestdetection.utils.LocaleHelper;

public abstract class BaseActivity extends AppCompatActivity {
    @Override
    protected void attachBaseContext(Context newBase) {
        super.attachBaseContext(LocaleHelper.wrap(newBase));
    }
}
