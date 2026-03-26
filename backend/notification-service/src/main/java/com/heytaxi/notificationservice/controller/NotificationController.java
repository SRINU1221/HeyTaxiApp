package com.heytaxi.notificationservice.controller;

import com.heytaxi.notificationservice.service.EmailService;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@Slf4j
public class NotificationController {

    private final EmailService emailService;

    // ─── Ride Lifecycle Notifications ────────────────────────────────────────

    /**
     * Called by ride-service via Feign when a driver accepts a ride.
     * ride-service only has riderId/driverId/rideId — email lookup must be done
     * client-side or we log it. For now we log and return OK so Feign doesn't fail.
     */
    @PostMapping("/ride-accepted")
    public ResponseEntity<Map<String, String>> rideAccepted(@RequestBody RideAcceptedRequest req) {
        log.info("Ride accepted notification: rideId={} riderId={} driverId={}",
                req.getRideId(), req.getRiderId(), req.getDriverId());
        // Email is sent separately via /driver-assigned with full details
        return ResponseEntity.ok(Map.of("status", "logged"));
    }

    @PostMapping("/ride-completed")
    public ResponseEntity<Map<String, String>> sendRideCompleted(@RequestBody RideCompletedRequest req) {
        emailService.sendRideCompletedEmail(req.getEmail(), req.getRiderName(),
                req.getFare(), req.getDistance(), req.getTransactionId());
        return ResponseEntity.ok(Map.of("status", "sent"));
    }

    @PostMapping("/ride-confirmed")
    public ResponseEntity<Map<String, String>> sendRideConfirmation(@RequestBody RideNotificationRequest req) {
        emailService.sendRideConfirmation(req.getEmail(), req.getRiderName(),
                req.getPickupAddress(), req.getDropAddress(), req.getVehicleType(), req.getFare());
        return ResponseEntity.ok(Map.of("status", "sent"));
    }

    @PostMapping("/driver-assigned")
    public ResponseEntity<Map<String, String>> sendDriverAssigned(@RequestBody DriverAssignedRequest req) {
        emailService.sendDriverAssignedEmail(req.getEmail(), req.getRiderName(),
                req.getDriverName(), req.getVehicleNumber(), req.getVehicleType());
        return ResponseEntity.ok(Map.of("status", "sent"));
    }

    @PostMapping("/welcome")
    public ResponseEntity<Map<String, String>> sendWelcome(@RequestBody WelcomeRequest req) {
        emailService.sendWelcomeEmail(req.getEmail(), req.getName());
        return ResponseEntity.ok(Map.of("status", "sent"));
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("Notification Service running 📬");
    }

    // ─── Request DTOs ─────────────────────────────────────────────────────────

    @Getter @Setter
    public static class RideAcceptedRequest {
        private Long riderId;
        private Long driverId;
        private Long rideId;
    }

    @Getter @Setter
    public static class RideNotificationRequest {
        private String email, riderName, pickupAddress, dropAddress, vehicleType, fare;
    }

    @Getter @Setter
    public static class RideCompletedRequest {
        private String email, riderName, fare, distance, transactionId;
    }

    @Getter @Setter
    public static class DriverAssignedRequest {
        private String email, riderName, driverName, vehicleNumber, vehicleType;
    }

    @Getter @Setter
    public static class WelcomeRequest {
        private String email, name;
    }
}
