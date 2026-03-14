package com.heytaxi.paymentservice.repository;

import com.heytaxi.paymentservice.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByRideId(Long rideId);
    List<Payment> findByRiderIdOrderByCreatedAtDesc(Long riderId);
    List<Payment> findByDriverIdOrderByCreatedAtDesc(Long driverId);

    @Query("SELECT SUM(p.totalAmount) FROM Payment p WHERE p.status = 'COMPLETED'")
    Optional<BigDecimal> sumTotalRevenue();

    @Query("SELECT SUM(p.commissionAmount) FROM Payment p WHERE p.status = 'COMPLETED'")
    Optional<BigDecimal> sumCommission();

    @Query("SELECT SUM(p.driverEarnings) FROM Payment p WHERE p.status = 'COMPLETED'")
    Optional<BigDecimal> sumDriverEarnings();

    long countByStatus(Payment.PaymentStatus status);
}
