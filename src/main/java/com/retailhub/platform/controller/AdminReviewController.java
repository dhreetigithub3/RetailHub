package com.retailhub.platform.controller;

import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.retailhub.platform.dto.ReviewResponse;
import com.retailhub.platform.service.ReviewService;

@RestController
@RequestMapping("/admin/reviews")
public class AdminReviewController {

    private final ReviewService reviewService;

    public AdminReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<Page<ReviewResponse>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long productId,
            @RequestParam(required = false) Integer minRating,
            @RequestParam(required = false) Integer maxRating,
            @RequestParam(required = false) String moderationStatus,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        return ResponseEntity.ok(reviewService.listAdminReviews(page, size, search, productId, minRating, maxRating, moderationStatus, startDate, endDate));
    }

    @PostMapping("/{reviewId}/remove")

    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<?> remove(@PathVariable Long reviewId) {
        reviewService.removeReview(reviewId);
        return ResponseEntity.ok().build();
    }
}

