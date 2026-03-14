package com.heytaxi.rideservice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.heytaxi.rideservice.dto.DriverLocationDto;
import com.heytaxi.rideservice.entity.Ride;
import com.heytaxi.rideservice.repository.RideRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class LocationService {

    private final StringRedisTemplate redisTemplate;
    private final RideRepository rideRepository;
    private final ObjectMapper objectMapper;

    private static final String LOCATION_KEY = "driver:%d:location";
    private static final Duration LOCATION_TTL = Duration.ofSeconds(30); // auto-expire if driver goes silent

    // ─── Driver updates their GPS ─────────────────────────────────────────────
    public void updateDriverLocation(Long driverId, double lat, double lng) {
        String key = String.format(LOCATION_KEY, driverId);
        Map<String, Object> data = new HashMap<>();
        data.put("latitude", lat);
        data.put("longitude", lng);
        data.put("driverId", driverId);
        data.put("updatedAt", System.currentTimeMillis());

        try {
            String json = objectMapper.writeValueAsString(data);
            redisTemplate.opsForValue().set(key, json, LOCATION_TTL);
            log.debug("Driver {} location updated: {},{}", driverId, lat, lng);
        } catch (Exception e) {
            log.error("Failed to store driver location in Redis", e);
        }
    }

    // ─── Rider fetches their driver's current GPS ─────────────────────────────
    public DriverLocationDto getDriverLocationForRide(Long rideId, Long userId) {
        // Find the ride to get driverId
        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new RuntimeException("Ride not found"));

        // Only allow rider of this ride to fetch location
        if (!ride.getRiderId().equals(userId)) {
            throw new RuntimeException("Unauthorized");
        }

        if (ride.getDriverId() == null) {
            // No driver assigned yet — return pickup coords as placeholder
            return new DriverLocationDto(null,
                    ride.getPickupLatitude(), ride.getPickupLongitude(),
                    ride.getVehicleType().name(), System.currentTimeMillis());
        }

        // Try Redis first
        String key = String.format(LOCATION_KEY, ride.getDriverId());
        String json = redisTemplate.opsForValue().get(key);

        if (json != null) {
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> data = objectMapper.readValue(json, Map.class);
                double lat = ((Number) data.get("latitude")).doubleValue();
                double lng = ((Number) data.get("longitude")).doubleValue();
                Long ts = ((Number) data.get("updatedAt")).longValue();
                return new DriverLocationDto(ride.getDriverId(), lat, lng,
                        ride.getVehicleType().name(), ts);
            } catch (Exception e) {
                log.warn("Failed to parse driver location from Redis", e);
            }
        }

        // Fallback: return pickup coordinates (driver hasn't started sending GPS yet)
        log.debug("No Redis location for driver {}, falling back to pickup coords", ride.getDriverId());
        return new DriverLocationDto(ride.getDriverId(),
                ride.getPickupLatitude(), ride.getPickupLongitude(),
                ride.getVehicleType().name(), null);
    }

    // ─── Nearby drivers (for pre-booking map display) ─────────────────────────
    public List<DriverLocationDto> getNearbyDrivers(double lat, double lng, String vehicleType) {
        // Scan all driver location keys from Redis
        List<DriverLocationDto> result = new ArrayList<>();
        Set<String> keys = redisTemplate.keys("driver:*:location");
        if (keys == null) return result;

        for (String key : keys) {
            String json = redisTemplate.opsForValue().get(key);
            if (json == null) continue;
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> data = objectMapper.readValue(json, Map.class);
                double dLat = ((Number) data.get("latitude")).doubleValue();
                double dLng = ((Number) data.get("longitude")).doubleValue();
                Long driverId = ((Number) data.get("driverId")).longValue();
                Long ts = ((Number) data.get("updatedAt")).longValue();

                // Only include drivers within ~5km
                if (distanceKm(lat, lng, dLat, dLng) <= 5.0) {
                    result.add(new DriverLocationDto(driverId, dLat, dLng, vehicleType, ts));
                }
            } catch (Exception e) {
                log.warn("Failed to parse driver location key: {}", key);
            }
        }
        return result;
    }

    // ─── Haversine distance in km ─────────────────────────────────────────────
    private double distanceKm(double lat1, double lon1, double lat2, double lon2) {
        final double R = 6371;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}
