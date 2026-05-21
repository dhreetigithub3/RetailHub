package com.retailhub.platform.dto;

public record AuthResponse(
        String token,
        String tokenType,
        String username,
        String role,
        String name) {
}
