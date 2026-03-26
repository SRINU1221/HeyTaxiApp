package com.heytaxi.rideservice.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.cloud.openfeign.FallbackFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.math.BigDecimal;
import java.util.Map;

@FeignClient(name = "payment-service", fallbackFactory = PaymentClient.PaymentClientFallbackFactory.class)
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

    @Component
    @Slf4j
    class PaymentClientFallbackFactory implements FallbackFactory<PaymentClient> {
        @Override
        public PaymentClient create(Throwable cause) {
            log.warn("[PaymentClient fallback] Reason: {}", cause.getMessage());
            return request -> {
                log.warn("[PaymentClient fallback] createPayment skipped for ride {}", request.rideId());
                return Map.of("success", false, "message", "Payment service unavailable");
            };
        }
    }
}
