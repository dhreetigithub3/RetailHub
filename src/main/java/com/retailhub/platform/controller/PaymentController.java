package com.retailhub.platform.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.retailhub.platform.dto.AddressRequest;
import com.retailhub.platform.dto.CreatePaymentOrderResponse;
import com.retailhub.platform.dto.VerifyPaymentRequest;
import com.retailhub.platform.service.PaymentService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/customer/payment")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/create-order")
    public ResponseEntity<CreatePaymentOrderResponse> createOrder(@Valid @RequestBody AddressRequest addressRequest) {
        return ResponseEntity.ok(paymentService.createPaymentOrder(addressRequest));
    }

    @PostMapping("/verify")
    public ResponseEntity<Map<String, String>> verifyPayment(@Valid @RequestBody VerifyPaymentRequest request) {
        String message = paymentService.verifyPayment(request);
        return ResponseEntity.ok(Map.of("message", message));
    }

    @PostMapping("/cod")
    public ResponseEntity<Map<String, String>> placeCodOrder(@Valid @RequestBody AddressRequest addressRequest) {
        String message = paymentService.placeCodOrder(addressRequest);
        return ResponseEntity.ok(Map.of("message", message));
    }
}
