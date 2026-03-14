package com.heytaxi.driverservice.controller;

import com.heytaxi.driverservice.dto.DriverDto;
import com.heytaxi.driverservice.entity.Driver;
import com.heytaxi.driverservice.service.DriverService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/drivers")
@RequiredArgsConstructor
public class DriverController {

    private final DriverService driverService;

    @PostMapping("/register")
    public ResponseEntity<DriverDto.ApiResponse<DriverDto.DriverResponse>> register(
            @RequestHeader("X-User-Id") Long userId,
            @RequestHeader("X-User-Name") String name,
            @RequestHeader("X-User-Email") String email,
            @RequestHeader(value = "X-User-Phone", required = false) String phone,
            @Valid @RequestBody DriverDto.RegisterDriverRequest request) {
        return ResponseEntity.ok(DriverDto.ApiResponse.success("Driver registered",
                driverService.registerDriver(userId, name, email, phone, request)));
    }

    @GetMapping("/profile")
    public ResponseEntity<DriverDto.ApiResponse<DriverDto.DriverResponse>> getProfile(
            @RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(DriverDto.ApiResponse.success("Driver profile",
                driverService.getDriverProfile(userId)));
    }

    @PatchMapping("/status")
    public ResponseEntity<DriverDto.ApiResponse<DriverDto.DriverResponse>> updateStatus(
            @RequestHeader("X-User-Id") Long userId,
            @RequestParam Driver.DriverStatus status) {
        return ResponseEntity.ok(DriverDto.ApiResponse.success("Status updated",
                driverService.updateStatus(userId, status)));
    }

    @PatchMapping("/location")
    public ResponseEntity<DriverDto.ApiResponse<DriverDto.DriverResponse>> updateLocation(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody DriverDto.UpdateLocationRequest request) {
        return ResponseEntity.ok(DriverDto.ApiResponse.success("Location updated",
                driverService.updateLocation(userId, request)));
    }

    @GetMapping("/nearby")
    public ResponseEntity<DriverDto.ApiResponse<List<DriverDto.DriverResponse>>> getNearby(
            @RequestParam Double lat, @RequestParam Double lng,
            @RequestParam Driver.VehicleType vehicleType) {
        return ResponseEntity.ok(DriverDto.ApiResponse.success("Nearby drivers",
                driverService.getNearbyDrivers(lat, lng, vehicleType)));
    }

    // Internal endpoint for ride-service to update driver stats
    @PostMapping("/internal/{userId}/stats")
    public ResponseEntity<Void> updateStats(@PathVariable Long userId, @RequestParam BigDecimal earnings) {
        driverService.updateDriverStats(userId, earnings);
        return ResponseEntity.ok().build();
    }

    // Admin endpoints
    @GetMapping("/admin/all")
    public ResponseEntity<DriverDto.ApiResponse<List<DriverDto.DriverResponse>>> getAllDrivers(
            @RequestHeader("X-User-Role") String role) {
        if (!"ADMIN".equals(role)) return ResponseEntity.status(403).build();
        return ResponseEntity.ok(DriverDto.ApiResponse.success("All drivers", driverService.getAllDrivers()));
    }

    @PatchMapping("/admin/{driverId}/verify")
    public ResponseEntity<DriverDto.ApiResponse<DriverDto.DriverResponse>> verifyDriver(
            @PathVariable Long driverId,
            @RequestHeader("X-User-Role") String role) {
        if (!"ADMIN".equals(role)) return ResponseEntity.status(403).build();
        return ResponseEntity.ok(DriverDto.ApiResponse.success("Driver verified",
                driverService.verifyDriver(driverId)));
    }
}
