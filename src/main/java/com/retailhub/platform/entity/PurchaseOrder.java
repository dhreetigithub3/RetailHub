package com.retailhub.platform.entity;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "purchase_orders")
public class PurchaseOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = true, updatable = false)
    private java.time.LocalDateTime createdAt = java.time.LocalDateTime.now();

    @Column(nullable = true)
    private java.time.LocalDateTime deliveredAt;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal totalAmount;

    @Column(nullable = false)
    private String currency;

    @Column(nullable = false)
    private String status;

    @Column(unique = true)
    private String razorpayOrderId;

    // NOTE: kept nullable to avoid breaking existing rows when ddl-auto=update
    private String paymentMethod;

    @ManyToOne
    @JoinColumn(name = "address_id")
    private Address deliveryAddress;

    public PurchaseOrder() {
    }

    public PurchaseOrder(User user, BigDecimal totalAmount, String currency, String status) {
        this.user = user;
        this.totalAmount = totalAmount;
        this.currency = currency;
        this.status = status;
        this.paymentMethod = "PREPAID";
    }

    public PurchaseOrder(User user, BigDecimal totalAmount, String currency, String status, String paymentMethod) {
        this.user = user;
        this.totalAmount = totalAmount;
        this.currency = currency;
        this.status = status;
        this.paymentMethod = paymentMethod;
    }

    public Long getId() {
        return id;
    }

    public java.time.LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public java.time.LocalDateTime getDeliveredAt() {
        return deliveredAt;
    }

    public User getUser() {
        return user;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public String getCurrency() {
        return currency;
    }

    public String getStatus() {
        return status;
    }

    public String getRazorpayOrderId() {
        return razorpayOrderId;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public void setTotalAmount(BigDecimal totalAmount) {
        this.totalAmount = totalAmount;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public void setDeliveredAt(java.time.LocalDateTime deliveredAt) {
        this.deliveredAt = deliveredAt;
    }

    public void setRazorpayOrderId(String razorpayOrderId) {
        this.razorpayOrderId = razorpayOrderId;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public Address getDeliveryAddress() {
        return deliveryAddress;
    }

    public void setDeliveryAddress(Address deliveryAddress) {
        this.deliveryAddress = deliveryAddress;
    }
}
