package com.retailhub.platform.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.retailhub.platform.dto.ReviewRequest;
import com.retailhub.platform.dto.ReviewResponse;
import com.retailhub.platform.service.ReviewService;

@RestController
@RequestMapping("/customer/reviews")
public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @PostMapping
    public ResponseEntity<ReviewResponse> submitReview(@RequestBody ReviewRequest request) {
        return ResponseEntity.ok(reviewService.submitReview(request));
    }

    @GetMapping("/order/{orderId}")
    public ResponseEntity<List<ReviewResponse>> getOrderReviews(@PathVariable Long orderId) {
        return ResponseEntity.ok(reviewService.getReviewsForOrder(orderId));
    }
}
