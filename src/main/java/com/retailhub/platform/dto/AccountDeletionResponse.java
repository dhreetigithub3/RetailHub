package com.retailhub.platform.dto;

public record AccountDeletionResponse(
    String message,
    Long deletedUserId,
    int deletedOrdersCount,
    int deletedCartItemsCount,
    int deletedAddressesCount,
    int deletedReviewsCount
) {}
