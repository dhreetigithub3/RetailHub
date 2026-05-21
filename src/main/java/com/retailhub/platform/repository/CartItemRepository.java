package com.retailhub.platform.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.retailhub.platform.entity.CartItem;
import com.retailhub.platform.entity.Product;
import com.retailhub.platform.entity.User;

public interface CartItemRepository extends JpaRepository<CartItem, Long> {

    List<CartItem> findByUser(User user);

    Optional<CartItem> findByUserAndProduct(User user, Product product);

    Optional<CartItem> findByIdAndUser(Long id, User user);

    void deleteByUser(User user);

    @Modifying
    @Query("DELETE FROM CartItem c WHERE c.user.id = :userId")
    void deleteByUserId(@Param("userId") Long userId);

    long countByUser(User user);
}
