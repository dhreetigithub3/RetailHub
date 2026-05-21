package com.retailhub.platform.dto;

import jakarta.validation.constraints.NotBlank;

public record UserRequest(@NotBlank String username,
        @NotBlank String email,
        String password,
        @NotBlank String name,
        @NotBlank String role) {
}
