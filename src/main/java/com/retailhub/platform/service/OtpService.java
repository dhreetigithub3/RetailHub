package com.retailhub.platform.service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.retailhub.platform.dto.ResetPasswordRequest;
import com.retailhub.platform.entity.User;
import com.retailhub.platform.repository.UserRepository;

@Service
public class OtpService {

    private final JavaMailSender javaMailSender;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom secureRandom = new SecureRandom();

    private final Map<String, OtpData> otpStorage = new ConcurrentHashMap<>();

    @Value("${spring.mail.username}")
    private String fromEmail;

    public OtpService(JavaMailSender javaMailSender, UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.javaMailSender = javaMailSender;
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

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(toEmail);
        message.setSubject("OTP Verification - RetailHub");
        message.setText(
                "Hi,\n\n" +
                        "Greetings from RetailHub!\n\n" +
                        "Use this OTP to verify your email address: " + otp + "\n\n" +
                        "This OTP is valid for 5 minutes.\n\n" +
                        "Do not share OTP with anyone.\n\n" +
                        "If you did not request this OTP, please ignore this email.\n\n" +
                        "Thank you.\n\n" +
                        "RetailHub Team");

        javaMailSender.send(message);

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