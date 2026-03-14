package com.heytaxi.paymentservice.dto;

import com.heytaxi.paymentservice.entity.Payment;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public class PaymentDto {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class CreatePaymentRequest {
        @NotNull private Long rideId;
        @NotNull private Long riderId;
        @NotNull private Long driverId;
        @NotNull private BigDecimal totalAmount;
        private Payment.PaymentMethod paymentMethod;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class PaymentResponse {
        private Long id;
        private Long rideId;
        private Long riderId;
        private Long driverId;
        private BigDecimal totalAmount;
        private BigDecimal commissionAmount;
        private BigDecimal driverEarnings;
        private Payment.PaymentStatus status;
        private Payment.PaymentMethod paymentMethod;
        private String transactionId;
        private LocalDateTime createdAt;
        private LocalDateTime paidAt;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class AdminPaymentStats {
        private long totalTransactions;
        private BigDecimal totalRevenue;
        private BigDecimal totalCommission;
        private BigDecimal totalDriverEarnings;
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
