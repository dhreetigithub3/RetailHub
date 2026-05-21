package com.retailhub.platform.dto;

import java.math.BigDecimal;

public record DashboardStatsResponse(
        long totalProducts,
        long totalUsers,
        BigDecimal totalRevenue,
        long pendingOrders,
        long processingOrders,
        long shippedOrders,
        long deliveredOrders,
        long cancelledOrders
) {
}
