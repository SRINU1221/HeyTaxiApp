package com.heytaxi.rideservice.client;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.cloud.openfeign.FallbackFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(name = "notification-service", fallbackFactory = NotificationClient.NotificationFallbackFactory.class)
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

    @Component
    @Slf4j
    class NotificationFallbackFactory implements FallbackFactory<NotificationClient> {
        @Override
        public NotificationClient create(Throwable cause) {
            log.warn("[NotificationClient fallback] Reason: {}", cause.getMessage());
            return new NotificationClient() {
                @Override
                public void sendRideAccepted(RideAcceptedRequest request) {
                    log.warn("[NotificationClient fallback] ride-accepted notification skipped");
                }

                @Override
                public void sendRideCompleted(RideCompletedRequest request) {
                    log.warn("[NotificationClient fallback] ride-completed notification skipped");
                }
            };
        }
    }
}
