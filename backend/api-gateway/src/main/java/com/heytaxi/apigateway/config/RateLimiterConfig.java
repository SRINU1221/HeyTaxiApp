package com.heytaxi.apigateway.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import reactor.core.publisher.Mono;

@Configuration
public class RateLimiterConfig {

    @Bean
    public KeyResolver userKeyResolver() {
        return exchange -> {
            // Safely resolve IP — fall back to "anonymous" if remote address is null
            // A null key with deny-empty-key=false will allow the request through
            var remoteAddress = exchange.getRequest().getRemoteAddress();
            if (remoteAddress == null) {
                return Mono.just("anonymous");
            }
            return Mono.just(remoteAddress.getAddress().getHostAddress());
        };
    }
}