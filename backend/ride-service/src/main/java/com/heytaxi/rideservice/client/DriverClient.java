package com.heytaxi.rideservice.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.cloud.openfeign.FallbackFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

@FeignClient(name = "driver-service", fallbackFactory = DriverClient.DriverClientFallbackFactory.class)
public interface DriverClient {

    @PostMapping("/api/drivers/internal/{userId}/stats")
    void updateStats(@PathVariable Long userId, @RequestParam BigDecimal earnings);

    /**
     * Fetch driver's current location for live tracking.
     * Returns a lightweight map {lat, lng} or null if unavailable.
     */
    @GetMapping("/api/drivers/internal/{userId}/location")
    Map<String, Double> getDriverLocation(@PathVariable Long userId);

    @Component
    @Slf4j
    class DriverClientFallbackFactory implements FallbackFactory<DriverClient> {
        @Override
        public DriverClient create(Throwable cause) {
            log.warn("[DriverClient fallback] Reason: {}", cause.getMessage());
            return new DriverClient() {
                @Override
                public void updateStats(Long userId, BigDecimal earnings) {
                    log.warn("[DriverClient fallback] updateStats skipped for driver {}", userId);
                }

                @Override
                public Map<String, Double> getDriverLocation(Long userId) {
                    log.warn("[DriverClient fallback] getDriverLocation returning empty for driver {}", userId);
                    return java.util.Collections.emptyMap();
                }
            };
        }
    }
}
