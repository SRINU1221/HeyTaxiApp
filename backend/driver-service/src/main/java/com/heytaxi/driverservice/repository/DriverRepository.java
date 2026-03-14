package com.heytaxi.driverservice.repository;

import com.heytaxi.driverservice.entity.Driver;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DriverRepository extends JpaRepository<Driver, Long> {
    Optional<Driver> findByUserId(Long userId);
    boolean existsByUserId(Long userId);
    boolean existsByVehicleNumber(String vehicleNumber);
    List<Driver> findByStatusAndVehicleType(Driver.DriverStatus status, Driver.VehicleType vehicleType);
    List<Driver> findByStatus(Driver.DriverStatus status);

    @Query("SELECT d FROM Driver d WHERE d.status = 'ONLINE' AND d.vehicleType = :vehicleType " +
           "AND d.currentLatitude IS NOT NULL ORDER BY " +
           "(ABS(d.currentLatitude - :lat) + ABS(d.currentLongitude - :lng)) ASC")
    List<Driver> findNearbyDrivers(@Param("lat") Double lat, @Param("lng") Double lng,
                                   @Param("vehicleType") Driver.VehicleType vehicleType);
}
