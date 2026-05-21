package com.retailhub.platform.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "product_reviews", uniqueConstraints = @UniqueConstraint(columnNames = { "user_id", "product_id", "order_id" }))
public class ProductReview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(optional = false)
    @JoinColumn(name = "product_id")
    private Product product;

    @ManyToOne(optional = false)
    @JoinColumn(name = "order_id")
    private PurchaseOrder order;

    @Column(nullable = false)
    private Integer rating;

    @Column(length = 1000)
    private String comment;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();


    @Column(nullable = false)
    private String moderationStatus = "PUBLISHED";


    @Column(length = 1000)
    private String flaggedReason;


    public ProductReview() {
    }

    public ProductReview(User user, Product product, PurchaseOrder order, Integer rating, String comment) {
        this.user = user;
        this.product = product;
        this.order = order;
        this.rating = rating;
        this.comment = comment;
    }

    public Long getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public Product getProduct() {
        return product;
    }

    public PurchaseOrder getOrder() {
        return order;
    }

    public Integer getRating() {
        return rating;
    }

    public String getComment() {
        return comment;
    }

public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public String getModerationStatus() {
        return moderationStatus;
    }

    public String getFlaggedReason() {
        return flaggedReason;
    }

    public void setModerationStatus(String moderationStatus) {
        this.moderationStatus = moderationStatus;
    }

    public void setFlaggedReason(String flaggedReason) {
        this.flaggedReason = flaggedReason;
    }

    public void setRating(Integer rating) {
        this.rating = rating;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }
}
