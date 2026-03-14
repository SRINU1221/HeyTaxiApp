package com.heytaxi.paymentservice.controller;

import com.heytaxi.paymentservice.dto.PaymentDto;
import com.heytaxi.paymentservice.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    // Called internally by ride-service after ride completion
    @PostMapping("/create")
    public ResponseEntity<PaymentDto.ApiResponse<PaymentDto.PaymentResponse>> createPayment(
            @Valid @RequestBody PaymentDto.CreatePaymentRequest request) {
        return ResponseEntity.ok(PaymentDto.ApiResponse.success("Payment recorded",
                paymentService.createPayment(request)));
    }

    @GetMapping("/ride/{rideId}")
    public ResponseEntity<PaymentDto.ApiResponse<PaymentDto.PaymentResponse>> getByRide(
            @PathVariable Long rideId) {
        return ResponseEntity.ok(PaymentDto.ApiResponse.success("Payment details",
                paymentService.getPaymentByRide(rideId)));
    }

    @GetMapping("/my-payments")
    public ResponseEntity<PaymentDto.ApiResponse<List<PaymentDto.PaymentResponse>>> getRiderPayments(
            @RequestHeader("X-User-Id") Long riderId) {
        return ResponseEntity.ok(PaymentDto.ApiResponse.success("Payment history",
                paymentService.getRiderPayments(riderId)));
    }

    @GetMapping("/driver-payments")
    public ResponseEntity<PaymentDto.ApiResponse<List<PaymentDto.PaymentResponse>>> getDriverPayments(
            @RequestHeader("X-User-Id") Long driverId) {
        return ResponseEntity.ok(PaymentDto.ApiResponse.success("Driver payment history",
                paymentService.getDriverPayments(driverId)));
    }

    // Admin
    @GetMapping("/admin/stats")
    public ResponseEntity<PaymentDto.ApiResponse<PaymentDto.AdminPaymentStats>> getAdminStats(
            @RequestHeader("X-User-Role") String role) {
        if (!"ADMIN".equals(role)) return ResponseEntity.status(403).build();
        return ResponseEntity.ok(PaymentDto.ApiResponse.success("Payment stats",
                paymentService.getAdminStats()));
    }
}
