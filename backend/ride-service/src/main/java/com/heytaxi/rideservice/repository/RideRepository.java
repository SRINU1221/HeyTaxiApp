package com.heytaxi.rideservice.repository;

import com.heytaxi.rideservice.entity.Ride;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface RideRepository extends JpaRepository<Ride, Long> {

    List<Ride> findByRiderIdOrderByCreatedAtDesc(Long riderId);

    List<Ride> findByDriverIdOrderByCreatedAtDesc(Long driverId);

    // ✅ Available rides for drivers to accept
    List<Ride> findByStatusOrderByRequestedAtAsc(Ride.RideStatus status);

    // ✅ Available rides filtered by vehicle type
    List<Ride> findByStatusAndVehicleTypeOrderByRequestedAtAsc(
            Ride.RideStatus status, Ride.VehicleType vehicleType);

    boolean existsByRiderIdAndStatusIn(Long riderId, List<Ride.RideStatus> statuses);

    Optional<Ride> findFirstByRiderIdAndStatusNotIn(Long riderId, List<Ride.RideStatus> statuses);

    Optional<Ride> findFirstByDriverIdAndStatusIn(Long driverId, List<Ride.RideStatus> statuses);

    long countByStatus(Ride.RideStatus status);

    // ✅ CRITICAL: Pessimistic write lock — prevents two drivers accepting same ride simultaneously
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM Ride r WHERE r.id = :id")
    Optional<Ride> findByIdWithLock(@Param("id") Long id);

    // ✅ Timeout handling: find stale REQUESTED rides older than a cutoff time
    @Query("SELECT r FROM Ride r WHERE r.status = 'REQUESTED' AND r.requestedAt < :cutoff")
    List<Ride> findStaleRequestedRides(@Param("cutoff") LocalDateTime cutoff);

    @Query("SELECT SUM(r.commissionAmount) FROM Ride r WHERE r.status = 'COMPLETED'")
    Optional<BigDecimal> sumCommission();

    @Query("SELECT SUM(r.actualFare) FROM Ride r WHERE r.status = 'COMPLETED'")
    Optional<BigDecimal> sumActualFare();

    @Query("SELECT SUM(r.driverEarnings) FROM Ride r WHERE r.status = 'COMPLETED'")
    Optional<BigDecimal> sumDriverEarnings();
}
