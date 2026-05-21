package com.retailhub.platform.controller;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.retailhub.platform.dto.AuthResponse;
import com.retailhub.platform.dto.LoginRequest;
import com.retailhub.platform.dto.RegisterRequest;
import com.retailhub.platform.dto.AccountDeletionRequest;
import com.retailhub.platform.dto.AccountDeletionResponse;
import com.retailhub.platform.service.AuthService;
import com.retailhub.platform.service.AccountDeletionService;

import com.retailhub.platform.dto.UserRequest;
import com.retailhub.platform.dto.UserResponse;

import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;
    private final AccountDeletionService accountDeletionService;

    public AuthController(AuthService authService, AccountDeletionService accountDeletionService) {
        this.authService = authService;
        this.accountDeletionService = accountDeletionService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        String message = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("message", message));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> getMe() {
        return ResponseEntity.ok(authService.getCurrentUser());
    }

    @PutMapping("/update-profile")
    public ResponseEntity<AuthResponse> updateProfile(@Valid @RequestBody UserRequest request) {
        return ResponseEntity.ok(authService.updateCurrentUser(request));
    }

    @DeleteMapping("/delete-account")
    public ResponseEntity<AccountDeletionResponse> deleteAccount(@Valid @RequestBody AccountDeletionRequest request) {
        AccountDeletionResponse response = accountDeletionService.deleteCurrentUserAccount(request.password());
        return ResponseEntity.ok(response);
    }
}

