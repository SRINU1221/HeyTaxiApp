package com.heytaxi.rideservice.event;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

/**
 * Publishes ride lifecycle events to Redis Pub/Sub channels.
 * The notification-service subscribes to these channels and pushes
 * events to connected WebSocket clients (riders + drivers).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RideEventPublisher {

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    // ─── Channel patterns ─────────────────────────────────────────────────────
    // Rider listens on: ride-events:rider:{riderId}
    // Driver listens on: ride-events:driver:{driverId}
    private static final String RIDER_CHANNEL  = "ride-events:rider:%d";
    private static final String DRIVER_CHANNEL = "ride-events:driver:%d";

    /**
     * Publish a ride event to the rider's channel.
     * Rider's browser WebSocket will receive this push.
     */
    public void publishToRider(Long riderId, String eventType, Object payload) {
        String channel = String.format(RIDER_CHANNEL, riderId);
        publishEvent(channel, eventType, payload);
    }

    /**
     * Publish a ride event to a specific driver's channel.
     * Driver's browser WebSocket will receive this push.
     */
    public void publishToDriver(Long driverId, String eventType, Object payload) {
        String channel = String.format(DRIVER_CHANNEL, driverId);
        publishEvent(channel, eventType, payload);
    }

    /**
     * Broadcast a new ride request to ALL online drivers' channels.
     * Used when a rider books a ride — all nearby drivers get notified.
     */
    public void broadcastNewRideRequest(Object ridePayload) {
        String channel = "ride-events:all-drivers";
        publishEvent(channel, "NEW_RIDE_REQUEST", ridePayload);
    }

    private void publishEvent(String channel, String eventType, Object payload) {
        try {
            Map<String, Object> event = new HashMap<>();
            event.put("type", eventType);
            event.put("data", payload);
            event.put("timestamp", System.currentTimeMillis());

            String json = objectMapper.writeValueAsString(event);
            redisTemplate.convertAndSend(channel, json);
            log.debug("[RideEventPublisher] Published '{}' to channel '{}'", eventType, channel);
        } catch (Exception e) {
            log.error("[RideEventPublisher] Failed to publish event '{}': {}", eventType, e.getMessage());
        }
    }
}
