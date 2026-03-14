package com.heytaxi.driverservice.service;

import com.heytaxi.driverservice.dto.DriverDto;
import com.heytaxi.driverservice.entity.Driver;
import com.heytaxi.driverservice.repository.DriverRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DriverService {

    private final DriverRepository driverRepository;

    @Transactional
    public DriverDto.DriverResponse registerDriver(Long userId, String name, String email,
                                                    String phone, DriverDto.RegisterDriverRequest req) {
        if (driverRepository.existsByUserId(userId)) throw new RuntimeException("Driver already registered");
        if (driverRepository.existsByVehicleNumber(req.getVehicleNumber()))
            throw new RuntimeException("Vehicle number already registered");

        Driver driver = Driver.builder()
                .userId(userId).name(name).email(email).phoneNumber(phone)
                .vehicleType(req.getVehicleType()).vehicleName(req.getVehicleName())
                .vehicleNumber(req.getVehicleNumber().toUpperCase())
                .vehicleColor(req.getVehicleColor()).licenseNumber(req.getLicenseNumber())
                .isVerified(true)  // Auto-verify on registration — admin can revoke if needed
                .build();
        return toResponse(driverRepository.save(driver));
    }

    public DriverDto.DriverResponse getDriverProfile(Long userId) {
        return toResponse(driverRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Driver not found")));
    }

    @Transactional
    public DriverDto.DriverResponse updateStatus(Long userId, Driver.DriverStatus status) {
        Driver driver = driverRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Driver not found"));
        // isVerified check removed — drivers are auto-verified on registration
        driver.setStatus(status);
        return toResponse(driverRepository.save(driver));
    }

    @Transactional
    public void updateDriverStats(Long userId, BigDecimal earnings) {
        driverRepository.findByUserId(userId).ifPresent(driver -> {
            driver.setTotalRides(driver.getTotalRides() + 1);
            driver.setTotalEarnings(driver.getTotalEarnings().add(earnings));
            driver.setStatus(Driver.DriverStatus.ONLINE); // go back to online after ride
            driverRepository.save(driver);
        });
    }

    @Transactional
    public DriverDto.DriverResponse updateLocation(Long userId, DriverDto.UpdateLocationRequest req) {
        Driver driver = driverRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Driver not found"));
        driver.setCurrentLatitude(req.getLatitude());
        driver.setCurrentLongitude(req.getLongitude());
        return toResponse(driverRepository.save(driver));
    }

    public List<DriverDto.DriverResponse> getNearbyDrivers(Double lat, Double lng, Driver.VehicleType type) {
        return driverRepository.findNearbyDrivers(lat, lng, type)
                .stream().limit(10).map(this::toResponse).toList();
    }

    // Admin: verify driver
    @Transactional
    public DriverDto.DriverResponse verifyDriver(Long driverId) {
        Driver driver = driverRepository.findById(driverId)
                .orElseThrow(() -> new RuntimeException("Driver not found"));
        driver.setIsVerified(true);
        return toResponse(driverRepository.save(driver));
    }

    public List<DriverDto.DriverResponse> getAllDrivers() {
        return driverRepository.findAll().stream().map(this::toResponse).toList();
    }

    private DriverDto.DriverResponse toResponse(Driver d) {
        return DriverDto.DriverResponse.builder()
                .id(d.getId()).userId(d.getUserId()).name(d.getName()).email(d.getEmail())
                .phoneNumber(d.getPhoneNumber()).vehicleType(d.getVehicleType())
                .vehicleName(d.getVehicleName()).vehicleNumber(d.getVehicleNumber())
                .vehicleColor(d.getVehicleColor()).status(d.getStatus())
                .isVerified(d.getIsVerified()).currentLatitude(d.getCurrentLatitude())
                .currentLongitude(d.getCurrentLongitude()).totalRides(d.getTotalRides())
                .totalEarnings(d.getTotalEarnings()).averageRating(d.getAverageRating())
                .createdAt(d.getCreatedAt()).build();
    }
}
