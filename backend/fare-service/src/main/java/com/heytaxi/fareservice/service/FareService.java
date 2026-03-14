package com.heytaxi.fareservice.service;

import com.heytaxi.fareservice.dto.FareDto;
import com.heytaxi.fareservice.entity.FareRule;
import com.heytaxi.fareservice.repository.FareRuleRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class FareService {

    private final FareRuleRepository fareRuleRepository;

    // Seed default fare rules on startup
    @PostConstruct
    public void initFareRules() {
        if (fareRuleRepository.count() == 0) {
            fareRuleRepository.saveAll(List.of(
                FareRule.builder().vehicleType(FareRule.VehicleType.BIKE)
                    .baseFare(new BigDecimal("20.00")).perKmRate(new BigDecimal("8.00"))
                    .minimumFare(new BigDecimal("30.00")).platformCommission(new BigDecimal("2.00")).build(),
                FareRule.builder().vehicleType(FareRule.VehicleType.AUTO)
                    .baseFare(new BigDecimal("25.00")).perKmRate(new BigDecimal("12.00"))
                    .minimumFare(new BigDecimal("40.00")).platformCommission(new BigDecimal("2.00")).build(),
                FareRule.builder().vehicleType(FareRule.VehicleType.CAR)
                    .baseFare(new BigDecimal("40.00")).perKmRate(new BigDecimal("18.00"))
                    .minimumFare(new BigDecimal("60.00")).platformCommission(new BigDecimal("2.00")).build()
            ));
            log.info("Default fare rules initialized");
        }
    }

    public FareDto.FareEstimateResponse estimateFare(FareDto.FareEstimateRequest req) {
        double distanceKm = haversineDistance(
            req.getPickupLatitude(), req.getPickupLongitude(),
            req.getDropLatitude(), req.getDropLongitude()
        );
        int durationMinutes = (int) Math.ceil(distanceKm * 3); // ~20km/h average city speed

        List<FareRule> rules = fareRuleRepository.findByIsActiveTrue();
        List<FareDto.VehicleFareEstimate> vehicles = rules.stream().map(rule -> {
            BigDecimal dist = BigDecimal.valueOf(distanceKm).setScale(2, RoundingMode.HALF_UP);
            BigDecimal fare = rule.getBaseFare()
                .add(rule.getPerKmRate().multiply(dist))
                .multiply(rule.getSurgeMultiplier())
                .setScale(2, RoundingMode.HALF_UP);
            if (fare.compareTo(rule.getMinimumFare()) < 0) fare = rule.getMinimumFare();
            BigDecimal driverEarnings = fare.subtract(rule.getPlatformCommission());

            return FareDto.VehicleFareEstimate.builder()
                .vehicleType(rule.getVehicleType().name())
                .vehicleIcon(getIcon(rule.getVehicleType()))
                .estimatedFare(fare)
                .minimumFare(rule.getMinimumFare())
                .baseFare(rule.getBaseFare())
                .perKmRate(rule.getPerKmRate())
                .distanceKm(dist)
                .platformCommission(rule.getPlatformCommission())
                .driverEarnings(driverEarnings)
                .eta(getEta(rule.getVehicleType(), distanceKm))
                .build();
        }).toList();

        return FareDto.FareEstimateResponse.builder()
            .distanceKm(BigDecimal.valueOf(distanceKm).setScale(2, RoundingMode.HALF_UP))
            .estimatedDurationMinutes(durationMinutes)
            .vehicles(vehicles)
            .build();
    }

    public BigDecimal calculateFare(String vehicleType, double distanceKm) {
        FareRule rule = fareRuleRepository.findByVehicleType(FareRule.VehicleType.valueOf(vehicleType))
            .orElseThrow(() -> new RuntimeException("Fare rule not found for: " + vehicleType));
        BigDecimal dist = BigDecimal.valueOf(distanceKm).setScale(2, RoundingMode.HALF_UP);
        BigDecimal fare = rule.getBaseFare()
            .add(rule.getPerKmRate().multiply(dist))
            .multiply(rule.getSurgeMultiplier())
            .setScale(2, RoundingMode.HALF_UP);
        return fare.compareTo(rule.getMinimumFare()) < 0 ? rule.getMinimumFare() : fare;
    }

    public List<FareDto.FareRuleResponse> getAllRules() {
        return fareRuleRepository.findAll().stream().map(this::toRuleResponse).toList();
    }

    @Transactional
    public FareDto.FareRuleResponse updateRule(Long id, FareDto.UpdateFareRuleRequest req) {
        FareRule rule = fareRuleRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Fare rule not found"));
        if (req.getBaseFare() != null) rule.setBaseFare(req.getBaseFare());
        if (req.getPerKmRate() != null) rule.setPerKmRate(req.getPerKmRate());
        if (req.getMinimumFare() != null) rule.setMinimumFare(req.getMinimumFare());
        if (req.getSurgeMultiplier() != null) rule.setSurgeMultiplier(req.getSurgeMultiplier());
        return toRuleResponse(fareRuleRepository.save(rule));
    }

    private double haversineDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
            * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.max(R * c, 0.5); // minimum 0.5 km
    }

    private String getIcon(FareRule.VehicleType type) {
        return switch (type) {
            case BIKE -> "🏍️";
            case AUTO -> "🛺";
            case CAR -> "🚗";
        };
    }

    private String getEta(FareRule.VehicleType type, double distanceKm) {
        int minutes = switch (type) {
            case BIKE -> 3;
            case AUTO -> 5;
            case CAR -> 7;
        };
        return minutes + "-" + (minutes + 3) + " min";
    }

    private FareDto.FareRuleResponse toRuleResponse(FareRule r) {
        return FareDto.FareRuleResponse.builder()
            .id(r.getId()).vehicleType(r.getVehicleType().name())
            .baseFare(r.getBaseFare()).perKmRate(r.getPerKmRate())
            .perMinuteRate(r.getPerMinuteRate()).minimumFare(r.getMinimumFare())
            .platformCommission(r.getPlatformCommission())
            .surgeMultiplier(r.getSurgeMultiplier()).isActive(r.getIsActive())
            .build();
    }
}
