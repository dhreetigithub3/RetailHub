package com.retailhub.platform.service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.retailhub.platform.dto.ResetPasswordRequest;
import com.retailhub.platform.entity.User;
import com.retailhub.platform.repository.UserRepository;

@Service
public class OtpService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom secureRandom = new SecureRandom();

    private final Map<String, OtpData> otpStorage = new ConcurrentHashMap<>();

    @Value("${brevo.api.key}")
    private String apiKey;

    @Value("${app.brand.name:RetailHub}")
    private String brandName;

    @Value("${app.brand.supportEmail:retailhub052026@gmail.com}")
    private String supportEmail;

    private final RestTemplate restTemplate;

    public OtpService(RestTemplate restTemplate, UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.restTemplate = restTemplate;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public void sendOtp(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found with username: " + username));
        String toEmail = user.getEmail();
        String otp = generateOtp();

        otpStorage.put(
                toEmail,
                new OtpData(otp, LocalDateTime.now().plusMinutes(5)));

        String url = "https://api.brevo.com/v3/smtp/email";

        Map<String, Object> body = new HashMap<>();

        Map<String, String> sender = new HashMap<>();
        sender.put("name", brandName);
        sender.put("email", supportEmail);

        Map<String, String> recipient = new HashMap<>();
        recipient.put("email", toEmail);

        body.put("sender", sender);
        body.put("to", List.of(recipient));
        body.put("subject", "OTP Verification - " + brandName);

        String html = """
                <h2>OTP Verification - RetailHub</h2>
                <p>Hello,</p>
                <p>Your OTP is:</p>
                <h1 style="color:#2d6cdf">%s</h1>
                <p>This OTP is valid for 5 minutes.</p>
                <p>Do not share it with anyone.</p>
                """.formatted(otp);

        body.put("htmlContent", html);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("api-key", apiKey);

        HttpEntity<Map<String, Object>> request =
                new HttpEntity<>(body, headers);

        try {
            restTemplate.postForEntity(url, request, String.class);
        } catch (Exception e) {
            System.err.println("OTP email failed: " + e.getMessage());
        }


        System.out.println("OTP sent to: " + toEmail);
        System.out.println("Generated OTP: " + otp);
    }

    private String generateOtp() {
        int otp = 100000 + secureRandom.nextInt(900000);
        return String.valueOf(otp);
    }

    private record OtpData(String otp, LocalDateTime expiryTime) {
    }

    public void verifyOtp(String username, String otp) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found with username: " + username));
        String email = user.getEmail();
        OtpData otpData = otpStorage.get(email);

        if (otpData == null) {
            throw new RuntimeException("No OTP found for email: " + email);
        }

        if (otpData.expiryTime().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("OTP has expired for email: " + email);
        }

        if (!otpData.otp().equals(otp)) {
            throw new RuntimeException("Invalid OTP for email: " + email);
        }

        // We don't remove it here because the user might need it for the final reset
        // step
        System.out.println("OTP verified successfully for email: " + email);
    }

    public void resetPassword(ResetPasswordRequest request) {
        // 1. Verify OTP again (or for the final time)
        verifyOtp(request.username(), request.otp());

        // 2. Validate passwords match
        if (!request.newPassword().equals(request.confirmPassword())) {
            throw new RuntimeException("Passwords do not match");
        }

        // 3. Find user and update password
        User user = userRepository.findByUsername(request.username())
                .orElseThrow(() -> new RuntimeException("User not found with username: " + request.username()));

        user.setPassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);

        // 4. Finally remove OTP from storage
        otpStorage.remove(user.getEmail());

        System.out.println("Password reset successfully for username: " + request.username());
    }

}