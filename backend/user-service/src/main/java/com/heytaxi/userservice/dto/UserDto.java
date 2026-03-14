package com.heytaxi.userservice.dto;

import jakarta.validation.constraints.Size;
import lombok.*;
import java.time.LocalDateTime;

public class UserDto {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class UpdateProfileRequest {
        private String name;
        @Size(min = 10, max = 10, message = "Phone must be 10 digits")
        private String phoneNumber;
        private String profilePicture;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class UserProfileResponse {
        private Long id;
        private Long userId;
        private String name;
        private String email;
        private String phoneNumber;
        private String profilePicture;
        private String role;
        private Integer totalRides;
        private LocalDateTime createdAt;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ApiResponse<T> {
        private boolean success;
        private String message;
        private T data;

        public static <T> ApiResponse<T> success(String message, T data) {
            return ApiResponse.<T>builder().success(true).message(message).data(data).build();
        }
        public static <T> ApiResponse<T> error(String message) {
            return ApiResponse.<T>builder().success(false).message(message).build();
        }
    }
}
