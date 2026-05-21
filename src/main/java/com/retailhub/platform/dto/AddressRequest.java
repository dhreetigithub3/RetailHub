package com.retailhub.platform.dto;

public record AddressRequest(
        Long addressId, // Optional, if using a saved address
        String street,
        String city,
        String state,
        String zipCode,
        String country,
        Boolean saveAddress
) {
}
