package com.retailhub.platform.dto;

import java.math.BigDecimal;

public record ProductResponse(
                Long id,
                String name,
                String description,
                BigDecimal price,
                BigDecimal actualPrice,
                Integer discountPercentage,
                Integer stock,
                String category,
                String imageUrl,
                String brand,
                String tags,
                Double averageRating,
                Long reviewCount) {
}