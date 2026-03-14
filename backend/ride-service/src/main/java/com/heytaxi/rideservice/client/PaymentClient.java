package com.heytaxi.rideservice.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.math.BigDecimal;
import java.util.Map;

@FeignClient(name = "payment-service", fallback = PaymentClient.PaymentClientFallback.class)
public interface PaymentClient {

    @PostMapping("/api/payments/create")
    Map<String, Object> createPayment(@RequestBody CreatePaymentRequest request);

    record CreatePaymentRequest(
        Long rideId,
        Long riderId,
        Long driverId,
        BigDecimal totalAmount,
        String paymentMethod
    ) {}

    // Fallback - if payment service is down, ride still completes
    class PaymentClientFallback implements PaymentClient {
        @Override
        public Map<String, Object> createPayment(CreatePaymentRequest request) {
            return Map.of("success", false, "message", "Payment service unavailable");
        }
    }
}
