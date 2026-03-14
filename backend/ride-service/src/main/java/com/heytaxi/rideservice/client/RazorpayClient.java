package com.heytaxi.rideservice.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;

@Component
@Slf4j
public class RazorpayClient {

    @Value("${razorpay.key-id}")
    private String keyId;

    @Value("${razorpay.key-secret}")
    private String keySecret;

    /**
     * Create a Razorpay order via REST API
     * Returns the order ID to send to frontend
     */
    public String createOrder(BigDecimal amount, Long rideId) {
        try {
            // Amount in paise (1 INR = 100 paise)
            long amountInPaise = amount.multiply(BigDecimal.valueOf(100)).longValue();

            var client = new com.razorpay.RazorpayClient(keyId, keySecret);
            org.json.JSONObject orderRequest = new org.json.JSONObject();
            orderRequest.put("amount", amountInPaise);
            orderRequest.put("currency", "INR");
            orderRequest.put("receipt", "ride_" + rideId);
            orderRequest.put("notes", new org.json.JSONObject().put("rideId", rideId));

            com.razorpay.Order order = client.orders.create(orderRequest);
            String orderId = order.get("id");
            log.info("Razorpay order created: {} for ride: {} | amount: ₹{}", orderId, rideId, amount);
            return orderId;

        } catch (Exception e) {
            log.error("Failed to create Razorpay order for ride {}: {}", rideId, e.getMessage());
            throw new RuntimeException("Failed to create payment order: " + e.getMessage());
        }
    }

    /**
     * Verify Razorpay payment signature
     * This is the standard Razorpay signature verification
     */
    public boolean verifyPaymentSignature(String orderId, String paymentId, String signature) {
        try {
            String payload = orderId + "|" + paymentId;
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(
                    keySecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKeySpec);
            byte[] hash = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            String generatedSignature = HexFormat.of().formatHex(hash);
            boolean valid = generatedSignature.equals(signature);
            log.info("Razorpay signature verification for order {}: {}", orderId, valid ? "VALID" : "INVALID");
            return valid;
        } catch (Exception e) {
            log.error("Razorpay signature verification failed: {}", e.getMessage());
            return false;
        }
    }
}
