package com.retailhub.platform.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ProductRequest(

                @NotBlank(message = "Product name is required") String name,

                @NotNull(message = "Description is required") @Size(max = 1000) String description,

                @NotNull(message = "Price is required") @DecimalMin(value = "0.1", message = "Price must be greater than 0") BigDecimal price,
                BigDecimal actualPrice,
                @NotNull(message = "Stock is required") @Min(value = 0, message = "Stock cannot be negative") Integer stock,

                @NotBlank(message = "Category is required") String category,

                String imageUrl,
                String brand,
                String tags) {
}