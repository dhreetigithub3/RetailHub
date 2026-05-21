package com.retailhub.platform.dto;

import java.time.LocalDateTime;

public record ReviewResponse(
        Long reviewId,
        Long orderId,
        Long productId,
        String productName,
        Long customerId,
        String customerName,
        Integer rating,
        String comment,
        LocalDateTime reviewedAt,
        String moderationStatus,
        String flaggedReason) {
}


