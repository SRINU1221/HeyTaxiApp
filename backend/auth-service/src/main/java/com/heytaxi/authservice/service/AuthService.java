package com.heytaxi.authservice.service;

import com.heytaxi.authservice.dto.AuthDto;
import com.heytaxi.authservice.entity.User;
import com.heytaxi.authservice.repository.UserRepository;
import com.heytaxi.authservice.util.JwtUtil;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.Arrays;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final OtpService otpService;
    private final JwtUtil jwtUtil;
    private final RedisTemplate<String, String> redisTemplate;

    private static final String REFRESH_TOKEN_PREFIX = "refresh:";
    private static final String REFRESH_TOKEN_COOKIE = "refreshToken";
    private static final int REFRESH_TOKEN_COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

    public AuthDto.ApiResponse<AuthDto.UserInfo> checkUser(String email) {
        return userRepository.findByEmail(email)
                .map(user -> AuthDto.ApiResponse.success("User exists",
                        AuthDto.UserInfo.builder()
                                .id(user.getId())
                                .name(user.getName())
                                .email(user.getEmail())
                                .phoneNumber(user.getPhoneNumber())
                                .role(user.getRole())
                                .isEmailVerified(user.getIsEmailVerified())
                                .build()))
                .orElse(AuthDto.ApiResponse.error("User not found"));
    }

    @Transactional
    public AuthDto.ApiResponse<String> register(AuthDto.RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            return AuthDto.ApiResponse.error("Email already registered");
        }

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .phoneNumber(request.getPhoneNumber())
                .role(request.getRole())
                .build();

        userRepository.save(user);
        log.info("New user registered: {} with role: {}", request.getEmail(), request.getRole());

        return AuthDto.ApiResponse.success(
                "Registration successful! OTP sent to " + request.getEmail(), null);
    }

    public AuthDto.ApiResponse<String> sendOtp(String email) {
        User user = userRepository.findByEmail(email).orElse(null);

        if (user == null) {
            return AuthDto.ApiResponse.error("User not found with email: " + email);
        }

        String otp = otpService.generateAndStoreOtp(email);
        otpService.sendOtpEmail(email, otp, user.getName());

        return AuthDto.ApiResponse.success("OTP sent successfully to " + email, null);
    }

    @Transactional
    public AuthDto.ApiResponse<AuthDto.AuthResponse> verifyOtpAndLogin(
            AuthDto.VerifyOtpRequest request,
            HttpServletResponse response) {

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!user.getIsActive()) {
            return AuthDto.ApiResponse.error("Account is deactivated. Contact support.");
        }

        if (!otpService.validateOtp(request.getEmail(), request.getOtp())) {
            return AuthDto.ApiResponse.error("Invalid or expired OTP");
        }

        if (!user.getIsEmailVerified()) {
            user.setIsEmailVerified(true);
            userRepository.save(user);
        }

        String accessToken = jwtUtil.generateAccessToken(user);
        String refreshToken = jwtUtil.generateRefreshToken(user);

        // Store refresh token in Redis
        redisTemplate.opsForValue().set(
                REFRESH_TOKEN_PREFIX + user.getId(),
                refreshToken,
                Duration.ofSeconds(REFRESH_TOKEN_COOKIE_MAX_AGE)
        );

        // Set refresh token as HttpOnly cookie
        setRefreshTokenCookie(response, refreshToken);

        AuthDto.AuthResponse authResponse = AuthDto.AuthResponse.builder()
                .accessToken(accessToken)
                .tokenType("Bearer")
                .expiresIn(jwtUtil.getJwtExpiration())
                .user(AuthDto.UserInfo.builder()
                        .id(user.getId())
                        .name(user.getName())
                        .email(user.getEmail())
                        .phoneNumber(user.getPhoneNumber())
                        .role(user.getRole())
                        .isEmailVerified(user.getIsEmailVerified())
                        .build())
                .build();

        log.info("User logged in: {} | Role: {}", user.getEmail(), user.getRole());
        return AuthDto.ApiResponse.success("Login successful!", authResponse);
    }

    public AuthDto.ApiResponse<AuthDto.AuthResponse> refreshToken(
            HttpServletRequest request,
            HttpServletResponse response) {

        String refreshToken = extractRefreshTokenFromCookie(request);

        if (refreshToken == null) {
            return AuthDto.ApiResponse.error("No refresh token found. Please login again.");
        }

        if (!jwtUtil.isTokenValid(refreshToken)) {
            clearRefreshTokenCookie(response);
            return AuthDto.ApiResponse.error("Refresh token expired. Please login again.");
        }

        String userId = jwtUtil.extractUserId(refreshToken);
        String storedToken = redisTemplate.opsForValue().get(REFRESH_TOKEN_PREFIX + userId);

        if (!refreshToken.equals(storedToken)) {
            clearRefreshTokenCookie(response);
            return AuthDto.ApiResponse.error("Invalid refresh token. Please login again.");
        }

        User user = userRepository.findById(Long.parseLong(userId))
                .orElseThrow(() -> new RuntimeException("User not found"));

        String newAccessToken = jwtUtil.generateAccessToken(user);
        String newRefreshToken = jwtUtil.generateRefreshToken(user);

        redisTemplate.opsForValue().set(
                REFRESH_TOKEN_PREFIX + user.getId(),
                newRefreshToken,
                Duration.ofSeconds(REFRESH_TOKEN_COOKIE_MAX_AGE)
        );

        setRefreshTokenCookie(response, newRefreshToken);

        AuthDto.AuthResponse authResponse = AuthDto.AuthResponse.builder()
                .accessToken(newAccessToken)
                .tokenType("Bearer")
                .expiresIn(jwtUtil.getJwtExpiration())
                .user(AuthDto.UserInfo.builder()
                        .id(user.getId())
                        .name(user.getName())
                        .email(user.getEmail())
                        .role(user.getRole())
                        .build())
                .build();

        return AuthDto.ApiResponse.success("Token refreshed", authResponse);
    }

    // ✅ FIXED — userId is now nullable, handles gracefully when null
    public AuthDto.ApiResponse<String> logout(String userId, HttpServletResponse response) {
        if (userId != null) {
            redisTemplate.delete(REFRESH_TOKEN_PREFIX + userId);
            log.info("User {} logged out, refresh token deleted from Redis", userId);
        } else {
            log.info("Logout called without userId — clearing cookie only");
        }
        // Always clear the HttpOnly cookie regardless of userId
        clearRefreshTokenCookie(response);
        return AuthDto.ApiResponse.success("Logged out successfully", null);
    }

    // ─── Cookie Helpers ───────────────────────────────────────────────────────

    private void setRefreshTokenCookie(HttpServletResponse response, String refreshToken) {
        response.addHeader("Set-Cookie",
                String.format("%s=%s; Max-Age=%d; Path=/; HttpOnly; SameSite=Lax",
                        REFRESH_TOKEN_COOKIE, refreshToken, REFRESH_TOKEN_COOKIE_MAX_AGE));
    }

    private void clearRefreshTokenCookie(HttpServletResponse response) {
        response.addHeader("Set-Cookie",
                String.format("%s=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax",
                        REFRESH_TOKEN_COOKIE));
    }

    private String extractRefreshTokenFromCookie(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        return Arrays.stream(request.getCookies())
                .filter(c -> REFRESH_TOKEN_COOKIE.equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
    }
}
