package com.retailhub.platform.service;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import com.retailhub.platform.dto.AddressResponse;
import com.retailhub.platform.dto.OrderItemResponse;
import com.retailhub.platform.dto.OrderResponse;
import com.retailhub.platform.entity.Address;
import com.retailhub.platform.entity.OrderItem;
import com.retailhub.platform.entity.Product;
import com.retailhub.platform.entity.ProductReview;
import com.retailhub.platform.entity.PurchaseOrder;
import com.retailhub.platform.entity.User;
import com.retailhub.platform.repository.OrderItemRepository;
import com.retailhub.platform.repository.ProductReviewRepository;
import com.retailhub.platform.repository.PurchaseOrderRepository;
import com.retailhub.platform.repository.UserRepository;

@Service
public class OrderService {

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ProductReviewRepository productReviewRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    public OrderService(PurchaseOrderRepository purchaseOrderRepository,
            OrderItemRepository orderItemRepository,
            ProductReviewRepository productReviewRepository,
            UserRepository userRepository,
            EmailService emailService) {
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.orderItemRepository = orderItemRepository;
        this.productReviewRepository = productReviewRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
    }

    public List<OrderResponse> getMyOrders() {
        User user = getCurrentUser();

        return purchaseOrderRepository.findByUserOrderByIdDesc(user)
                .stream()
                .map(this::mapOrder)
                .toList();
    }

    public OrderResponse getMyOrder(Long orderId) {
        User user = getCurrentUser();

        PurchaseOrder order = purchaseOrderRepository.findByIdAndUser(orderId, user)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        return mapOrder(order);
    }

    public List<OrderResponse> getAllOrders() {
        return purchaseOrderRepository.findAllByOrderByIdDesc()
                .stream()
                .map(this::mapOrder)
                .toList();
    }

    public OrderResponse updateOrderStatus(Long orderId, String status) {
        PurchaseOrder order = purchaseOrderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));
        String prevStatus = order.getStatus();
        order.setStatus(status);
        if ("DELIVERED".equalsIgnoreCase(status)) {
            if (order.getDeliveredAt() == null) {
                order.setDeliveredAt(java.time.LocalDateTime.now());
            }
        } else {
            order.setDeliveredAt(null);
        }

        purchaseOrderRepository.save(order);

        // If status changed, send appropriate email
        if (!prevStatus.equalsIgnoreCase(status)) {
            try {
                java.util.List<OrderItem> items = orderItemRepository.findByOrder(order);
                if ("DELIVERED".equalsIgnoreCase(status)) {
                    emailService.sendOrderDelivered(order, items);
                } else if ("SHIPPED".equalsIgnoreCase(status)) {
                    // Tracking placeholders (admin UI can store tracking id/url later)
                    emailService.sendOrderShipped(order, items, null, null);
                } else if ("CANCELLED".equalsIgnoreCase(status)) {
                    emailService.sendOrderCancelled(order, items, "Your order was cancelled by the seller");
                }
            } catch (Exception e) {
                System.err.println("Failed to send order status email: " + e.getMessage());
            }
        }

        return mapOrder(order);
    }

    private OrderResponse mapOrder(PurchaseOrder order) {
        User viewer = null;
        try {
            viewer = getCurrentUser();
        } catch (RuntimeException ignored) {
            // Admin listing may not need per-user review data
        }

        final User orderViewer = viewer;
        List<OrderItemResponse> items = orderItemRepository.findByOrder(order)
                .stream()
                .map(item -> mapItem(item, order, orderViewer))
                .toList();

        java.time.LocalDateTime deliveredDate = order.getDeliveredAt();
        if (deliveredDate == null && "DELIVERED".equalsIgnoreCase(order.getStatus())) {
            deliveredDate = order.getCreatedAt();
        }

        return new OrderResponse(
                order.getId(),
                order.getTotalAmount(),
                order.getCurrency(),
                order.getStatus(),
                order.getPaymentMethod(),
                order.getUser().getName(),
                order.getUser().getEmail(),
                order.getCreatedAt(),
                deliveredDate,
                mapAddress(order.getDeliveryAddress()),
                items);
    }

    private AddressResponse mapAddress(Address address) {
        if (address == null) return null;
        return new AddressResponse(
                address.getId(),
                address.getStreet(),
                address.getCity(),
                address.getState(),
                address.getZipCode(),
                address.getCountry());
    }

    private OrderItemResponse mapItem(OrderItem item, PurchaseOrder order, User viewer) {
        Product product = item.getProduct();
        BigDecimal subtotal = item.getPriceAtPurchase().multiply(BigDecimal.valueOf(item.getQuantity()));

        Integer reviewRating = null;
        String reviewComment = null;
        if (viewer != null) {
            java.util.Optional<ProductReview> review = productReviewRepository
                    .findByUserAndProductAndOrder(viewer, product, order);
            if (review.isPresent()) {
                reviewRating = review.get().getRating();
                reviewComment = review.get().getComment();
            }
        }

        return new OrderItemResponse(
                product.getId(),
                product.getName(),
                product.getImageUrl(),
                item.getPriceAtPurchase(),
                item.getQuantity(),
                subtotal,
                reviewRating,
                reviewComment);
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();

        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Logged in user not found"));
    }
}

