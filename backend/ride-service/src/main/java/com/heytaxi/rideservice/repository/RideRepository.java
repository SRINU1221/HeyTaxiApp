package com.heytaxi.rideservice.repository;

import com.heytaxi.rideservice.entity.Ride;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
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

    @Query("SELECT SUM(r.commissionAmount) FROM Ride r WHERE r.status = 'COMPLETED'")
    Optional<BigDecimal> sumCommission();

    @Query("SELECT SUM(r.actualFare) FROM Ride r WHERE r.status = 'COMPLETED'")
    Optional<BigDecimal> sumActualFare();

    @Query("SELECT SUM(r.driverEarnings) FROM Ride r WHERE r.status = 'COMPLETED'")
    Optional<BigDecimal> sumDriverEarnings();
}
