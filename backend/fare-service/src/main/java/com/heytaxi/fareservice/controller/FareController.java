package com.heytaxi.fareservice.controller;

import com.heytaxi.fareservice.dto.FareDto;
import com.heytaxi.fareservice.service.FareService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/fares")
@RequiredArgsConstructor
public class FareController {

    private final FareService fareService;

    // POST /api/fares/estimate — anyone logged in can get estimate
    @PostMapping("/estimate")
    public ResponseEntity<FareDto.ApiResponse<FareDto.FareEstimateResponse>> estimateFare(
            @RequestBody FareDto.FareEstimateRequest request) {
        return ResponseEntity.ok(FareDto.ApiResponse.success("Fare estimated",
                fareService.estimateFare(request)));
    }

    // GET /api/fares/rules — all fare rules (public)
    @GetMapping("/rules")
    public ResponseEntity<FareDto.ApiResponse<?>> getAllRules() {
        return ResponseEntity.ok(FareDto.ApiResponse.success("Fare rules fetched",
                fareService.getAllRules()));
    }

    // PUT /api/fares/rules/{id} — admin only
    @PutMapping("/rules/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<FareDto.ApiResponse<FareDto.FareRuleResponse>> updateRule(
            @PathVariable Long id,
            @RequestBody FareDto.UpdateFareRuleRequest request) {
        return ResponseEntity.ok(FareDto.ApiResponse.success("Fare rule updated",
                fareService.updateRule(id, request)));
    }
}
