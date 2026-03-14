package com.heytaxi.paymentservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payments", indexes = {
    @Index(name = "idx_payment_ride", columnList = "ride_id"),
    @Index(name = "idx_payment_rider", columnList = "rider_id")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ride_id", nullable = false, unique = true)
    private Long rideId;

    @Column(name = "rider_id", nullable = false)
    private Long riderId;

    @Column(name = "driver_id", nullable = false)
    private Long driverId;

    @Column(name = "total_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "commission_amount", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal commissionAmount = new BigDecimal("2.00");

    @Column(name = "driver_earnings", nullable = false, precision = 10, scale = 2)
    private BigDecimal driverEarnings;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private PaymentStatus status = PaymentStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method")
    @Builder.Default
    private PaymentMethod paymentMethod = PaymentMethod.CASH;

    @Column(name = "transaction_id")
    private String transactionId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    public enum PaymentStatus { PENDING, COMPLETED, FAILED, REFUNDED }
    public enum PaymentMethod { CASH, UPI, CARD }
}
