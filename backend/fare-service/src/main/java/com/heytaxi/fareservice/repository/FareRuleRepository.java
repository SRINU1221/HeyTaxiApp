package com.heytaxi.fareservice.repository;

import com.heytaxi.fareservice.entity.FareRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface FareRuleRepository extends JpaRepository<FareRule, Long> {
    Optional<FareRule> findByVehicleType(FareRule.VehicleType vehicleType);
    java.util.List<FareRule> findByIsActiveTrue();
}
