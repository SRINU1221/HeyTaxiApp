package com.heytaxi.fareservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "fare_rules")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FareRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "vehicle_type", nullable = false, unique = true)
    private VehicleType vehicleType;

    @Column(name = "base_fare", nullable = false, precision = 10, scale = 2)
    private BigDecimal baseFare;

    @Column(name = "per_km_rate", nullable = false, precision = 10, scale = 2)
    private BigDecimal perKmRate;

    @Column(name = "per_minute_rate", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal perMinuteRate = new BigDecimal("0.50");

    @Column(name = "minimum_fare", precision = 10, scale = 2)
    private BigDecimal minimumFare;

    @Column(name = "platform_commission", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal platformCommission = new BigDecimal("2.00");

    @Column(name = "surge_multiplier", precision = 4, scale = 2)
    @Builder.Default
    private BigDecimal surgeMultiplier = new BigDecimal("1.00");

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum VehicleType {
        BIKE, AUTO, CAR
    }
}
