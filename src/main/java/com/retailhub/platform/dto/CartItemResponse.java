package com.retailhub.platform.dto;

import java.math.BigDecimal;

public record CartItemResponse(
        Long cartItemId,
        Long productId,
        String productName,
        BigDecimal price,
        BigDecimal actualPrice,
        Integer discountPercentage,
        Integer quantity,
        BigDecimal subtotal,
        String category,
        String imageUrl,
        Integer stock) {


}
