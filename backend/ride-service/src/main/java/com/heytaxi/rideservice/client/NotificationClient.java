package com.heytaxi.rideservice.client;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(name = "notification-service", fallback = NotificationClient.NotificationFallback.class)
public interface NotificationClient {

    @PostMapping("/api/notifications/ride-accepted")
    void sendRideAccepted(@RequestBody RideAcceptedRequest request);

    @PostMapping("/api/notifications/ride-completed")
    void sendRideCompleted(@RequestBody RideCompletedRequest request);

    @Data @NoArgsConstructor @AllArgsConstructor
    class RideAcceptedRequest {
        private Long riderId;
        private Long driverId;
        private Long rideId;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    class RideCompletedRequest {
        private String email;
        private String riderName;
        private String fare;
        private String distance;
        private String rideRef;
    }

    @Slf4j
    class NotificationFallback implements NotificationClient {
        @Override
        public void sendRideAccepted(RideAcceptedRequest request) {
            log.warn("Notification service unavailable — ride accepted notification skipped");
        }

        @Override
        public void sendRideCompleted(RideCompletedRequest request) {
            log.warn("Notification service unavailable — ride completed notification skipped");
        }
    }
}
