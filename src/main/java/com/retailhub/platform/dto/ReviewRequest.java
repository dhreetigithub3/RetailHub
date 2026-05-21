package com.retailhub.platform.dto;

public record ReviewRequest(
        Long orderId,
        Long productId,
        Integer rating,
        String comment) {
}
