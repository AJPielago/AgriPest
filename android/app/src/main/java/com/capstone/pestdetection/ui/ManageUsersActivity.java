package com.capstone.pestdetection.ui;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.drawerlayout.widget.DrawerLayout;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.capstone.pestdetection.R;
import com.capstone.pestdetection.models.UserDto;
import com.capstone.pestdetection.network.ApiClient;
import com.capstone.pestdetection.network.ApiService;
import com.google.android.material.appbar.MaterialToolbar;

import java.util.ArrayList;
import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ManageUsersActivity extends AppCompatActivity {

    private RecyclerView rvManageUsers;
    private ProgressBar usersProgressBar;
    private UserAdapter adapter;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_manage_users);

        MaterialToolbar toolbar = findViewById(R.id.usersToolbar);
        DrawerLayout drawerLayout = findViewById(R.id.drawer_layout);
        NavigationDrawerHelper.setupDrawer(this, drawerLayout, toolbar, R.id.nav_admin_users);

        rvManageUsers = findViewById(R.id.rvManageUsers);
        usersProgressBar = findViewById(R.id.usersProgressBar);

        rvManageUsers.setLayoutManager(new LinearLayoutManager(this));
        adapter = new UserAdapter();
        rvManageUsers.setAdapter(adapter);

        loadUsers();
    }

    private void loadUsers() {
        usersProgressBar.setVisibility(View.VISIBLE);
        ApiService apiService = ApiClient.getApiService(this);
        apiService.getUsers().enqueue(new Callback<List<UserDto>>() {
            @Override
            public void onResponse(Call<List<UserDto>> call, Response<List<UserDto>> response) {
                usersProgressBar.setVisibility(View.GONE);
                if (response.isSuccessful() && response.body() != null) {
                    adapter.setUsers(response.body());
                } else {
                    Toast.makeText(ManageUsersActivity.this, "Failed to load users (" + response.code() + ")", Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(Call<List<UserDto>> call, Throwable t) {
                usersProgressBar.setVisibility(View.GONE);
                Toast.makeText(ManageUsersActivity.this, "Network error: " + t.getLocalizedMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private static class UserAdapter extends RecyclerView.Adapter<UserAdapter.UserViewHolder> {
        private final List<UserDto> users = new ArrayList<>();

        void setUsers(List<UserDto> newUsers) {
            this.users.clear();
            if (newUsers != null) {
                this.users.addAll(newUsers);
            }
            notifyDataSetChanged();
        }

        @NonNull
        @Override
        public UserViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_user, parent, false);
            return new UserViewHolder(view);
        }

        @Override
        public void onBindViewHolder(@NonNull UserViewHolder holder, int position) {
            UserDto user = users.get(position);
            holder.tvUserItemName.setText(user.getFullName() != null ? user.getFullName() : "User #" + user.getId());
            holder.tvUserItemEmail.setText(user.getEmail());
            String roleStr = (user.getRole() != null && user.getRole().getName() != null) ? user.getRole().getName().toUpperCase() : "FARMER";
            holder.tvUserItemRole.setText(roleStr);
        }

        @Override
        public int getItemCount() {
            return users.size();
        }

        static class UserViewHolder extends RecyclerView.ViewHolder {
            TextView tvUserItemName, tvUserItemEmail, tvUserItemRole;

            UserViewHolder(@NonNull View itemView) {
                super(itemView);
                tvUserItemName = itemView.findViewById(R.id.tvUserItemName);
                tvUserItemEmail = itemView.findViewById(R.id.tvUserItemEmail);
                tvUserItemRole = itemView.findViewById(R.id.tvUserItemRole);
            }
        }
    }
}
