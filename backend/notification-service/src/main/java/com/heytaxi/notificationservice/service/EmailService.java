package com.heytaxi.notificationservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Async
    public void sendRideConfirmation(String toEmail, String riderName, String pickupAddress,
                                     String dropAddress, String vehicleType, String fare) {
        String subject = "🚖 HeyTaxi - Ride Confirmed!";
        String body = buildRideConfirmationEmail(riderName, pickupAddress, dropAddress, vehicleType, fare);
        sendEmail(toEmail, subject, body);
    }

    @Async
    public void sendRideCompletedEmail(String toEmail, String riderName, String fare,
                                        String distance, String transactionId) {
        String subject = "✅ HeyTaxi - Ride Completed";
        String body = buildRideCompletedEmail(riderName, fare, distance, transactionId);
        sendEmail(toEmail, subject, body);
    }

    @Async
    public void sendDriverAssignedEmail(String toEmail, String riderName, String driverName,
                                         String vehicleNumber, String vehicleType) {
        String subject = "🏍️ HeyTaxi - Driver On The Way!";
        String body = buildDriverAssignedEmail(riderName, driverName, vehicleNumber, vehicleType);
        sendEmail(toEmail, subject, body);
    }

    @Async
    public void sendWelcomeEmail(String toEmail, String name) {
        String subject = "🎉 Welcome to HeyTaxi!";
        String body = buildWelcomeEmail(name);
        sendEmail(toEmail, subject, body);
    }

    private void sendEmail(String to, String subject, String htmlBody) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail, "HeyTaxi");
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            mailSender.send(message);
            log.info("Email sent to {} | subject: {}", to, subject);
        } catch (MessagingException | java.io.UnsupportedEncodingException e) {
            log.error("Failed to send email to {}: {}", to, e.getMessage());
        }
    }

    private String buildRideConfirmationEmail(String name, String pickup, String drop,
                                               String vehicleType, String fare) {
        return """
            <!DOCTYPE html><html><body style="font-family:sans-serif;background:#f4f4f4;padding:20px">
            <div style="max-width:500px;margin:auto;background:white;border-radius:12px;overflow:hidden">
              <div style="background:#FF6B35;padding:24px;text-align:center">
                <h1 style="color:white;margin:0">🚖 HeyTaxi</h1>
                <p style="color:#ffe0d0;margin:4px 0">Your ride is confirmed!</p>
              </div>
              <div style="padding:24px">
                <p style="color:#333">Hi <strong>%s</strong>,</p>
                <p>Your ride has been booked. A driver will be assigned shortly.</p>
                <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin:16px 0">
                  <p style="margin:6px 0">📍 <strong>Pickup:</strong> %s</p>
                  <p style="margin:6px 0">🏁 <strong>Drop:</strong> %s</p>
                  <p style="margin:6px 0">🚗 <strong>Vehicle:</strong> %s</p>
                  <p style="margin:6px 0">💰 <strong>Est. Fare:</strong> ₹%s</p>
                </div>
                <p style="color:#888;font-size:13px">Safe travels! — Team HeyTaxi</p>
              </div>
            </div></body></html>
            """.formatted(name, pickup, drop, vehicleType, fare);
    }

    private String buildRideCompletedEmail(String name, String fare, String distance, String txnId) {
        return """
            <!DOCTYPE html><html><body style="font-family:sans-serif;background:#f4f4f4;padding:20px">
            <div style="max-width:500px;margin:auto;background:white;border-radius:12px;overflow:hidden">
              <div style="background:#22c55e;padding:24px;text-align:center">
                <h1 style="color:white;margin:0">✅ Ride Complete</h1>
              </div>
              <div style="padding:24px">
                <p>Hi <strong>%s</strong>, thanks for riding with HeyTaxi!</p>
                <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin:16px 0">
                  <p style="margin:6px 0">💰 <strong>Total Fare:</strong> ₹%s</p>
                  <p style="margin:6px 0">📏 <strong>Distance:</strong> %s km</p>
                  <p style="margin:6px 0">🧾 <strong>Transaction ID:</strong> %s</p>
                </div>
                <p style="color:#888;font-size:13px">See you next time! — Team HeyTaxi</p>
              </div>
            </div></body></html>
            """.formatted(name, fare, distance, txnId);
    }

    private String buildDriverAssignedEmail(String riderName, String driverName,
                                             String vehicleNumber, String vehicleType) {
        return """
            <!DOCTYPE html><html><body style="font-family:sans-serif;background:#f4f4f4;padding:20px">
            <div style="max-width:500px;margin:auto;background:white;border-radius:12px;overflow:hidden">
              <div style="background:#FF6B35;padding:24px;text-align:center">
                <h1 style="color:white;margin:0">🏍️ Driver On The Way!</h1>
              </div>
              <div style="padding:24px">
                <p>Hi <strong>%s</strong>, your driver is heading to you!</p>
                <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin:16px 0">
                  <p style="margin:6px 0">👤 <strong>Driver:</strong> %s</p>
                  <p style="margin:6px 0">🚗 <strong>Vehicle:</strong> %s</p>
                  <p style="margin:6px 0">🔢 <strong>Number:</strong> %s</p>
                </div>
              </div>
            </div></body></html>
            """.formatted(riderName, driverName, vehicleType, vehicleNumber);
    }

    private String buildWelcomeEmail(String name) {
        return """
            <!DOCTYPE html><html><body style="font-family:sans-serif;background:#f4f4f4;padding:20px">
            <div style="max-width:500px;margin:auto;background:white;border-radius:12px;overflow:hidden">
              <div style="background:#FF6B35;padding:24px;text-align:center">
                <h1 style="color:white;margin:0">🎉 Welcome to HeyTaxi!</h1>
              </div>
              <div style="padding:24px">
                <p>Hi <strong>%s</strong>!</p>
                <p>Welcome aboard! You can now book rides instantly across the city.</p>
                <ul>
                  <li>🏍️ Bikes — Fast & affordable</li>
                  <li>🛺 Autos — Comfortable city rides</li>
                  <li>🚗 Cars — Premium travel</li>
                </ul>
                <p style="color:#888;font-size:13px">Happy riding! — Team HeyTaxi</p>
              </div>
            </div></body></html>
            """.formatted(name);
    }
}
