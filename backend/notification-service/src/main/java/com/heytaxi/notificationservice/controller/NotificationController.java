package com.heytaxi.notificationservice.controller;

import com.heytaxi.notificationservice.service.EmailService;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final EmailService emailService;

    @PostMapping("/ride-confirmed")
    public ResponseEntity<Map<String, String>> sendRideConfirmation(@RequestBody RideNotificationRequest req) {
        emailService.sendRideConfirmation(req.getEmail(), req.getRiderName(),
                req.getPickupAddress(), req.getDropAddress(), req.getVehicleType(), req.getFare());
        return ResponseEntity.ok(Map.of("status", "sent"));
    }

    @PostMapping("/ride-completed")
    public ResponseEntity<Map<String, String>> sendRideCompleted(@RequestBody RideCompletedRequest req) {
        emailService.sendRideCompletedEmail(req.getEmail(), req.getRiderName(),
                req.getFare(), req.getDistance(), req.getTransactionId());
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

    @Getter @Setter public static class RideNotificationRequest {
        private String email, riderName, pickupAddress, dropAddress, vehicleType, fare;
    }
    @Getter @Setter public static class RideCompletedRequest {
        private String email, riderName, fare, distance, transactionId;
    }
    @Getter @Setter public static class DriverAssignedRequest {
        private String email, riderName, driverName, vehicleNumber, vehicleType;
    }
    @Getter @Setter public static class WelcomeRequest {
        private String email, name;
    }
}
