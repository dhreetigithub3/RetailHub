package com.retailhub.platform.dto;

import java.math.BigDecimal;
import java.util.List;

public record CartResponse(
    List<CartItemResponse> items,
    BigDecimal totalAmount) {

}
