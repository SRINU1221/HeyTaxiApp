package com.heytaxi.rideservice.controller;

import com.heytaxi.rideservice.dto.DriverLocationDto;
import com.heytaxi.rideservice.dto.RideDto;
import com.heytaxi.rideservice.service.LocationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/rides")
@RequiredArgsConstructor
public class LocationController {

    private final LocationService locationService;

    @PatchMapping("/location")
    public ResponseEntity<RideDto.ApiResponse<Void>> updateDriverLocation(
            @RequestHeader("X-User-Id") Long driverId,
            @RequestBody Map<String, Double> body) {

        double lat = body.get("latitude");
        double lng = body.get("longitude");
        locationService.updateDriverLocation(driverId, lat, lng);
        return ResponseEntity.ok(RideDto.ApiResponse.success("Location updated", null));
    }

    @GetMapping("/{rideId}/driver-location")
    public ResponseEntity<RideDto.ApiResponse<DriverLocationDto>> getDriverLocation(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long rideId) {

        DriverLocationDto location = locationService.getDriverLocationForRide(rideId, userId);
        return ResponseEntity.ok(RideDto.ApiResponse.success("Driver location", location));
    }

    @GetMapping("/nearby-drivers")
    public ResponseEntity<RideDto.ApiResponse<List<DriverLocationDto>>> getNearbyDrivers(
            @RequestParam double latitude,
            @RequestParam double longitude,
            @RequestParam(defaultValue = "BIKE") String vehicleType) {

        var drivers = locationService.getNearbyDrivers(latitude, longitude, vehicleType);
        return ResponseEntity.ok(RideDto.ApiResponse.success("Nearby drivers", drivers));
    }
}