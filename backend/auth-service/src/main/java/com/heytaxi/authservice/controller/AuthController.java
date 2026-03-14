package com.heytaxi.authservice.controller;

import com.heytaxi.authservice.dto.AuthDto;
import com.heytaxi.authservice.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @GetMapping("/check-user")
    public ResponseEntity<AuthDto.ApiResponse<AuthDto.UserInfo>> checkUser(
            @RequestParam String email) {
        return ResponseEntity.ok(authService.checkUser(email));
    }

    @PostMapping("/register")
    public ResponseEntity<AuthDto.ApiResponse<String>> register(
            @Valid @RequestBody AuthDto.RegisterRequest request) {
        AuthDto.ApiResponse<String> response = authService.register(request);
        if (response.isSuccess()) {
            authService.sendOtp(request.getEmail());
        }
        return ResponseEntity.ok(response);
    }

    @PostMapping("/send-otp")
    public ResponseEntity<AuthDto.ApiResponse<String>> sendOtp(
            @Valid @RequestBody AuthDto.SendOtpRequest request) {
        return ResponseEntity.ok(authService.sendOtp(request.getEmail()));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<AuthDto.ApiResponse<AuthDto.AuthResponse>> verifyOtp(
            @Valid @RequestBody AuthDto.VerifyOtpRequest request,
            HttpServletResponse response) {
        return ResponseEntity.ok(authService.verifyOtpAndLogin(request, response));
    }

    @PostMapping("/refresh-token")
    public ResponseEntity<AuthDto.ApiResponse<AuthDto.AuthResponse>> refreshToken(
            HttpServletRequest request,
            HttpServletResponse response) {
        return ResponseEntity.ok(authService.refreshToken(request, response));
    }

    // ✅ FIXED — X-User-Id is optional
    // Logout is on public route (/api/auth/**) so gateway never adds X-User-Id header
    @PostMapping("/logout")
    public ResponseEntity<AuthDto.ApiResponse<String>> logout(
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            HttpServletResponse response) {
        return ResponseEntity.ok(authService.logout(userId, response));
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("Auth Service is running 🚖");
    }
}
