package com.heytaxi.rideservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DriverLocationDto {
    private Long driverId;
    private Double latitude;
    private Double longitude;
    private String vehicleType;
    private Long updatedAt; // epoch millis — rider JS uses this to detect stale location
}
