package com.heytaxi.userservice.service;

import com.heytaxi.userservice.dto.UserDto;
import com.heytaxi.userservice.entity.RiderProfile;
import com.heytaxi.userservice.repository.RiderProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final RiderProfileRepository repository;

    @Transactional
    public UserDto.UserProfileResponse getOrCreateProfile(Long userId, String name, String email, String phone, String role) {
        return repository.findByUserId(userId).map(profile -> {
            // Update role if it changed or was missing
            if (role != null && !role.equals(profile.getRole())) {
                profile.setRole(role);
                repository.save(profile);
            }
            return toResponse(profile);
        }).orElseGet(() -> {
            RiderProfile profile = RiderProfile.builder()
                    .userId(userId).name(name).email(email).phoneNumber(phone).role(role).build();
            return toResponse(repository.save(profile));
        });
    }

    public UserDto.UserProfileResponse getProfile(Long userId) {
        return toResponse(findOrThrow(userId));
    }

    @Transactional
    public UserDto.UserProfileResponse updateProfile(Long userId, UserDto.UpdateProfileRequest req) {
        RiderProfile profile = findOrThrow(userId);
        if (req.getName() != null && !req.getName().isBlank()) profile.setName(req.getName());
        if (req.getPhoneNumber() != null) profile.setPhoneNumber(req.getPhoneNumber());
        if (req.getProfilePicture() != null) profile.setProfilePicture(req.getProfilePicture());
        return toResponse(repository.save(profile));
    }

    @Transactional
    public void incrementRideCount(Long userId) {
        repository.findByUserId(userId).ifPresent(p -> {
            p.setTotalRides(p.getTotalRides() + 1);
            repository.save(p);
        });
    }

    // Admin
    public List<UserDto.UserProfileResponse> getAllUsers() {
        return repository.findAll().stream().map(this::toResponse).toList();
    }

    private RiderProfile findOrThrow(Long userId) {
        return repository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("User profile not found"));
    }

    private UserDto.UserProfileResponse toResponse(RiderProfile p) {
        return UserDto.UserProfileResponse.builder()
                .id(p.getId()).userId(p.getUserId()).name(p.getName())
                .email(p.getEmail()).phoneNumber(p.getPhoneNumber())
                .role(p.getRole())
                .profilePicture(p.getProfilePicture()).totalRides(p.getTotalRides())
                .createdAt(p.getCreatedAt()).build();
    }
}
