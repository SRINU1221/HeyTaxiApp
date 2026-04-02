package com.heytaxi.notificationservice.service;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.data.redis.listener.PatternTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

/**
 * Subscribes to Redis Pub/Sub channels published by ride-service,
 * then forwards events to connected WebSocket clients via STOMP.
 *
 * Channel patterns (from RideEventPublisher):
 *  - ride-events:rider:{riderId}     → pushed to WebSocket /topic/rider/{riderId}
 *  - ride-events:driver:{driverId}   → pushed to WebSocket /topic/driver/{driverId}
 *  - ride-events:all-drivers         → pushed to WebSocket /topic/driver/all-rides
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RideEventSubscriber {

    private final RedisMessageListenerContainer listenerContainer;
    private final SimpMessagingTemplate messagingTemplate;

    @PostConstruct
    public void subscribeToRideEvents() {
        // ✅ Subscribe to ALL rider event channels: ride-events:rider:*
        listenerContainer.addMessageListener(riderEventListener(),
                new PatternTopic("ride-events:rider:*"));

        // ✅ Subscribe to ALL driver event channels: ride-events:driver:*
        listenerContainer.addMessageListener(driverEventListener(),
                new PatternTopic("ride-events:driver:*"));

        // ✅ Subscribe to broadcast channel for all online drivers (new ride requests)
        listenerContainer.addMessageListener(allDriversEventListener(),
                new PatternTopic("ride-events:all-drivers"));

        log.info("[RideEventSubscriber] ✅ Subscribed to Redis ride-events channels");
    }

    /**
     * Handles events for specific riders.
     * Redis channel: ride-events:rider:123
     * WebSocket destination: /topic/rider/123
     */
    private MessageListener riderEventListener() {
        return (message, pattern) -> {
            try {
                String channel = new String(message.getChannel());
                String body = new String(message.getBody());

                // Extract riderId from channel name: ride-events:rider:123 → 123
                String riderId = channel.substring(channel.lastIndexOf(':') + 1);

                log.debug("[WS Push → Rider {}] {}", riderId, body);

                // Push to WebSocket topic for this rider
                messagingTemplate.convertAndSend("/topic/rider/" + riderId, body);

            } catch (Exception e) {
                log.error("[RideEventSubscriber] Failed to forward rider event: {}", e.getMessage());
            }
        };
    }

    /**
     * Handles events for specific drivers.
     * Redis channel: ride-events:driver:456
     * WebSocket destination: /topic/driver/456
     */
    private MessageListener driverEventListener() {
        return (message, pattern) -> {
            try {
                String channel = new String(message.getChannel());
                String body = new String(message.getBody());

                // Extract driverId from channel name
                String driverId = channel.substring(channel.lastIndexOf(':') + 1);

                log.debug("[WS Push → Driver {}] {}", driverId, body);

                messagingTemplate.convertAndSend("/topic/driver/" + driverId, body);

            } catch (Exception e) {
                log.error("[RideEventSubscriber] Failed to forward driver event: {}", e.getMessage());
            }
        };
    }

    /**
     * Handles broadcast events — new ride requests go to ALL online drivers.
     * WebSocket destination: /topic/driver/all-rides
     * Drivers subscribe to this to receive ride requests in real-time.
     */
    private MessageListener allDriversEventListener() {
        return (message, pattern) -> {
            try {
                String body = new String(message.getBody());
                log.debug("[WS Broadcast → All Drivers] New ride request");
                messagingTemplate.convertAndSend("/topic/driver/all-rides", body);
            } catch (Exception e) {
                log.error("[RideEventSubscriber] Failed to broadcast to drivers: {}", e.getMessage());
            }
        };
    }
}
