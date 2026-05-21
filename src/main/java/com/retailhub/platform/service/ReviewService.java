package com.retailhub.platform.service;

import java.util.List;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.retailhub.platform.dto.ReviewRequest;
import com.retailhub.platform.dto.ReviewResponse;
import com.retailhub.platform.entity.OrderItem;
import com.retailhub.platform.entity.Product;
import com.retailhub.platform.entity.ProductReview;
import com.retailhub.platform.entity.PurchaseOrder;
import com.retailhub.platform.entity.User;
import com.retailhub.platform.repository.OrderItemRepository;
import com.retailhub.platform.repository.ProductRepository;
import com.retailhub.platform.repository.ProductReviewRepository;
import com.retailhub.platform.repository.PurchaseOrderRepository;
import com.retailhub.platform.repository.UserRepository;

@Service
public class ReviewService {

    private final ProductReviewRepository reviewRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final ProductRepository productRepository;
    private final OrderItemRepository orderItemRepository;
    private final UserRepository userRepository;

    public ReviewService(
            ProductReviewRepository reviewRepository,
            PurchaseOrderRepository purchaseOrderRepository,
            ProductRepository productRepository,
            OrderItemRepository orderItemRepository,
            UserRepository userRepository) {
        this.reviewRepository = reviewRepository;
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.productRepository = productRepository;
        this.orderItemRepository = orderItemRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public ReviewResponse submitReview(ReviewRequest request) {
        if (request.orderId() == null || request.productId() == null) {
            throw new RuntimeException("Order and product are required");
        }
        if (request.rating() == null || request.rating() < 1 || request.rating() > 5) {
            throw new RuntimeException("Rating must be between 1 and 5");
        }

        User user = getCurrentUser();
        PurchaseOrder order = purchaseOrderRepository.findByIdAndUser(request.orderId(), user)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        if (!"DELIVERED".equalsIgnoreCase(order.getStatus())) {
            throw new RuntimeException("You can only review products from delivered orders");
        }

        Product product = productRepository.findById(request.productId())
                .orElseThrow(() -> new RuntimeException("Product not found"));

        boolean productInOrder = orderItemRepository.findByOrder(order).stream()
                .map(OrderItem::getProduct)
                .anyMatch(p -> p.getId().equals(product.getId()));
        if (!productInOrder) {
            throw new RuntimeException("This product is not part of the selected order");
        }

        String comment = request.comment() != null ? request.comment().trim() : "";

        ProductReview review = reviewRepository
                .findByUserAndProductAndOrder(user, product, order)
                .orElseGet(() -> new ProductReview(user, product, order, request.rating(), comment));

        review.setRating(request.rating());
        review.setComment(comment);

        ProductReview saved = reviewRepository.save(review);
        return mapReview(saved);
    }

    public List<ReviewResponse> getReviewsForOrder(Long orderId) {
        User user = getCurrentUser();
        PurchaseOrder order = purchaseOrderRepository.findByIdAndUser(orderId, user)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        return reviewRepository.findByUserAndOrder(user, order).stream()
                .map(this::mapReview)
                .toList();
    }

    public List<ReviewResponse> getProductReviews(Long productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        return reviewRepository.findByProductOrderByCreatedAtDesc(product).stream()
                .filter(r -> r.getModerationStatus() == null || !"REMOVED".equalsIgnoreCase(r.getModerationStatus()))
                .map(this::mapReview)
                .toList();
    }

    public org.springframework.data.domain.Page<ReviewResponse> listAdminReviews(
            int page,
            int size,
            String search,
            Long productId,
            Integer minRating,
            Integer maxRating,
            String moderationStatus,
            String startDateStr,
            String endDateStr) {
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size);
        java.time.LocalDateTime startDate = null;
        java.time.LocalDateTime endDate = null;
        try {
            if (startDateStr != null && !startDateStr.trim().isEmpty()) {
                startDate = java.time.LocalDate.parse(startDateStr.trim()).atStartOfDay();
            }
            if (endDateStr != null && !endDateStr.trim().isEmpty()) {
                endDate = java.time.LocalDate.parse(endDateStr.trim()).atTime(23, 59, 59, 999999999);
            }
        } catch (Exception e) {
            // Ignore parse errors, leave as null
        }
        return reviewRepository
                .findAdminReviews(productId, minRating, maxRating, moderationStatus, startDate, endDate, search, pageable)
                .map(this::mapReview);
    }

    @org.springframework.transaction.annotation.Transactional
    public void removeReview(Long reviewId) {
        ProductReview review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new RuntimeException("Review not found"));
        review.setModerationStatus("REMOVED");
        reviewRepository.save(review);
    }


    public ReviewResponse mapReview(ProductReview review) {
        return new ReviewResponse(

                review.getId(),

                review.getOrder().getId(),
                review.getProduct().getId(),
                review.getProduct().getName(),
                review.getUser().getId(),
                review.getUser().getName(),
                review.getRating(),
                review.getComment(),
                review.getCreatedAt(),
                review.getModerationStatus(),
                review.getFlaggedReason());

    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Logged in user not found"));
    }
}
