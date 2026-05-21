package com.retailhub.platform.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.retailhub.platform.entity.PurchaseOrder;
import com.retailhub.platform.entity.User;

public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Long> {
    Optional<PurchaseOrder> findByIdAndUser(Long id, User user);

    List<PurchaseOrder> findByUserOrderByIdDesc(User user);

    List<PurchaseOrder> findAllByOrderByIdDesc();

    long countByStatus(String status);

    long countByUser(User user);

    @Modifying
    @Query("DELETE FROM PurchaseOrder o WHERE o.user.id = :userId")
    void deleteByUserId(@Param("userId") Long userId);

    @Query("SELECT SUM(o.totalAmount) FROM PurchaseOrder o WHERE o.status IN ('PAID', 'DELIVERED', 'SHIPPED', 'PROCESSING')")
    java.math.BigDecimal calculateTotalRevenue();
}
