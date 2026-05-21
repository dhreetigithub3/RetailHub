package com.retailhub.platform.dto;

import java.math.BigDecimal;
import java.util.List;

public record OrderResponse(
        Long orderId,
        BigDecimal totalAmount,
        String currency,
        String status,
        String paymentMethod,
        String customerName,
        String customerEmail,
        java.time.LocalDateTime orderDate,
        java.time.LocalDateTime deliveredDate,
        AddressResponse deliveryAddress,
        List<OrderItemResponse> items) {
}

