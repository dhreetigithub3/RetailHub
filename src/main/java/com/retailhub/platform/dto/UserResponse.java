package com.retailhub.platform.dto;

public record UserResponse(Long id,
        String username,
        String email,
        String name,
        String role) {
}
