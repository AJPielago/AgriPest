package com.capstone.pestdetection;

import android.app.Application;
import android.content.Context;
import android.content.SharedPreferences;

import androidx.appcompat.app.AppCompatDelegate;

import com.capstone.pestdetection.utils.LocaleHelper;

public class PestApplication extends Application {

    @Override
    public void onCreate() {
        super.onCreate();
        String lang = LocaleHelper.getLanguage(this);
        java.util.Locale locale = new java.util.Locale(lang);
        java.util.Locale.setDefault(locale);

        SharedPreferences prefs = getSharedPreferences("app_settings", MODE_PRIVATE);
        boolean isDark = prefs.getBoolean("dark_mode", false);
        AppCompatDelegate.setDefaultNightMode(
                isDark ? AppCompatDelegate.MODE_NIGHT_YES : AppCompatDelegate.MODE_NIGHT_NO
        );
    }
}
