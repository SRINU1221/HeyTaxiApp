package com.heytaxi.rideservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "rides", indexes = {
        @Index(name = "idx_ride_rider", columnList = "rider_id"),
        @Index(name = "idx_ride_driver", columnList = "driver_id"),
        @Index(name = "idx_ride_status", columnList = "status")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Ride {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ✅ Optimistic locking — prevents race conditions on concurrent updates
    @Version
    @Column(name = "version")
    private Long version;

    @Column(name = "rider_id", nullable = false)
    private Long riderId;

    @Column(name = "driver_id")
    private Long driverId;

    // Pickup location
    @Column(name = "pickup_address", nullable = false)
    private String pickupAddress;

    @Column(name = "pickup_latitude", nullable = false)
    private Double pickupLatitude;

    @Column(name = "pickup_longitude", nullable = false)
    private Double pickupLongitude;

    // Drop location
    @Column(name = "drop_address", nullable = false)
    private String dropAddress;

    @Column(name = "drop_latitude", nullable = false)
    private Double dropLatitude;

    @Column(name = "drop_longitude", nullable = false)
    private Double dropLongitude;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VehicleType vehicleType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private RideStatus status = RideStatus.REQUESTED;

    // ✅ OTP for ride start verification (like Uber/Rapido)
    @Column(name = "ride_otp", length = 4)
    private String rideOtp;

    // Fare details
    @Column(name = "estimated_fare", precision = 10, scale = 2)
    private BigDecimal estimatedFare;

    @Column(name = "actual_fare", precision = 10, scale = 2)
    private BigDecimal actualFare;

    @Column(name = "commission_amount", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal commissionAmount = new BigDecimal("2.00"); // ₹2 fixed commission

    @Column(name = "driver_earnings", precision = 10, scale = 2)
    private BigDecimal driverEarnings;

    @Column(name = "distance_km", precision = 10, scale = 2)
    private BigDecimal distanceKm;

    @Column(name = "duration_minutes")
    private Integer durationMinutes;

    // Payment
    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method")
    @Builder.Default
    private PaymentMethod paymentMethod = PaymentMethod.CASH;

    @Column(name = "payment_status")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private PaymentStatus paymentStatus = PaymentStatus.PENDING;

    @Column(name = "razorpay_order_id")
    private String razorpayOrderId;

    @Column(name = "razorpay_payment_id")
    private String razorpayPaymentId;

    // Timestamps
    @Column(name = "requested_at")
    private LocalDateTime requestedAt;

    @Column(name = "accepted_at")
    private LocalDateTime acceptedAt;

    // ✅ NEW: when driver marks arrived at pickup
    @Column(name = "arrived_at")
    private LocalDateTime arrivedAt;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @Column(name = "cancellation_reason")
    private String cancellationReason;

    // Rating
    @Column(name = "rider_rating")
    private Double riderRating;

    @Column(name = "driver_rating")
    private Double driverRating;

    @Column(name = "rider_feedback")
    private String riderFeedback;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum RideStatus {
        REQUESTED,       // Rider requested, waiting for driver
        ACCEPTED,        // Driver accepted, heading to pickup
        DRIVER_ARRIVING, // Driver on the way / arrived at pickup (kept for backward compat)
        ARRIVED,         // ✅ NEW: Driver physically at pickup location
        ONGOING,         // OTP verified, ride in progress
        COMPLETED,       // Ride done
        CANCELLED        // Cancelled by rider or driver
    }

    public enum VehicleType {
        BIKE, AUTO, CAR
    }

    public enum PaymentMethod {
        CASH, RAZORPAY, UPI  // ✅ Added UPI
    }

    public enum PaymentStatus {
        PENDING, COMPLETED, FAILED
    }
}
