package com.heytaxi.rideservice;

import com.heytaxi.rideservice.dto.RideDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<RideDto.ApiResponse<Object>> handleRuntimeException(RuntimeException ex) {
        log.error("Ride Service Exception: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(RideDto.ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<RideDto.ApiResponse<Object>> handleException(Exception ex) {
        log.error("Ride Service Unexpected Error: ", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(RideDto.ApiResponse.error("An unexpected error occurred: " + ex.getMessage()));
    }
}
