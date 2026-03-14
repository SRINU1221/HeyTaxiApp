package com.heytaxi.paymentservice.service;

import com.heytaxi.paymentservice.dto.PaymentDto;
import com.heytaxi.paymentservice.entity.Payment;
import com.heytaxi.paymentservice.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private static final BigDecimal COMMISSION = new BigDecimal("2.00");

    @Transactional
    public PaymentDto.PaymentResponse createPayment(PaymentDto.CreatePaymentRequest req) {
        // Check if payment already exists for this ride
        if (paymentRepository.findByRideId(req.getRideId()).isPresent()) {
            throw new RuntimeException("Payment already exists for ride: " + req.getRideId());
        }

        BigDecimal driverEarnings = req.getTotalAmount().subtract(COMMISSION);
        Payment payment = Payment.builder()
                .rideId(req.getRideId())
                .riderId(req.getRiderId())
                .driverId(req.getDriverId())
                .totalAmount(req.getTotalAmount())
                .commissionAmount(COMMISSION)
                .driverEarnings(driverEarnings)
                .paymentMethod(req.getPaymentMethod() != null ? req.getPaymentMethod() : Payment.PaymentMethod.CASH)
                .status(Payment.PaymentStatus.COMPLETED) // Cash payment auto-completes
                .transactionId("HT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .paidAt(LocalDateTime.now())
                .build();

        Payment saved = paymentRepository.save(payment);
        log.info("Payment created: rideId={} | amount=₹{} | commission=₹{} | driver=₹{}",
                req.getRideId(), req.getTotalAmount(), COMMISSION, driverEarnings);
        return toResponse(saved);
    }

    public PaymentDto.PaymentResponse getPaymentByRide(Long rideId) {
        return paymentRepository.findByRideId(rideId)
                .map(this::toResponse)
                .orElseThrow(() -> new RuntimeException("Payment not found for ride: " + rideId));
    }

    public List<PaymentDto.PaymentResponse> getRiderPayments(Long riderId) {
        return paymentRepository.findByRiderIdOrderByCreatedAtDesc(riderId)
                .stream().map(this::toResponse).toList();
    }

    public List<PaymentDto.PaymentResponse> getDriverPayments(Long driverId) {
        return paymentRepository.findByDriverIdOrderByCreatedAtDesc(driverId)
                .stream().map(this::toResponse).toList();
    }

    public PaymentDto.AdminPaymentStats getAdminStats() {
        return PaymentDto.AdminPaymentStats.builder()
                .totalTransactions(paymentRepository.countByStatus(Payment.PaymentStatus.COMPLETED))
                .totalRevenue(paymentRepository.sumTotalRevenue().orElse(BigDecimal.ZERO))
                .totalCommission(paymentRepository.sumCommission().orElse(BigDecimal.ZERO))
                .totalDriverEarnings(paymentRepository.sumDriverEarnings().orElse(BigDecimal.ZERO))
                .build();
    }

    private PaymentDto.PaymentResponse toResponse(Payment p) {
        return PaymentDto.PaymentResponse.builder()
                .id(p.getId()).rideId(p.getRideId()).riderId(p.getRiderId())
                .driverId(p.getDriverId()).totalAmount(p.getTotalAmount())
                .commissionAmount(p.getCommissionAmount()).driverEarnings(p.getDriverEarnings())
                .status(p.getStatus()).paymentMethod(p.getPaymentMethod())
                .transactionId(p.getTransactionId()).createdAt(p.getCreatedAt()).paidAt(p.getPaidAt())
                .build();
    }
}
