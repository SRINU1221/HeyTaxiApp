package com.heytaxi.rideservice.dto;

import com.heytaxi.rideservice.entity.Ride;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class RideDto {

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class RideRequest {
        @NotBlank(message = "Pickup address required")
        private String pickupAddress;

        @NotNull
        private Double pickupLatitude;

        @NotNull
        private Double pickupLongitude;

        @NotBlank(message = "Drop address required")
        private String dropAddress;

        @NotNull
        private Double dropLatitude;

        @NotNull
        private Double dropLongitude;

        @NotNull(message = "Vehicle type required")
        private Ride.VehicleType vehicleType;

        private Ride.PaymentMethod paymentMethod;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class StartRideRequest {
        @NotBlank(message = "OTP required")
        private String otp;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class CancelRideRequest {
        private String reason;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class RateRideRequest {
        @NotNull
        private Double rating;
        private String feedback;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class RazorpayPaymentRequest {
        @NotBlank
        private String razorpayPaymentId;
        @NotBlank
        private String razorpayOrderId;
        @NotBlank
        private String razorpaySignature;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class RideResponse {
        private Long id;
        private Long riderId;
        private Long driverId;
        private String pickupAddress;
        private Double pickupLatitude;
        private Double pickupLongitude;
        private String dropAddress;
        private Double dropLatitude;
        private Double dropLongitude;
        private Ride.VehicleType vehicleType;
        private Ride.RideStatus status;
        private String rideOtp;           // shown to rider after ACCEPTED
        private BigDecimal estimatedFare;
        private BigDecimal actualFare;
        private BigDecimal commissionAmount;
        private BigDecimal driverEarnings;
        private BigDecimal distanceKm;
        private Integer durationMinutes;
        private Ride.PaymentMethod paymentMethod;
        private Ride.PaymentStatus paymentStatus;
        private String razorpayOrderId;   // returned when payment method is RAZORPAY
        private LocalDateTime requestedAt;
        private LocalDateTime acceptedAt;
        private LocalDateTime startedAt;
        private LocalDateTime completedAt;
        private Double driverRating;
        private String riderFeedback;
        // Driver's current live location (populated when ride is active)
        private Double driverLatitude;
        private Double driverLongitude;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class AdminStats {
        private long totalRides;
        private long completedRides;
        private long cancelledRides;
        private long activeRides;
        private BigDecimal totalCommissionEarned;
        private BigDecimal totalPlatformRevenue;
        private BigDecimal totalDriverEarnings;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
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
