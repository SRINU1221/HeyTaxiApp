package com.heytaxi.rideservice.service;

import com.heytaxi.rideservice.client.NotificationClient;
import com.heytaxi.rideservice.client.PaymentClient;
import com.heytaxi.rideservice.client.RazorpayClient;
import com.heytaxi.rideservice.client.DriverClient;
import com.heytaxi.rideservice.dto.RideDto;
import com.heytaxi.rideservice.entity.Ride;
import com.heytaxi.rideservice.repository.RideRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class RideService {

    private final RideRepository rideRepository;
    private final PaymentClient paymentClient;
    private final NotificationClient notificationClient;
    private final RazorpayClient razorpayClient;
    private final DriverClient driverClient;
    private final RedisTemplate<String, String> redisTemplate;

    private static final BigDecimal COMMISSION = new BigDecimal("2.00"); // ₹2 fixed HeyTaxi fee
    private static final SecureRandom random = new SecureRandom();

    // Fare rates
    private static final BigDecimal BIKE_BASE = new BigDecimal("20");
    private static final BigDecimal BIKE_PER_KM = new BigDecimal("8");
    private static final BigDecimal AUTO_BASE = new BigDecimal("25");
    private static final BigDecimal AUTO_PER_KM = new BigDecimal("12");
    private static final BigDecimal CAR_BASE = new BigDecimal("40");
    private static final BigDecimal CAR_PER_KM = new BigDecimal("18");

    // ─── STEP 1: Rider requests ride ─────────────────────────────────────────

    @Transactional
    public RideDto.RideResponse requestRide(Long riderId, RideDto.RideRequest request) {
        // Check if rider already has active ride
        if (rideRepository.existsByRiderIdAndStatusIn(riderId,
                List.of(Ride.RideStatus.REQUESTED, Ride.RideStatus.ACCEPTED,
                        Ride.RideStatus.DRIVER_ARRIVING, Ride.RideStatus.ONGOING))) {
            throw new RuntimeException("You already have an active ride");
        }

        BigDecimal distance = calculateDistance(
                request.getPickupLatitude(), request.getPickupLongitude(),
                request.getDropLatitude(), request.getDropLongitude());

        BigDecimal estimatedFare = calculateFare(request.getVehicleType(), distance);

        // ✅ Generate 4-digit OTP for ride start verification
        String otp = generateOtp();

        Ride.PaymentMethod paymentMethod = request.getPaymentMethod() != null
                ? request.getPaymentMethod() : Ride.PaymentMethod.CASH;

        Ride ride = Ride.builder()
                .riderId(riderId)
                .pickupAddress(request.getPickupAddress())
                .pickupLatitude(request.getPickupLatitude())
                .pickupLongitude(request.getPickupLongitude())
                .dropAddress(request.getDropAddress())
                .dropLatitude(request.getDropLatitude())
                .dropLongitude(request.getDropLongitude())
                .vehicleType(request.getVehicleType())
                .estimatedFare(estimatedFare)
                .distanceKm(distance)
                .commissionAmount(COMMISSION)
                .rideOtp(otp)
                .paymentMethod(paymentMethod)
                .requestedAt(LocalDateTime.now())
                .build();

        ride = rideRepository.save(ride);

        // Store OTP in Redis for quick access (expires in 2 hours)
        redisTemplate.opsForValue().set("ride:otp:" + ride.getId(), otp,
                java.time.Duration.ofHours(2));

        log.info("Ride {} requested by rider {} | Est. fare: ₹{} | OTP: {}",
                ride.getId(), riderId, estimatedFare, otp);

        // If Razorpay — create order upfront
        if (paymentMethod == Ride.PaymentMethod.RAZORPAY) {
            try {
                String orderId = razorpayClient.createOrder(estimatedFare, ride.getId());
                ride.setRazorpayOrderId(orderId);
                ride = rideRepository.save(ride);
            } catch (Exception e) {
                log.warn("Failed to create Razorpay order for ride {}: {}", ride.getId(), e.getMessage());
            }
        }

        return toRideResponse(ride, true); // show OTP to rider
    }

    // ─── STEP 2: Driver sees available rides ─────────────────────────────────

    public List<RideDto.RideResponse> getAvailableRides(Ride.VehicleType vehicleType) {
        List<Ride> rides = vehicleType != null
                ? rideRepository.findByStatusAndVehicleTypeOrderByRequestedAtAsc(
                Ride.RideStatus.REQUESTED, vehicleType)
                : rideRepository.findByStatusOrderByRequestedAtAsc(Ride.RideStatus.REQUESTED);

        return rides.stream()
                .map(r -> toRideResponse(r, false)) // don't expose OTP to driver list
                .toList();
    }

    // ─── STEP 3: Driver accepts ride ─────────────────────────────────────────

    @Transactional
    public RideDto.RideResponse acceptRide(Long rideId, Long driverId) {
        Ride ride = getRideOrThrow(rideId);

        // ✅ Prevent double acceptance (race condition protection)
        if (ride.getStatus() != Ride.RideStatus.REQUESTED) {
            throw new RuntimeException("Ride is no longer available — already accepted by another driver");
        }

        // Check driver doesn't already have active ride
        rideRepository.findFirstByDriverIdAndStatusIn(driverId,
                        List.of(Ride.RideStatus.ACCEPTED, Ride.RideStatus.DRIVER_ARRIVING,
                                Ride.RideStatus.ONGOING))
                .ifPresent(r -> { throw new RuntimeException("You already have an active ride"); });

        ride.setDriverId(driverId);
        ride.setStatus(Ride.RideStatus.ACCEPTED);
        ride.setAcceptedAt(LocalDateTime.now());

        Ride saved = rideRepository.save(ride);
        log.info("Ride {} accepted by driver {}", rideId, driverId);

        // Notify rider
        try {
            notificationClient.sendRideAccepted(new NotificationClient.RideAcceptedRequest(
                    ride.getRiderId(), driverId, rideId
            ));
        } catch (Exception e) {
            log.warn("Failed to notify rider for ride {}", rideId);
        }

        return toRideResponse(saved, false); // driver doesn't need to see OTP
    }

    // ─── STEP 4: Driver marks arriving ───────────────────────────────────────

    @Transactional
    public RideDto.RideResponse markArriving(Long rideId, Long driverId) {
        Ride ride = getDriverRideOrThrow(rideId, driverId);
        if (ride.getStatus() != Ride.RideStatus.ACCEPTED) {
            throw new RuntimeException("Invalid status transition");
        }
        ride.setStatus(Ride.RideStatus.DRIVER_ARRIVING);
        return toRideResponse(rideRepository.save(ride), false);
    }

    // ─── STEP 5: Driver enters OTP to start ride ─────────────────────────────

    @Transactional
    public RideDto.RideResponse startRide(Long rideId, Long driverId, String enteredOtp) {
        Ride ride = getDriverRideOrThrow(rideId, driverId);

        if (ride.getStatus() != Ride.RideStatus.ACCEPTED &&
                ride.getStatus() != Ride.RideStatus.DRIVER_ARRIVING) {
            throw new RuntimeException("Ride cannot be started in current status");
        }

        // ✅ Validate OTP
        String storedOtp = redisTemplate.opsForValue().get("ride:otp:" + rideId);
        String validOtp = storedOtp != null ? storedOtp : ride.getRideOtp();

        if (!validOtp.equals(enteredOtp)) {
            throw new RuntimeException("Invalid OTP. Please ask rider for the correct code.");
        }

        ride.setStatus(Ride.RideStatus.ONGOING);
        ride.setStartedAt(LocalDateTime.now());

        // Clear OTP from Redis after successful verification
        redisTemplate.delete("ride:otp:" + rideId);

        log.info("Ride {} started by driver {} after OTP verification", rideId, driverId);
        return toRideResponse(rideRepository.save(ride), false);
    }

    // ─── STEP 6: Driver completes ride ───────────────────────────────────────

    @Transactional
    public RideDto.RideResponse completeRide(Long rideId, Long driverId) {
        Ride ride = getDriverRideOrThrow(rideId, driverId);

        if (ride.getStatus() != Ride.RideStatus.ONGOING) {
            throw new RuntimeException("Ride is not in progress");
        }

        LocalDateTime start = ride.getStartedAt() != null ? ride.getStartedAt() : LocalDateTime.now().minusMinutes(1);
        int durationMinutes = (int) java.time.Duration.between(start, LocalDateTime.now()).toMinutes();

        BigDecimal actualFare = calculateFare(ride.getVehicleType(), ride.getDistanceKm());
        BigDecimal driverEarnings = actualFare.subtract(COMMISSION);

        ride.setStatus(Ride.RideStatus.COMPLETED);
        ride.setCompletedAt(LocalDateTime.now());
        ride.setActualFare(actualFare);
        ride.setDurationMinutes(durationMinutes);
        ride.setDriverEarnings(driverEarnings);

        // For cash payment — auto-complete
        if (ride.getPaymentMethod() == Ride.PaymentMethod.CASH) {
            ride.setPaymentStatus(Ride.PaymentStatus.COMPLETED);
        }
        // For Razorpay — stays PENDING until rider confirms payment

        Ride saved = rideRepository.save(ride);

        log.info("Ride {} completed | Fare: ₹{} | Commission: ₹{} | Driver Earnings: ₹{}",
                rideId, actualFare, COMMISSION, driverEarnings);

        // Create payment record
        try {
            paymentClient.createPayment(new PaymentClient.CreatePaymentRequest(
                    rideId, ride.getRiderId(), ride.getDriverId(), actualFare,
                    ride.getPaymentMethod().name()
            ));
        } catch (Exception e) {
            log.warn("Failed to create payment record for ride {}: {}", rideId, e.getMessage());
        }

        // Update driver stats
        try {
            driverClient.updateStats(driverId, driverEarnings);
        } catch (Exception e) {
            log.warn("Failed to update driver stats for driver {}: {}", driverId, e.getMessage());
        }

        return toRideResponse(saved, false);
    }

    // ─── STEP 7: Razorpay payment verification ───────────────────────────────

    @Transactional
    public RideDto.RideResponse verifyRazorpayPayment(Long rideId, Long riderId,
                                                      RideDto.RazorpayPaymentRequest request) {
        Ride ride = getRideOrThrow(rideId);

        if (!ride.getRiderId().equals(riderId)) {
            throw new RuntimeException("Unauthorized");
        }

        if (ride.getPaymentStatus() == Ride.PaymentStatus.COMPLETED) {
            throw new RuntimeException("Payment already completed");
        }

        // Verify signature with Razorpay
        boolean valid = razorpayClient.verifyPaymentSignature(
                request.getRazorpayOrderId(),
                request.getRazorpayPaymentId(),
                request.getRazorpaySignature()
        );

        if (!valid) {
            ride.setPaymentStatus(Ride.PaymentStatus.FAILED);
            rideRepository.save(ride);
            throw new RuntimeException("Payment verification failed. Please contact support.");
        }

        ride.setRazorpayPaymentId(request.getRazorpayPaymentId());
        ride.setPaymentStatus(Ride.PaymentStatus.COMPLETED);
        Ride saved = rideRepository.save(ride);

        log.info("Razorpay payment verified for ride {} | PaymentId: {}",
                rideId, request.getRazorpayPaymentId());

        return toRideResponse(saved, false);
    }

    // ─── Cancel ride ─────────────────────────────────────────────────────────

    @Transactional
    public RideDto.RideResponse cancelRide(Long rideId, Long userId, String reason) {
        Ride ride = getRideOrThrow(rideId);

        if (ride.getStatus() == Ride.RideStatus.COMPLETED ||
                ride.getStatus() == Ride.RideStatus.CANCELLED) {
            throw new RuntimeException("Cannot cancel this ride");
        }

        if (ride.getStatus() == Ride.RideStatus.ONGOING) {
            throw new RuntimeException("Cannot cancel a ride that is in progress");
        }

        ride.setStatus(Ride.RideStatus.CANCELLED);
        ride.setCancelledAt(LocalDateTime.now());
        ride.setCancellationReason(reason);

        log.info("Ride {} cancelled by user {} | Reason: {}", rideId, userId, reason);
        return toRideResponse(rideRepository.save(ride), false);
    }

    // ─── Rate ride ───────────────────────────────────────────────────────────

    @Transactional
    public RideDto.RideResponse rateRide(Long rideId, Long riderId, RideDto.RateRideRequest request) {
        Ride ride = getRideOrThrow(rideId);
        if (!ride.getRiderId().equals(riderId)) throw new RuntimeException("Unauthorized");
        if (ride.getStatus() != Ride.RideStatus.COMPLETED) throw new RuntimeException("Can only rate completed rides");
        ride.setDriverRating(request.getRating());
        ride.setRiderFeedback(request.getFeedback());
        return toRideResponse(rideRepository.save(ride), false);
    }

    // ─── Queries ─────────────────────────────────────────────────────────────

    public List<RideDto.RideResponse> getRiderHistory(Long riderId) {
        return rideRepository.findByRiderIdOrderByCreatedAtDesc(riderId)
                .stream().map(r -> toRideResponse(r, false)).toList();
    }

    public List<RideDto.RideResponse> getDriverHistory(Long driverId) {
        return rideRepository.findByDriverIdOrderByCreatedAtDesc(driverId)
                .stream().map(r -> toRideResponse(r, false)).toList();
    }

    public RideDto.RideResponse getCurrentRideForRider(Long riderId) {
        return rideRepository.findFirstByRiderIdAndStatusNotIn(riderId,
                        List.of(Ride.RideStatus.COMPLETED, Ride.RideStatus.CANCELLED))
                .map(r -> toRideResponse(r, true)) // show OTP to rider
                .orElseThrow(() -> new RuntimeException("No active ride"));
    }

    public RideDto.RideResponse getCurrentRideForDriver(Long driverId) {
        return rideRepository.findFirstByDriverIdAndStatusIn(driverId,
                        List.of(Ride.RideStatus.ACCEPTED, Ride.RideStatus.DRIVER_ARRIVING,
                                Ride.RideStatus.ONGOING))
                .map(r -> toRideResponse(r, false)) // don't show OTP to driver
                .orElseThrow(() -> new RuntimeException("No active ride"));
    }

    public RideDto.AdminStats getAdminStats() {
        return RideDto.AdminStats.builder()
                .totalRides(rideRepository.count())
                .completedRides(rideRepository.countByStatus(Ride.RideStatus.COMPLETED))
                .cancelledRides(rideRepository.countByStatus(Ride.RideStatus.CANCELLED))
                .activeRides(rideRepository.countByStatus(Ride.RideStatus.REQUESTED)
                        + rideRepository.countByStatus(Ride.RideStatus.ACCEPTED)
                        + rideRepository.countByStatus(Ride.RideStatus.ONGOING))
                .totalCommissionEarned(rideRepository.sumCommission().orElse(BigDecimal.ZERO))
                .totalPlatformRevenue(rideRepository.sumActualFare().orElse(BigDecimal.ZERO))
                .totalDriverEarnings(rideRepository.sumDriverEarnings().orElse(BigDecimal.ZERO))
                .build();
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private String generateOtp() {
        return String.format("%04d", random.nextInt(10000));
    }

    private BigDecimal calculateFare(Ride.VehicleType type, BigDecimal distanceKm) {
        return switch (type) {
            case BIKE -> BIKE_BASE.add(BIKE_PER_KM.multiply(distanceKm));
            case AUTO -> AUTO_BASE.add(AUTO_PER_KM.multiply(distanceKm));
            case CAR  -> CAR_BASE.add(CAR_PER_KM.multiply(distanceKm));
        };
    }

    private BigDecimal calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return BigDecimal.valueOf(Math.max(R * c, 1.0));
    }

    private Ride getRideOrThrow(Long rideId) {
        return rideRepository.findById(rideId)
                .orElseThrow(() -> new RuntimeException("Ride not found: " + rideId));
    }

    private Ride getDriverRideOrThrow(Long rideId, Long driverId) {
        Ride ride = getRideOrThrow(rideId);
        if (!driverId.equals(ride.getDriverId())) throw new RuntimeException("Unauthorized");
        return ride;
    }

    private RideDto.RideResponse toRideResponse(Ride ride, boolean showOtp) {
        return RideDto.RideResponse.builder()
                .id(ride.getId())
                .riderId(ride.getRiderId())
                .driverId(ride.getDriverId())
                .pickupAddress(ride.getPickupAddress())
                .pickupLatitude(ride.getPickupLatitude())
                .pickupLongitude(ride.getPickupLongitude())
                .dropAddress(ride.getDropAddress())
                .dropLatitude(ride.getDropLatitude())
                .dropLongitude(ride.getDropLongitude())
                .vehicleType(ride.getVehicleType())
                .status(ride.getStatus())
                .rideOtp(showOtp ? ride.getRideOtp() : null) // ✅ only rider sees OTP
                .estimatedFare(ride.getEstimatedFare())
                .actualFare(ride.getActualFare())
                .commissionAmount(ride.getCommissionAmount())
                .driverEarnings(ride.getDriverEarnings())
                .distanceKm(ride.getDistanceKm())
                .durationMinutes(ride.getDurationMinutes())
                .paymentMethod(ride.getPaymentMethod())
                .paymentStatus(ride.getPaymentStatus())
                .razorpayOrderId(ride.getRazorpayOrderId())
                .requestedAt(ride.getRequestedAt())
                .acceptedAt(ride.getAcceptedAt())
                .startedAt(ride.getStartedAt())
                .completedAt(ride.getCompletedAt())
                .driverRating(ride.getDriverRating())
                .riderFeedback(ride.getRiderFeedback())
                .build();
    }
}
