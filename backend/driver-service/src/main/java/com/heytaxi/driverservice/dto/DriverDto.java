package com.heytaxi.driverservice.dto;

import com.heytaxi.driverservice.entity.Driver;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public class DriverDto {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class RegisterDriverRequest {
        @NotBlank private String vehicleName;
        @NotBlank private String vehicleNumber;
        @NotBlank private String vehicleColor;
        @NotNull private Driver.VehicleType vehicleType;
        @NotBlank private String licenseNumber;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class UpdateLocationRequest {
        @NotNull private Double latitude;
        @NotNull private Double longitude;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class DriverResponse {
        private Long id;
        private Long userId;
        private String name;
        private String email;
        private String phoneNumber;
        private Driver.VehicleType vehicleType;
        private String vehicleName;
        private String vehicleNumber;
        private String vehicleColor;
        private Driver.DriverStatus status;
        private Boolean isVerified;
        private Double currentLatitude;
        private Double currentLongitude;
        private Integer totalRides;
        private BigDecimal totalEarnings;
        private BigDecimal averageRating;
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
