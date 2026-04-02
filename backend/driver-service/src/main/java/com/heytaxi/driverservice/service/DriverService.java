package com.heytaxi.driverservice.service;

import com.heytaxi.driverservice.dto.DriverDto;
import com.heytaxi.driverservice.entity.Driver;
import com.heytaxi.driverservice.repository.DriverRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.geo.Circle;
import org.springframework.data.geo.Distance;
import org.springframework.data.geo.GeoResults;
import org.springframework.data.geo.Metrics;
import org.springframework.data.geo.Point;
import org.springframework.data.redis.connection.RedisGeoCommands;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.domain.geo.GeoReference;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class DriverService {

    private final DriverRepository driverRepository;
    private final RedisTemplate<String, String> redisTemplate;

    // ✅ Redis GeoSpatial key for driver positions
    // Format: GEOADD drivers:geo <lng> <lat> <driverId>
    private static final String GEO_KEY = "drivers:geo";

    @Transactional
    public DriverDto.DriverResponse registerDriver(Long userId, String name, String email,
                                                    String phone, DriverDto.RegisterDriverRequest req) {
        if (driverRepository.existsByUserId(userId)) throw new RuntimeException("Driver already registered");
        if (driverRepository.existsByVehicleNumber(req.getVehicleNumber()))
            throw new RuntimeException("Vehicle number already registered");

        Driver driver = Driver.builder()
                .userId(userId).name(name).email(email).phoneNumber(phone)
                .vehicleType(req.getVehicleType()).vehicleName(req.getVehicleName())
                .vehicleNumber(req.getVehicleNumber().toUpperCase())
                .vehicleColor(req.getVehicleColor()).licenseNumber(req.getLicenseNumber())
                .isVerified(true)  // Auto-verify on registration
                .build();
        return toResponse(driverRepository.save(driver));
    }

    public DriverDto.DriverResponse getDriverProfile(Long userId) {
        return toResponse(driverRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Driver not found")));
    }

    @Transactional
    public DriverDto.DriverResponse updateStatus(Long userId, Driver.DriverStatus status) {
        Driver driver = driverRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Driver not found"));

        driver.setStatus(status);
        Driver saved = driverRepository.save(driver);

        // ✅ When driver goes OFFLINE or ON_RIDE → remove from geo index
        if (status == Driver.DriverStatus.OFFLINE || status == Driver.DriverStatus.ON_RIDE) {
            try {
                redisTemplate.opsForGeo().remove(GEO_KEY, String.valueOf(saved.getId()));
                log.debug("Removed driver {} from geo index (status: {})", saved.getId(), status);
            } catch (Exception e) {
                log.warn("Failed to remove driver {} from geo index: {}", saved.getId(), e.getMessage());
            }
        }

        // ✅ When driver goes ONLINE and has a known location → add to geo index
        if (status == Driver.DriverStatus.ONLINE
                && saved.getCurrentLatitude() != null
                && saved.getCurrentLongitude() != null) {
            try {
                redisTemplate.opsForGeo().add(GEO_KEY,
                        new Point(saved.getCurrentLongitude(), saved.getCurrentLatitude()),
                        String.valueOf(saved.getId()));
                log.debug("Added driver {} to geo index at {},{}", saved.getId(),
                        saved.getCurrentLatitude(), saved.getCurrentLongitude());
            } catch (Exception e) {
                log.warn("Failed to add driver {} to geo index: {}", saved.getId(), e.getMessage());
            }
        }

        return toResponse(saved);
    }

    @Transactional
    public void updateDriverStats(Long userId, BigDecimal earnings) {
        driverRepository.findByUserId(userId).ifPresent(driver -> {
            driver.setTotalRides(driver.getTotalRides() + 1);
            driver.setTotalEarnings(driver.getTotalEarnings().add(earnings));
            driver.setStatus(Driver.DriverStatus.ONLINE); // go back online after ride

            // ✅ Re-add to geo index after ride completes (if location known)
            if (driver.getCurrentLatitude() != null && driver.getCurrentLongitude() != null) {
                try {
                    redisTemplate.opsForGeo().add(GEO_KEY,
                            new Point(driver.getCurrentLongitude(), driver.getCurrentLatitude()),
                            String.valueOf(driver.getId()));
                } catch (Exception e) {
                    log.warn("Failed to re-add driver {} to geo after ride: {}", driver.getId(), e.getMessage());
                }
            }
            driverRepository.save(driver);
        });
    }

    @Transactional
    public DriverDto.DriverResponse updateLocation(Long userId, DriverDto.UpdateLocationRequest req) {
        Driver driver = driverRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Driver not found"));

        driver.setCurrentLatitude(req.getLatitude());
        driver.setCurrentLongitude(req.getLongitude());
        Driver saved = driverRepository.save(driver);

        // ✅ Update Redis GeoSpatial index if driver is ONLINE
        if (saved.getStatus() == Driver.DriverStatus.ONLINE) {
            try {
                redisTemplate.opsForGeo().add(GEO_KEY,
                        new Point(req.getLongitude(), req.getLatitude()),
                        String.valueOf(saved.getId()));
            } catch (Exception e) {
                log.warn("Failed to update geo for driver {}: {}", saved.getId(), e.getMessage());
            }
        }

        return toResponse(saved);
    }

    /**
     * Find nearby drivers using Redis GeoSpatial commands (GEORADIUS).
     * Falls back to JPA query if Redis geo is unavailable.
     *
     * @param lat         center latitude
     * @param lng         center longitude
     * @param vehicleType filter by vehicle type (null = all types)
     * @param radiusKm    search radius in km (default 5km)
     */
    public List<DriverDto.DriverResponse> getNearbyDrivers(Double lat, Double lng,
                                                           Driver.VehicleType vehicleType,
                                                           double radiusKm) {
        List<DriverDto.DriverResponse> result = new ArrayList<>();

        try {
            // ✅ Try Redis GeoSpatial first — O(N+log(N)) query
            GeoResults<RedisGeoCommands.GeoLocation<String>> geoResults =
                    redisTemplate.opsForGeo().search(
                            GEO_KEY,
                            GeoReference.fromCoordinate(new Point(lng, lat)),
                            new Distance(radiusKm, Metrics.KILOMETERS),
                            RedisGeoCommands.GeoSearchCommandArgs.newGeoSearchArgs()
                                    .includeCoordinates()
                                    .includeDistance()
                                    .sortAscending()
                                    .limit(20)
                    );

            if (geoResults != null && !geoResults.getContent().isEmpty()) {
                for (var geoResult : geoResults.getContent()) {
                    String driverIdStr = geoResult.getContent().getName();
                    try {
                        Long driverId = Long.parseLong(driverIdStr);
                        driverRepository.findById(driverId).ifPresent(driver -> {
                            // Filter by vehicle type if specified
                            if (vehicleType == null || driver.getVehicleType() == vehicleType) {
                                if (driver.getStatus() == Driver.DriverStatus.ONLINE) {
                                    result.add(toResponse(driver));
                                }
                            }
                        });
                    } catch (NumberFormatException e) {
                        log.warn("Invalid driver id in geo index: {}", driverIdStr);
                    }
                }
                log.debug("Redis geo found {} nearby drivers within {}km", result.size(), radiusKm);
                return result;
            }
        } catch (Exception e) {
            log.warn("Redis geo search failed, falling back to JPA: {}", e.getMessage());
        }

        // ✅ JPA fallback — works even without Redis
        log.debug("Falling back to JPA for nearby driver search");
        if (vehicleType != null) {
            return driverRepository.findNearbyDrivers(lat, lng, vehicleType)
                    .stream().limit(10).map(this::toResponse).toList();
        } else {
            return driverRepository.findAll().stream()
                    .filter(d -> d.getStatus() == Driver.DriverStatus.ONLINE)
                    .filter(d -> d.getCurrentLatitude() != null)
                    .filter(d -> haversineKm(lat, lng, d.getCurrentLatitude(), d.getCurrentLongitude()) <= radiusKm)
                    .sorted((a, b) -> Double.compare(
                            haversineKm(lat, lng, a.getCurrentLatitude(), a.getCurrentLongitude()),
                            haversineKm(lat, lng, b.getCurrentLatitude(), b.getCurrentLongitude())))
                    .limit(10)
                    .map(this::toResponse)
                    .toList();
        }
    }

    // Admin: verify driver
    @Transactional
    public DriverDto.DriverResponse verifyDriver(Long driverId) {
        Driver driver = driverRepository.findById(driverId)
                .orElseThrow(() -> new RuntimeException("Driver not found"));
        driver.setIsVerified(true);
        return toResponse(driverRepository.save(driver));
    }

    public List<DriverDto.DriverResponse> getAllDrivers() {
        return driverRepository.findAll().stream().map(this::toResponse).toList();
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private double haversineKm(double lat1, double lon1, double lat2, double lon2) {
        final double R = 6371;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    private DriverDto.DriverResponse toResponse(Driver d) {
        return DriverDto.DriverResponse.builder()
                .id(d.getId()).userId(d.getUserId()).name(d.getName()).email(d.getEmail())
                .phoneNumber(d.getPhoneNumber()).vehicleType(d.getVehicleType())
                .vehicleName(d.getVehicleName()).vehicleNumber(d.getVehicleNumber())
                .vehicleColor(d.getVehicleColor()).status(d.getStatus())
                .isVerified(d.getIsVerified()).currentLatitude(d.getCurrentLatitude())
                .currentLongitude(d.getCurrentLongitude()).totalRides(d.getTotalRides())
                .totalEarnings(d.getTotalEarnings()).averageRating(d.getAverageRating())
                .createdAt(d.getCreatedAt()).build();
    }
}
