package com.retailhub.platform.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.retailhub.platform.entity.OrderItem;
import com.retailhub.platform.entity.PurchaseOrder;
import com.retailhub.platform.entity.User;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {
    List<OrderItem> findByOrder(PurchaseOrder order);

    List<OrderItem> findByOrderUser(User user);

    long countByOrderUser(User user);

    @Modifying
    @Query("DELETE FROM OrderItem i WHERE i.order.id IN (SELECT o.id FROM PurchaseOrder o WHERE o.user.id = :userId)")
    void deleteByOrderUserId(@Param("userId") Long userId);
}
