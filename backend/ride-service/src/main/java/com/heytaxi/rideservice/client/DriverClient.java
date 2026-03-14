package com.heytaxi.rideservice.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.math.BigDecimal;

@FeignClient(name = "driver-service", fallback = DriverClient.DriverClientFallback.class)
public interface DriverClient {

    @PostMapping("/api/drivers/internal/{userId}/stats")
    void updateStats(@PathVariable Long userId, @RequestParam BigDecimal earnings);

    class DriverClientFallback implements DriverClient {
        @Override
        public void updateStats(Long userId, BigDecimal earnings) {
            // Log or handle fallback if driver service is down
        }
    }
}
