package com.retailhub.platform.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.retailhub.platform.dto.AccountDeletionResponse;
import com.retailhub.platform.entity.User;
import com.retailhub.platform.exception.AccountDeletionException;
import com.retailhub.platform.exception.InsufficientAccessException;
import com.retailhub.platform.repository.AddressRepository;
import com.retailhub.platform.repository.CartItemRepository;
import com.retailhub.platform.repository.OrderItemRepository;
import com.retailhub.platform.repository.PaymentTransactionRepository;
import com.retailhub.platform.repository.ProductReviewRepository;
import com.retailhub.platform.repository.PurchaseOrderRepository;
import com.retailhub.platform.repository.UserRepository;

import jakarta.persistence.EntityNotFoundException;

@Service
public class AccountDeletionService {

    private static final Logger logger = LoggerFactory.getLogger(AccountDeletionService.class);

    private final UserRepository userRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final CartItemRepository cartItemRepository;
    private final AddressRepository addressRepository;
    private final ProductReviewRepository productReviewRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final OrderItemRepository orderItemRepository;
    private final PasswordEncoder passwordEncoder;

    public AccountDeletionService(
            UserRepository userRepository,
            PurchaseOrderRepository purchaseOrderRepository,
            CartItemRepository cartItemRepository,
            AddressRepository addressRepository,
            ProductReviewRepository productReviewRepository,
            PaymentTransactionRepository paymentTransactionRepository,
            OrderItemRepository orderItemRepository,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.cartItemRepository = cartItemRepository;
        this.addressRepository = addressRepository;
        this.productReviewRepository = productReviewRepository;
        this.paymentTransactionRepository = paymentTransactionRepository;
        this.orderItemRepository = orderItemRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Delete current authenticated user's account with cascading cleanup
     * 
     * @param password User's password for verification
     * @return AccountDeletionResponse with deletion statistics
     * @throws AccountDeletionException if account deletion fails
     * @throws InsufficientAccessException if user is not authenticated
     */
    @Transactional
    public AccountDeletionResponse deleteCurrentUserAccount(String password) {
        try {
            String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
            if (currentUsername == null || currentUsername.equals("anonymousUser")) {
                throw new InsufficientAccessException("User must be authenticated to delete account");
            }

            User user = userRepository.findByUsername(currentUsername)
                    .orElseThrow(() -> new EntityNotFoundException("User not found"));

            return deleteUserAccount(user, password, false);
        } catch (InsufficientAccessException | EntityNotFoundException e) {
            logger.error("Account deletion failed for current user", e);
            throw e;
        } catch (Exception e) {
            logger.error("Unexpected error during current user account deletion", e);
            throw new AccountDeletionException("Failed to delete account: " + e.getMessage(), e);
        }
    }

    /**
     * Delete a user account by admin or user (with password verification)
     * 
     * @param userId ID of user to delete
     * @param password Password for verification
     * @param isAdminDeletion Flag indicating if deletion is by admin
     * @return AccountDeletionResponse with deletion statistics
     * @throws AccountDeletionException if account deletion fails
     * @throws InsufficientAccessException if user lacks permissions
     */
    @Transactional
    public AccountDeletionResponse deleteUserAccount(Long userId, String password, boolean isAdminDeletion) {
        try {
            User userToDelete = userRepository.findById(userId)
                    .orElseThrow(() -> new EntityNotFoundException("User not found with ID: " + userId));

            // Validate access: only admins can delete other users, or users can delete themselves
            if (!isAdminDeletion) {
                String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
                if (!userToDelete.getUsername().equals(currentUsername)) {
                    throw new InsufficientAccessException("Users can only delete their own accounts");
                }
            }

            return deleteUserAccount(userToDelete, password, isAdminDeletion);
        } catch (InsufficientAccessException | EntityNotFoundException e) {
            logger.error("Account deletion failed for user ID: {}", userId, e);
            throw e;
        } catch (Exception e) {
            logger.error("Unexpected error during user account deletion for ID: {}", userId, e);
            throw new AccountDeletionException("Failed to delete account: " + e.getMessage(), e);
        }
    }

    /**
     * Internal method to handle user account deletion with data cleanup
     * 
     * @param user User entity to delete
     * @param password Password for verification (if required)
     * @param isAdminDeletion Flag indicating if deletion is by admin
     * @return AccountDeletionResponse with deletion statistics
     */
    @Transactional
    private AccountDeletionResponse deleteUserAccount(User user, String password, boolean isAdminDeletion) {
        try {
            // Verify password (unless admin deletion with different context)
            if (!isAdminDeletion) {
                if (password == null || password.isBlank()) {
                    throw new AccountDeletionException("Password is required for account deletion");
                }
                if (!passwordEncoder.matches(password, user.getPassword())) {
                    throw new AccountDeletionException("Invalid password provided");
                }
            }

            logger.info("Starting account deletion for user ID: {}, username: {}", user.getId(), user.getUsername());

            // Collect deletion statistics before deleting related data
            long ordersCount = purchaseOrderRepository.countByUser(user);
            long cartItemsCount = cartItemRepository.countByUser(user);
            long addressesCount = addressRepository.countByUser(user);
            long reviewsCount = productReviewRepository.countByUser(user);
            long paymentTransactionsCount = paymentTransactionRepository.countByOrderUser(user);

            // Delete related data in proper order to respect cascade constraints
            deleteRelatedData(user);

            // Delete user account (all related data should be cascade deleted)
            Long deletedUserId = user.getId();
            userRepository.delete(user);

            logger.info(
                    "Account deletion completed for user ID: {}, username: {}. Deleted {} orders, {} cart items, {} addresses, {} reviews, {} payments",
                    deletedUserId, user.getUsername(), ordersCount, cartItemsCount, addressesCount, reviewsCount,
                    paymentTransactionsCount);

            return new AccountDeletionResponse(
                    "Account deleted successfully",
                    deletedUserId,
                    (int) ordersCount,
                    (int) cartItemsCount,
                    (int) addressesCount,
                    (int) reviewsCount);

        } catch (AccountDeletionException | InsufficientAccessException e) {
            logger.error("Account deletion validation failed for user ID: {}", user.getId(), e);
            throw e;
        } catch (Exception e) {
            logger.error("Error during account deletion process for user ID: {}", user.getId(), e);
            throw new AccountDeletionException("Account deletion failed: " + e.getMessage(), e);
        }
    }

    /**
     * Delete all related data for a user
     * This method explicitly handles deletion of related entities
     * before the cascade delete mechanism takes effect
     * 
     * @param user User entity whose related data should be deleted
     */
    @Transactional
    private void deleteRelatedData(User user) {
        try {
            Long userId = user.getId();

            // Delete records that hold foreign keys to orders before deleting orders.
            productReviewRepository.deleteByUserIdOrOrderUserId(userId);
            orderItemRepository.deleteByOrderUserId(userId);
            paymentTransactionRepository.deleteByOrderUserId(userId);

            cartItemRepository.deleteByUserId(userId);

            // Orders reference addresses, so addresses are removed after orders.
            purchaseOrderRepository.deleteByUserId(userId);
            addressRepository.deleteByUserId(userId);

        } catch (Exception e) {
            logger.error("Error deleting related data for user ID: {}", user.getId(), e);
            throw new AccountDeletionException("Failed to delete user related data: " + e.getMessage(), e);
        }
    }
}
