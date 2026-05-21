package com.retailhub.platform.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record ResetPasswordRequest(
        @NotBlank String username,
        @Email String email,
        @NotBlank String otp,
        @NotBlank String newPassword,
        @NotBlank String confirmPassword) {

}
