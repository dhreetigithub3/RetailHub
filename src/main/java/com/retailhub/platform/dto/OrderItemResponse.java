package com.retailhub.platform.dto;

import java.math.BigDecimal;

public record OrderItemResponse(
        Long productId,
        String productName,
        String imageUrl,
        BigDecimal priceAtPurchase,
        Integer quantity,
        BigDecimal subtotal,
        Integer reviewRating,
        String reviewComment) {
}

