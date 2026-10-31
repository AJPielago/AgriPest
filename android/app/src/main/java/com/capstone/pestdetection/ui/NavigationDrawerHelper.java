package com.capstone.pestdetection.ui;

import android.app.Activity;
import android.content.Intent;
import android.view.View;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.ActionBarDrawerToggle;
import androidx.appcompat.widget.Toolbar;
import androidx.core.view.GravityCompat;
import androidx.drawerlayout.widget.DrawerLayout;

import com.capstone.pestdetection.R;
import com.capstone.pestdetection.network.SessionManager;
import com.google.android.material.navigation.NavigationView;

public class NavigationDrawerHelper {

    public static void setupDrawer(final Activity activity, final DrawerLayout drawerLayout, Toolbar toolbar, int activeMenuItemId) {
        if (drawerLayout == null || toolbar == null) return;

        final SessionManager sessionManager = new SessionManager(activity);

        ActionBarDrawerToggle toggle = new ActionBarDrawerToggle(
                activity, drawerLayout, toolbar,
                R.string.navigation_drawer_open, R.string.navigation_drawer_close
        );
        drawerLayout.addDrawerListener(toggle);
        toggle.syncState();

        NavigationView navigationView = activity.findViewById(R.id.nav_view);
        if (navigationView != null) {
            View headerView = navigationView.getHeaderView(0);
            if (headerView != null) {
                TextView tvNavUserName = headerView.findViewById(R.id.tvNavUserName);
                TextView tvNavUserRole = headerView.findViewById(R.id.tvNavUserRole);
                TextView tvNavUserAvatar = headerView.findViewById(R.id.tvNavUserAvatar);

                String name = sessionManager.getFullName();
                String email = sessionManager.getEmail();
                String role = sessionManager.getRole();

                String isTl = com.capstone.pestdetection.utils.LocaleHelper.getLanguage(activity);
                String defaultName = "tl".equals(isTl) ? "Magsasaka" : "Alex Rivers";
                if (tvNavUserName != null) {
                    tvNavUserName.setText(!name.isEmpty() ? name : (!email.isEmpty() ? email : defaultName));
                }
                if (tvNavUserRole != null) {
                    boolean isAdmin = "admin".equalsIgnoreCase(role);
                    String roleText = isAdmin
                            ? ("tl".equals(isTl) ? "Tagapamahala ng Sistema (Admin)" : "System Administrator")
                            : ("tl".equals(isTl) ? "Tagapamahala ng Bukid" : "Farm Manager");
                    tvNavUserRole.setText(roleText);
                }
                if (tvNavUserAvatar != null) {
                    tvNavUserAvatar.setText(!name.isEmpty() ? String.valueOf(name.charAt(0)).toUpperCase() : "A");
                }
            }

            boolean isAdmin = "admin".equalsIgnoreCase(sessionManager.getRole());
            navigationView.getMenu().setGroupVisible(R.id.grp_admin, isAdmin);

            if (activeMenuItemId != 0) {
                navigationView.setCheckedItem(activeMenuItemId);
            }

            navigationView.setNavigationItemSelectedListener(item -> {
                int id = item.getItemId();
                drawerLayout.closeDrawer(GravityCompat.START);

                if (id == activeMenuItemId) return true;

                if (id == R.id.nav_dashboard) {
                    activity.startActivity(new Intent(activity, MainActivity.class));
                } else if (id == R.id.nav_detect) {
                    activity.startActivity(new Intent(activity, DetectActivity.class));
                } else if (id == R.id.nav_history) {
                    activity.startActivity(new Intent(activity, HistoryActivity.class));
                } else if (id == R.id.nav_monitoring) {
                    activity.startActivity(new Intent(activity, FarmMonitoringActivity.class));
                } else if (id == R.id.nav_crops) {
                    activity.startActivity(new Intent(activity, ManageCropsActivity.class));
                } else if (id == R.id.nav_pests) {
                    activity.startActivity(new Intent(activity, PestLibraryActivity.class));
                } else if (id == R.id.nav_reports) {
                    activity.startActivity(new Intent(activity, ReportsActivity.class));
                } else if (id == R.id.nav_notifications) {
                    activity.startActivity(new Intent(activity, NotificationsActivity.class));
                } else if (id == R.id.nav_settings) {
                    activity.startActivity(new Intent(activity, SettingsActivity.class));
                } else if (id == R.id.nav_admin_dashboard) {
                    activity.startActivity(new Intent(activity, AdminDashboardActivity.class));
                } else if (id == R.id.nav_logout) {
                    sessionManager.clearSession();
                    Toast.makeText(activity, activity.getString(R.string.logged_out_success), Toast.LENGTH_SHORT).show();
                    Intent intent = new Intent(activity, LoginActivity.class);
                    intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
                    activity.startActivity(intent);
                    activity.finish();
                }
                return true;
            });
        }
    }
}
