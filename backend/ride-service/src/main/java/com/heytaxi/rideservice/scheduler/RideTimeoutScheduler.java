package com.heytaxi.rideservice.scheduler;

import com.heytaxi.rideservice.service.RideService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Automatically cancels rides that have been sitting in REQUESTED status
 * for longer than the configured timeout. Notifies the rider via Redis Pub/Sub
 * so the frontend can show "No drivers available" immediately.
 *
 * Runs every 60 seconds.
 */
@Component
@EnableScheduling
@RequiredArgsConstructor
@Slf4j
public class RideTimeoutScheduler {

    private final RideService rideService;

    // ✅ Rides in REQUESTED status for more than 5 minutes → auto-cancel
    private static final Duration RIDE_REQUEST_TIMEOUT = Duration.ofMinutes(5);

    @Scheduled(fixedDelay = 60_000) // Run every 60 seconds
    public void cancelStaleRideRequests() {
        try {
            int cancelled = rideService.cancelStaleRides(RIDE_REQUEST_TIMEOUT);
            if (cancelled > 0) {
                log.info("[RideTimeoutScheduler] Auto-cancelled {} stale ride request(s) (timeout: {} min)",
                        cancelled, RIDE_REQUEST_TIMEOUT.toMinutes());
            }
        } catch (Exception e) {
            log.error("[RideTimeoutScheduler] Error during stale ride cleanup: {}", e.getMessage());
        }
    }
}
