package com.heytaxi.userservice.repository;

import com.heytaxi.userservice.entity.RiderProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface RiderProfileRepository extends JpaRepository<RiderProfile, Long> {
    Optional<RiderProfile> findByUserId(Long userId);
    Optional<RiderProfile> findByEmail(String email);
    boolean existsByUserId(Long userId);
}
