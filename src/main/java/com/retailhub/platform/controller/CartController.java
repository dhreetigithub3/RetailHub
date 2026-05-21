package com.retailhub.platform.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.retailhub.platform.dto.AddToCartRequest;
import com.retailhub.platform.dto.CartResponse;
import com.retailhub.platform.dto.UpdateCartRequest;
import com.retailhub.platform.service.CartService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/customer/cart")
public class CartController {

    private final CartService cartService;

    public CartController(CartService cartService) {
        this.cartService = cartService;
    }

    @PostMapping
    public ResponseEntity<Map<String, String>> addToCart(@Valid @RequestBody AddToCartRequest request) {
        String message = cartService.addToCart(request);
        return ResponseEntity.ok(Map.of("message", message));
    }

    @GetMapping
    public ResponseEntity<CartResponse> getCart() {
        return ResponseEntity.ok(cartService.getCart());
    }

    @PutMapping("/{cartItemId}")
    public ResponseEntity<Map<String, String>> updateCartItem(@PathVariable Long cartItemId,
            @Valid @RequestBody UpdateCartRequest request) {
        String message = cartService.updateCartItem(cartItemId, request);
        return ResponseEntity.ok(Map.of("message", message));
    }

    @DeleteMapping("/{cartItemId}")
    public ResponseEntity<Map<String, String>> removeCartItem(@PathVariable Long cartItemId) {
        String message = cartService.removeCartItem(cartItemId);
        return ResponseEntity.ok(Map.of("message", message));
    }
}