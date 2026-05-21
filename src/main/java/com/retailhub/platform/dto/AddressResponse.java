package com.retailhub.platform.dto;

public record AddressResponse(
        Long id,
        String street,
        String city,
        String state,
        String zipCode,
        String country
) {
}
