package com.heytaxi.authservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;
import java.security.SecureRandom;
import java.time.Duration;

@Service
@RequiredArgsConstructor
@Slf4j
public class OtpService {

    private final RedisTemplate<String, String> redisTemplate;
    private final JavaMailSender mailSender;

    @Value("${otp.expiry-minutes:10}")
    private int otpExpiryMinutes;

    @Value("${otp.length:6}")
    private int otpLength;

    @Value("${spring.mail.username}")
    private String fromEmail;

    private static final String OTP_PREFIX = "otp:";
    private static final SecureRandom secureRandom = new SecureRandom();

    public String generateAndStoreOtp(String email) {
        String otp = generateOtp();
        String key = OTP_PREFIX + email;
        redisTemplate.opsForValue().set(key, otp, Duration.ofMinutes(otpExpiryMinutes));
        log.info("OTP generated for email: {}", email);
        return otp;
    }

    public boolean validateOtp(String email, String otp) {
        String key = OTP_PREFIX + email;
        String storedOtp = redisTemplate.opsForValue().get(key);
        if (storedOtp != null && storedOtp.equals(otp)) {
            redisTemplate.delete(key);
            return true;
        }
        return false;
    }

    // ✅ FIXED: No longer throws exception — just logs error so register never rolls back
    @Async
    public void sendOtpEmail(String email, String otp, String name) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(email);
            helper.setSubject("🚖 HeyTaxi - Your Login OTP");
            helper.setText(buildEmailTemplate(name, otp), true);
            mailSender.send(message);
            log.info("OTP email sent to: {}", email);
        } catch (Exception e) {
            log.error("Failed to send OTP email to: {}", email, e);
            // ✅ Don't throw — user is already saved, just log the failure
        }
    }

    private String generateOtp() {
        StringBuilder otp = new StringBuilder();
        for (int i = 0; i < otpLength; i++) {
            otp.append(secureRandom.nextInt(10));
        }
        return otp.toString();
    }

    private String buildEmailTemplate(String name, String otp) {
        return """
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="UTF-8">
                  <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
                    .container { max-width: 500px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
                    .header { background: linear-gradient(135deg, #FF6B35 0%%, #FF8C42 100%%); padding: 32px; text-align: center; }
                    .header h1 { color: white; margin: 0; font-size: 28px; letter-spacing: -0.5px; }
                    .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px; }
                    .body { padding: 40px 32px; }
                    .greeting { font-size: 18px; color: #1a1a1a; margin-bottom: 8px; }
                    .sub { color: #666; font-size: 15px; margin-bottom: 32px; }
                    .otp-box { background: #FFF5F0; border: 2px dashed #FF6B35; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0; }
                    .otp-label { font-size: 12px; color: #FF6B35; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px; }
                    .otp-code { font-size: 42px; font-weight: 800; color: #FF6B35; letter-spacing: 12px; margin: 0; }
                    .expiry { color: #999; font-size: 13px; text-align: center; margin-top: 8px; }
                    .warning { background: #FFF9E6; border-left: 4px solid #FFB800; padding: 12px 16px; border-radius: 4px; font-size: 13px; color: #7A5C00; margin-top: 24px; }
                    .footer { background: #f9f9f9; padding: 20px 32px; text-align: center; border-top: 1px solid #f0f0f0; }
                    .footer p { color: #aaa; font-size: 12px; margin: 0; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h1>🚖 HeyTaxi</h1>
                      <p>Your ride, your way</p>
                    </div>
                    <div class="body">
                      <p class="greeting">Hi %s! 👋</p>
                      <p class="sub">Here is your one-time login code. Enter it within %d minutes.</p>
                      <div class="otp-box">
                        <p class="otp-label">Your OTP Code</p>
                        <p class="otp-code">%s</p>
                      </div>
                      <p class="expiry">⏱️ Expires in %d minutes</p>
                      <div class="warning">
                        🔒 Never share this code with anyone. HeyTaxi will never ask for your OTP.
                      </div>
                    </div>
                    <div class="footer">
                      <p>© 2024 HeyTaxi. If you didn't request this, ignore this email.</p>
                    </div>
                  </div>
                </body>
                </html>
                """.formatted(name, otpExpiryMinutes, otp, otpExpiryMinutes);
    }
}