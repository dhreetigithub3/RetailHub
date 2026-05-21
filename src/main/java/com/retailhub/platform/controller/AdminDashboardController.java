package com.retailhub.platform.controller;

import java.math.BigDecimal;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import com.retailhub.platform.dto.DashboardStatsResponse;
import com.retailhub.platform.dto.SalesReportResponse;
import com.retailhub.platform.entity.OrderItem;
import com.retailhub.platform.entity.PurchaseOrder;
import com.retailhub.platform.repository.OrderItemRepository;
import com.retailhub.platform.repository.ProductRepository;
import com.retailhub.platform.repository.PurchaseOrderRepository;
import com.retailhub.platform.repository.UserRepository;

@RestController
@RequestMapping("/admin/dashboard")
public class AdminDashboardController {

        private final ProductRepository productRepository;
        private final UserRepository userRepository;
        private final PurchaseOrderRepository orderRepository;
        private final OrderItemRepository orderItemRepository;

        public AdminDashboardController(ProductRepository productRepository,
                        UserRepository userRepository,
                        PurchaseOrderRepository orderRepository,
                        OrderItemRepository orderItemRepository) {
                this.productRepository = productRepository;
                this.userRepository = userRepository;
                this.orderRepository = orderRepository;
                this.orderItemRepository = orderItemRepository;
        }

        @GetMapping("/stats")
        public ResponseEntity<DashboardStatsResponse> getStats() {
                long totalProducts = productRepository.count();
                long totalUsers = userRepository.count();
                BigDecimal revenue = orderRepository.calculateTotalRevenue();

                if (revenue == null)
                        revenue = BigDecimal.ZERO;

                long pending = orderRepository.countByStatus("PENDING");
                long processing = orderRepository.countByStatus("PROCESSING");
                long shipped = orderRepository.countByStatus("SHIPPED");
                long delivered = orderRepository.countByStatus("DELIVERED");
                long cancelled = orderRepository.countByStatus("CANCELLED");

                return ResponseEntity.ok(new DashboardStatsResponse(
                                totalProducts,
                                totalUsers,
                                revenue,
                                pending,
                                processing,
                                shipped,
                                delivered,
                                cancelled));
        }

        @GetMapping("/sales-report")
        public ResponseEntity<SalesReportResponse> getSalesReport() {
                List<String> successfulStatuses = List.of("PAID", "PROCESSING", "SHIPPED", "DELIVERED");

                List<PurchaseOrder> allOrders = orderRepository.findAll();
                BigDecimal totalRevenue = orderRepository.calculateTotalRevenue();
                if (totalRevenue == null)
                        totalRevenue = BigDecimal.ZERO;

                long totalOrdersCount = allOrders.stream()
                                .filter(o -> successfulStatuses.contains(o.getStatus()))
                                .count();

                BigDecimal avgOrderValue = totalOrdersCount > 0
                                ? totalRevenue.divide(BigDecimal.valueOf(totalOrdersCount), 2,
                                                java.math.RoundingMode.HALF_UP)
                                : BigDecimal.ZERO;

                // Daily Trend (Last 30 days)
                Map<LocalDate, BigDecimal> dailyMap = new HashMap<>();
                Map<LocalDate, Long> dailyCount = new HashMap<>();

                for (PurchaseOrder order : allOrders) {
                        if (!successfulStatuses.contains(order.getStatus()) || order.getCreatedAt() == null)
                                continue;
                        LocalDate date = order.getCreatedAt().toLocalDate();
                        dailyMap.put(date, dailyMap.getOrDefault(date, BigDecimal.ZERO).add(order.getTotalAmount()));
                        dailyCount.put(date, dailyCount.getOrDefault(date, 0L) + 1);
                }

                List<SalesReportResponse.DailySales> trend = dailyMap.entrySet().stream()
                                .map(e -> new SalesReportResponse.DailySales(e.getKey(), e.getValue(),
                                                dailyCount.get(e.getKey())))
                                .sorted((a, b) -> b.date().compareTo(a.date()))
                                .limit(30)
                                .collect(Collectors.toList());

                // Category Breakdown
                Map<String, BigDecimal> catRev = new HashMap<>();
                Map<String, Long> catCount = new HashMap<>();

                List<OrderItem> items = orderItemRepository.findAll();
                for (OrderItem item : items) {
                        if (!successfulStatuses.contains(item.getOrder().getStatus()))
                                continue;
                        String cat = item.getProduct().getCategory();
                        if (cat == null)
                                cat = "Uncategorized";

                        BigDecimal subtotal = item.getPriceAtPurchase()
                                        .multiply(BigDecimal.valueOf(item.getQuantity()));
                        catRev.put(cat, catRev.getOrDefault(cat, BigDecimal.ZERO).add(subtotal));
                        catCount.put(cat, catCount.getOrDefault(cat, 0L) + item.getQuantity());
                }

                List<SalesReportResponse.CategorySales> breakdown = catRev.entrySet().stream()
                                .map(e -> new SalesReportResponse.CategorySales(e.getKey(), e.getValue(),
                                                catCount.get(e.getKey())))
                                .sorted((a, b) -> b.amount().compareTo(a.amount()))
                                .collect(Collectors.toList());

                return ResponseEntity.ok(new SalesReportResponse(
                                totalRevenue,
                                totalOrdersCount,
                                avgOrderValue,
                                trend,
                                breakdown));
        }
}
