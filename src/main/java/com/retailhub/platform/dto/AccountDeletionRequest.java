package com.retailhub.platform.dto;

import jakarta.validation.constraints.NotBlank;

public record AccountDeletionRequest(
    @NotBlank(message = "Password is required for account deletion")
    String password
) {}
