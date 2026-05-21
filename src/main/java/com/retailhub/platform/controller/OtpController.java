package com.retailhub.platform.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.retailhub.platform.dto.ResetPasswordRequest;
import com.retailhub.platform.service.OtpService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/auth/otp")
public class OtpController {

    private final OtpService otpService;

    public OtpController(OtpService otpService) {
        this.otpService = otpService;
    }

    @PostMapping("/send")
    public ResponseEntity<String> sendOtp(@RequestParam String username) {
        otpService.sendOtp(username);
        return ResponseEntity.ok("OTP sent successfully!");
    }

    @PostMapping("/verify")
    public ResponseEntity<String> verifyOtp(@RequestParam String username, @RequestParam String otp) {
        otpService.verifyOtp(username, otp);
        return ResponseEntity.ok("OTP verified successfully!");
    }

    @PostMapping("/reset")
    public ResponseEntity<String> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        otpService.resetPassword(request);
        return ResponseEntity.ok("Password reset successfully!");
    }
}