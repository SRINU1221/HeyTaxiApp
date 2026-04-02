package com.heytaxi.notificationservice.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * STOMP WebSocket configuration.
 *
 * Connection flow:
 *  1. Client connects: ws://localhost:8086/ws  (or through nginx proxy)
 *  2. Client subscribes to:
 *     - /topic/rider/{riderId}   → rider receives ride updates
 *     - /topic/driver/{driverId} → driver receives ride requests + status
 *     - /topic/driver/all-rides  → all online drivers get new ride requests
 *  3. Server pushes via SimpMessagingTemplate.convertAndSend(destination, payload)
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // ✅ Enable in-memory message broker for topic-based subscriptions
        config.enableSimpleBroker("/topic", "/queue");
        // Prefix for messages sent FROM client → server (not heavily used here)
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // ✅ WebSocket endpoint — clients connect here
        // SockJS fallback for browsers that don't support native WebSocket
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*") // In prod: restrict to your domain
                .withSockJS();

        // ✅ Also register without SockJS for native WebSocket clients
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*");
    }
}
