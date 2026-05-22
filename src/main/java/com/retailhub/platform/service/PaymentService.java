package com.retailhub.platform.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.retailhub.platform.dto.AddressRequest;
import com.retailhub.platform.dto.CreatePaymentOrderResponse;
import com.retailhub.platform.dto.VerifyPaymentRequest;
import com.retailhub.platform.entity.Address;
import com.retailhub.platform.entity.CartItem;
import com.retailhub.platform.entity.OrderItem;
import com.retailhub.platform.entity.PaymentTransaction;
import com.retailhub.platform.entity.Product;
import com.retailhub.platform.entity.PurchaseOrder;
import com.retailhub.platform.entity.User;
import com.retailhub.platform.repository.AddressRepository;
import com.retailhub.platform.repository.CartItemRepository;
import com.retailhub.platform.repository.OrderItemRepository;
import com.retailhub.platform.repository.PaymentTransactionRepository;
import com.retailhub.platform.repository.ProductRepository;
import com.retailhub.platform.repository.PurchaseOrderRepository;
import com.retailhub.platform.repository.UserRepository;

@Service
public class PaymentService {

    private final CartItemRepository cartItemRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final OrderItemRepository orderItemRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final AddressRepository addressRepository;
    private final RazorpayService razorpayService;
    private final EmailService emailService;

    public PaymentService(CartItemRepository cartItemRepository,
            UserRepository userRepository,
            ProductRepository productRepository,
            PurchaseOrderRepository purchaseOrderRepository,
            OrderItemRepository orderItemRepository,
            PaymentTransactionRepository paymentTransactionRepository,
            AddressRepository addressRepository,
            RazorpayService razorpayService,
            EmailService emailService) {
        this.cartItemRepository = cartItemRepository;
        this.userRepository = userRepository;
        this.productRepository = productRepository;
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.orderItemRepository = orderItemRepository;
        this.paymentTransactionRepository = paymentTransactionRepository;
        this.addressRepository = addressRepository;
        this.razorpayService = razorpayService;
        this.emailService = emailService;
    }

    @Transactional
    public CreatePaymentOrderResponse createPaymentOrder(AddressRequest addressRequest) {
        User user = getCurrentUser();
        List<CartItem> cartItems = cartItemRepository.findByUser(user);

        if (cartItems.isEmpty()) {
            throw new RuntimeException("Cart is empty");
        }

        Address address = getOrCreateAddress(user, addressRequest);

        BigDecimal totalAmount = BigDecimal.ZERO;

        for (CartItem cartItem : cartItems) {
            Product product = cartItem.getProduct();

            if (cartItem.getQuantity() > product.getStock()) {
                throw new RuntimeException("Insufficient stock for product: " + product.getName());
            }

            BigDecimal subtotal = product.getPrice()
                    .multiply(BigDecimal.valueOf(cartItem.getQuantity()));

            totalAmount = totalAmount.add(subtotal);
        }

        PurchaseOrder order = new PurchaseOrder(user, totalAmount, razorpayService.getCurrency(), "CREATED");
        order.setPaymentMethod("PREPAID");
        order.setDeliveryAddress(address);
        purchaseOrderRepository.save(order);

        long amountInPaise = toPaise(totalAmount);
        String receipt = "receipt_" + order.getId();

        RazorpayService.RazorpayOrderResponse razorpayOrder = razorpayService.createOrder(amountInPaise, receipt);

        order.setRazorpayOrderId(razorpayOrder.id());
        order.setStatus("PENDING_PAYMENT");
        purchaseOrderRepository.save(order);

        return new CreatePaymentOrderResponse(
                order.getId(),
                razorpayOrder.id(),
                amountInPaise,
                razorpayService.getCurrency(),
                razorpayService.getKeyId());
    }

    @Transactional
    public String verifyPayment(VerifyPaymentRequest request) {
        User user = getCurrentUser();

        PurchaseOrder order = purchaseOrderRepository.findByIdAndUser(request.localOrderId(), user)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        if ("PAID".equals(order.getStatus())) {
            return "Payment already verified and order already placed";
        }

        if (!"PREPAID".equalsIgnoreCase(order.getPaymentMethod())) {
            throw new RuntimeException("This order is not a prepaid order");
        }

        if (!order.getRazorpayOrderId().equals(request.razorpayOrderId())) {
            throw new RuntimeException("Razorpay order id does not match");
        }

        boolean validSignature = razorpayService.verifySignature(
                order.getRazorpayOrderId(),
                request.razorpayPaymentId(),
                request.razorpaySignature());

        if (!validSignature) {
            paymentTransactionRepository.save(new PaymentTransaction(
                    order,
                    request.razorpayPaymentId(),
                    request.razorpayOrderId(),
                    request.razorpaySignature(),
                    "FAILED"));
            throw new RuntimeException("Invalid payment signature");
        }

        List<CartItem> cartItems = cartItemRepository.findByUser(user);

        if (cartItems.isEmpty()) {
            throw new RuntimeException("Cart is empty");
        }

        for (CartItem cartItem : cartItems) {
            Product product = cartItem.getProduct();

            if (cartItem.getQuantity() > product.getStock()) {
                throw new RuntimeException("Insufficient stock for product: " + product.getName());
            }

                OrderItem orderItem = new OrderItem(
                    order,
                    product,
                    cartItem.getQuantity(),
                    product.getPrice());
                orderItemRepository.save(orderItem);

                // Atomic DB decrement to avoid overselling under concurrency
                int updated = productRepository.decrementStockIfAvailable(product.getId(), cartItem.getQuantity());
                if (updated <= 0) {
                throw new RuntimeException("Insufficient stock for product: " + product.getName());
                }
        }

        paymentTransactionRepository.save(new PaymentTransaction(
                order,
                request.razorpayPaymentId(),
                request.razorpayOrderId(),
                request.razorpaySignature(),
                "SUCCESS"));

        order.setStatus("PAID");
        purchaseOrderRepository.save(order);

        // Fetch saved order items for email details
        List<OrderItem> savedItems = orderItemRepository.findByOrder(order);

        // Send order confirmation email
        try {
            emailService.sendOrderPlaced(order, savedItems);
        } catch (Exception e) {
            // Log and continue - do not fail the payment flow if email sending fails
            System.err.println("Failed to send order placed email: " + e.getMessage());
        }

        cartItemRepository.deleteByUser(user);

        return "Payment verified and order placed successfully";
    }

    @Transactional
    public String placeCodOrder(AddressRequest addressRequest) {
    
        User user = getCurrentUser();
    
        List<CartItem> cartItems = cartItemRepository.findByUser(user);
    
        if (cartItems.isEmpty()) {
            throw new RuntimeException("Cart is empty");
        }
    
        Address address = getOrCreateAddress(user, addressRequest);
    
        BigDecimal totalAmount = BigDecimal.ZERO;
    
        // Validate stock + calculate total
        for (CartItem cartItem : cartItems) {
    
            Product product = cartItem.getProduct();
    
            if (cartItem.getQuantity() > product.getStock()) {
                throw new RuntimeException(
                        "Insufficient stock for product: "
                                + product.getName());
            }
    
            BigDecimal subtotal = product.getPrice()
                    .multiply(BigDecimal.valueOf(cartItem.getQuantity()));
    
            totalAmount = totalAmount.add(subtotal);
        }
    
        PurchaseOrder order = new PurchaseOrder(
                user,
                totalAmount,
                razorpayService.getCurrency(),
                "PLACED",
                "COD"
        );
    
        order.setDeliveryAddress(address);
    
        purchaseOrderRepository.save(order);
    
        List<OrderItem> orderItems = new ArrayList<>();
    
        // Create order items + update stock
        for (CartItem cartItem : cartItems) {
    
            Product product = cartItem.getProduct();
    
            int updated = productRepository.decrementStockIfAvailable(
                    product.getId(),
                    cartItem.getQuantity());
    
            if (updated <= 0) {
                throw new RuntimeException(
                        "Insufficient stock for product: "
                                + product.getName());
            }
    
            OrderItem orderItem = new OrderItem(
                    order,
                    product,
                    cartItem.getQuantity(),
                    product.getPrice()
            );
    
            orderItems.add(orderItem);
        }
    
        // Batch save
        orderItemRepository.saveAll(orderItems);
    
        paymentTransactionRepository.save(
                new PaymentTransaction(
                        order,
                        null,
                        null,
                        null,
                        "COD"
                )
        );
    
        cartItemRepository.deleteByUser(user);
    
        // Async email
        try {
            emailService.sendOrderPlaced(order, orderItems);
        } catch (Exception e) {
            System.err.println(
                    "Failed to send COD order email: "
                            + e.getMessage());
        }
    
        return "Order placed successfully with Cash on Delivery";
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();

        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Logged in user not found"));
    }

    private long toPaise(BigDecimal amount) {
        return amount.multiply(BigDecimal.valueOf(100))
                .setScale(0, RoundingMode.HALF_UP)
                .longValueExact();
    }

    private Address getOrCreateAddress(User user, AddressRequest req) {
        if (req.addressId() != null) {
            return addressRepository.findById(req.addressId())
                    .filter(a -> a.getUser().getId().equals(user.getId()))
                    .orElseThrow(() -> new RuntimeException("Saved address not found"));
        }

        // Manual validation for new address
        if (req.street() == null || req.street().isBlank() ||
            req.city() == null || req.city().isBlank() ||
            req.state() == null || req.state().isBlank() ||
            req.zipCode() == null || req.zipCode().isBlank() ||
            req.country() == null || req.country().isBlank()) {
            throw new RuntimeException("All address fields are required for a new address");
        }

        Address address = new Address(
                user,
                req.street(),
                req.city(),
                req.state(),
                req.zipCode(),
                req.country());

        if (Boolean.TRUE.equals(req.saveAddress())) {
            return addressRepository.save(address);
        }

        // Even if not "saving for future", we need to persist it for this order
        // Actually, the requirement says "save it for future reference"
        // So I'll always save it if it's new, or maybe only if saveAddress is true.
        // Let's follow the user's "save it for future reference" and the DTO's saveAddress.
        return addressRepository.save(address);
    }
}
