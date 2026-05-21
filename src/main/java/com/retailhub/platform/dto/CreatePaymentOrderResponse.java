package com.retailhub.platform.dto;

public record CreatePaymentOrderResponse(
                Long localOrderId,
                String razorpayOrderId,
                long amount,
                String currency,
                String keyId) {
}
