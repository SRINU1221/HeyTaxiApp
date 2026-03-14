package com.heytaxi.rideservice.controller;

import com.heytaxi.rideservice.dto.RideDto;
import com.heytaxi.rideservice.entity.Ride;
import com.heytaxi.rideservice.service.RideService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/rides")
@RequiredArgsConstructor
public class RideController {

    private final RideService rideService;

    // ─── RIDER endpoints ─────────────────────────────────────────────────────

    @PostMapping("/request")
    public ResponseEntity<RideDto.ApiResponse<RideDto.RideResponse>> requestRide(
            @RequestHeader("X-User-Id") Long riderId,
            @Valid @RequestBody RideDto.RideRequest request) {
        return ResponseEntity.ok(RideDto.ApiResponse.success("Ride requested! OTP generated.",
                rideService.requestRide(riderId, request)));
    }

    @GetMapping("/current")
    public ResponseEntity<RideDto.ApiResponse<RideDto.RideResponse>> getCurrentRide(
            @RequestHeader("X-User-Id") Long riderId) {
        try {
            return ResponseEntity.ok(RideDto.ApiResponse.success("Current ride",
                    rideService.getCurrentRideForRider(riderId)));
        } catch (Exception e) {
            return ResponseEntity.ok(RideDto.ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/my-rides")
    public ResponseEntity<RideDto.ApiResponse<List<RideDto.RideResponse>>> getRiderHistory(
            @RequestHeader("X-User-Id") Long riderId) {
        return ResponseEntity.ok(RideDto.ApiResponse.success("Ride history",
                rideService.getRiderHistory(riderId)));
    }

    @PostMapping("/{rideId}/cancel")
    public ResponseEntity<RideDto.ApiResponse<RideDto.RideResponse>> cancelRide(
            @PathVariable Long rideId,
            @RequestHeader("X-User-Id") Long userId,
            @RequestBody RideDto.CancelRideRequest request) {
        return ResponseEntity.ok(RideDto.ApiResponse.success("Ride cancelled",
                rideService.cancelRide(rideId, userId, request.getReason())));
    }

    @PostMapping("/{rideId}/rate")
    public ResponseEntity<RideDto.ApiResponse<RideDto.RideResponse>> rateRide(
            @PathVariable Long rideId,
            @RequestHeader("X-User-Id") Long riderId,
            @Valid @RequestBody RideDto.RateRideRequest request) {
        return ResponseEntity.ok(RideDto.ApiResponse.success("Thank you for your rating!",
                rideService.rateRide(rideId, riderId, request)));
    }

    // ✅ Razorpay payment verification by rider
    @PostMapping("/{rideId}/verify-payment")
    public ResponseEntity<RideDto.ApiResponse<RideDto.RideResponse>> verifyPayment(
            @PathVariable Long rideId,
            @RequestHeader("X-User-Id") Long riderId,
            @Valid @RequestBody RideDto.RazorpayPaymentRequest request) {
        return ResponseEntity.ok(RideDto.ApiResponse.success("Payment verified!",
                rideService.verifyRazorpayPayment(rideId, riderId, request)));
    }

    // ─── DRIVER endpoints ─────────────────────────────────────────────────────

    // ✅ Drivers poll this to see available ride requests
    @GetMapping("/available")
    public ResponseEntity<RideDto.ApiResponse<List<RideDto.RideResponse>>> getAvailableRides(
            @RequestHeader("X-User-Id") Long driverId,
            @RequestParam(required = false) Ride.VehicleType vehicleType) {
        return ResponseEntity.ok(RideDto.ApiResponse.success("Available rides",
                rideService.getAvailableRides(vehicleType)));
    }

    @PostMapping("/{rideId}/accept")
    public ResponseEntity<RideDto.ApiResponse<RideDto.RideResponse>> acceptRide(
            @PathVariable Long rideId,
            @RequestHeader("X-User-Id") Long driverId) {
        return ResponseEntity.ok(RideDto.ApiResponse.success("Ride accepted!",
                rideService.acceptRide(rideId, driverId)));
    }

    @PostMapping("/{rideId}/arriving")
    public ResponseEntity<RideDto.ApiResponse<RideDto.RideResponse>> markArriving(
            @PathVariable Long rideId,
            @RequestHeader("X-User-Id") Long driverId) {
        return ResponseEntity.ok(RideDto.ApiResponse.success("Marked as arriving",
                rideService.markArriving(rideId, driverId)));
    }

    // ✅ Driver enters OTP to start ride
    @PostMapping("/{rideId}/start")
    public ResponseEntity<RideDto.ApiResponse<RideDto.RideResponse>> startRide(
            @PathVariable Long rideId,
            @RequestHeader("X-User-Id") Long driverId,
            @Valid @RequestBody RideDto.StartRideRequest request) {
        return ResponseEntity.ok(RideDto.ApiResponse.success("Ride started!",
                rideService.startRide(rideId, driverId, request.getOtp())));
    }

    @PostMapping("/{rideId}/complete")
    public ResponseEntity<RideDto.ApiResponse<RideDto.RideResponse>> completeRide(
            @PathVariable Long rideId,
            @RequestHeader("X-User-Id") Long driverId) {
        return ResponseEntity.ok(RideDto.ApiResponse.success("Ride completed! ₹2 commission deducted.",
                rideService.completeRide(rideId, driverId)));
    }

    @GetMapping("/driver-current")
    public ResponseEntity<RideDto.ApiResponse<RideDto.RideResponse>> getDriverCurrentRide(
            @RequestHeader("X-User-Id") Long driverId) {
        try {
            return ResponseEntity.ok(RideDto.ApiResponse.success("Current ride",
                    rideService.getCurrentRideForDriver(driverId)));
        } catch (Exception e) {
            return ResponseEntity.ok(RideDto.ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/driver-rides")
    public ResponseEntity<RideDto.ApiResponse<List<RideDto.RideResponse>>> getDriverHistory(
            @RequestHeader("X-User-Id") Long driverId) {
        return ResponseEntity.ok(RideDto.ApiResponse.success("Driver ride history",
                rideService.getDriverHistory(driverId)));
    }

    // ─── ADMIN endpoints ─────────────────────────────────────────────────────

    @GetMapping("/admin/stats")
    public ResponseEntity<RideDto.ApiResponse<RideDto.AdminStats>> getAdminStats(
            @RequestHeader("X-User-Role") String role) {
        if (!"ADMIN".equals(role)) return ResponseEntity.status(403).build();
        return ResponseEntity.ok(RideDto.ApiResponse.success("Platform stats",
                rideService.getAdminStats()));
    }
}
