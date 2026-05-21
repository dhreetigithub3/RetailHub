package com.retailhub.platform.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record SalesReportResponse(
        BigDecimal totalRevenue,
        long totalOrders,
        BigDecimal averageOrderValue,
        List<DailySales> dailyTrend,
        List<CategorySales> categoryBreakdown) {
    public record DailySales(LocalDate date, BigDecimal amount, long count) {
    }

    public record CategorySales(String category, BigDecimal amount, long count) {
    }
}
