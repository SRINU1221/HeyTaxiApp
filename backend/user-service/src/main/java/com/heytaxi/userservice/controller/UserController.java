package com.heytaxi.userservice.controller;

import com.heytaxi.userservice.dto.UserDto;
import com.heytaxi.userservice.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<UserDto.ApiResponse<UserDto.UserProfileResponse>> getMe(
            @RequestHeader("X-User-Id") Long userId,
            @RequestHeader(value = "X-User-Name", required = false) String name,
            @RequestHeader("X-User-Email") String email,
            @RequestHeader(value = "X-User-Phone", required = false) String phone,
            @RequestHeader(value = "X-User-Role", required = false) String role) {
        String resolvedName = (name != null && !name.isBlank()) ? name : email.split("@")[0];
        return ResponseEntity.ok(UserDto.ApiResponse.success("Current user",
                userService.getOrCreateProfile(userId, resolvedName, email, phone, role)));
    }

    @GetMapping("/profile")
    public ResponseEntity<UserDto.ApiResponse<UserDto.UserProfileResponse>> getProfile(
            @RequestHeader("X-User-Id") Long userId,
            @RequestHeader(value = "X-User-Name", required = false) String name,
            @RequestHeader("X-User-Email") String email,
            @RequestHeader(value = "X-User-Phone", required = false) String phone,
            @RequestHeader(value = "X-User-Role", required = false) String role) {
        // Fallback: derive name from email if header not present
        String resolvedName = (name != null && !name.isBlank()) ? name : email.split("@")[0];
        return ResponseEntity.ok(UserDto.ApiResponse.success("Profile",
                userService.getOrCreateProfile(userId, resolvedName, email, phone, role)));
    }

    @PutMapping("/profile")
    public ResponseEntity<UserDto.ApiResponse<UserDto.UserProfileResponse>> updateProfile(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody UserDto.UpdateProfileRequest request) {
        return ResponseEntity.ok(UserDto.ApiResponse.success("Profile updated",
                userService.updateProfile(userId, request)));
    }

    // Internal — called by ride-service after ride completion
    @PostMapping("/internal/{userId}/increment-rides")
    public ResponseEntity<Void> incrementRides(@PathVariable Long userId) {
        userService.incrementRideCount(userId);
        return ResponseEntity.ok().build();
    }

    // Admin
    @GetMapping("/admin/all")
    public ResponseEntity<UserDto.ApiResponse<List<UserDto.UserProfileResponse>>> getAllUsers(
            @RequestHeader("X-User-Role") String role) {
        if (!"ADMIN".equals(role)) return ResponseEntity.status(403).build();
        return ResponseEntity.ok(UserDto.ApiResponse.success("All users", userService.getAllUsers()));
    }
}
