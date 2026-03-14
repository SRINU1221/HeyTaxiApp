package com.heytaxi.fareservice.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

public class FareDto {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class FareEstimateRequest {
        @NotNull private Double pickupLatitude;
        @NotNull private Double pickupLongitude;
        @NotNull private Double dropLatitude;
        @NotNull private Double dropLongitude;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class VehicleFareEstimate {
        private String vehicleType;
        private String vehicleIcon;
        private BigDecimal estimatedFare;
        private BigDecimal minimumFare;
        private BigDecimal baseFare;
        private BigDecimal perKmRate;
        private BigDecimal distanceKm;
        private BigDecimal platformCommission;
        private BigDecimal driverEarnings;
        private String eta;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class FareEstimateResponse {
        private BigDecimal distanceKm;
        private Integer estimatedDurationMinutes;
        private java.util.List<VehicleFareEstimate> vehicles;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class FareRuleResponse {
        private Long id;
        private String vehicleType;
        private BigDecimal baseFare;
        private BigDecimal perKmRate;
        private BigDecimal perMinuteRate;
        private BigDecimal minimumFare;
        private BigDecimal platformCommission;
        private BigDecimal surgeMultiplier;
        private Boolean isActive;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class UpdateFareRuleRequest {
        private BigDecimal baseFare;
        private BigDecimal perKmRate;
        private BigDecimal minimumFare;
        private BigDecimal surgeMultiplier;
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
