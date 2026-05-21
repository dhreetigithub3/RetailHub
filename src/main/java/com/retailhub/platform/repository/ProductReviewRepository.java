package com.retailhub.platform.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.retailhub.platform.entity.Product;
import com.retailhub.platform.entity.ProductReview;
import com.retailhub.platform.entity.PurchaseOrder;
import com.retailhub.platform.entity.User;

public interface ProductReviewRepository extends JpaRepository<ProductReview, Long> {

    Optional<ProductReview> findByUserAndProductAndOrder(User user, Product product, PurchaseOrder order);

    List<ProductReview> findByUserAndOrder(User user, PurchaseOrder order);

    List<ProductReview> findByProductOrderByCreatedAtDesc(Product product);

    boolean existsByUserAndProductAndOrder(User user, Product product, PurchaseOrder order);

    @Query("SELECT COALESCE(AVG(r.rating), 0) FROM ProductReview r WHERE r.product = :product")
    Double averageRatingByProduct(@Param("product") Product product);

    long countByProduct(Product product);

    long countByUser(User user);

    List<ProductReview> findByUser(User user);

    @Modifying
    @Query("DELETE FROM ProductReview r WHERE r.user.id = :userId OR r.order.id IN (SELECT o.id FROM PurchaseOrder o WHERE o.user.id = :userId)")
    void deleteByUserIdOrOrderUserId(@Param("userId") Long userId);

    @Query(value = """
            SELECT r
            FROM ProductReview r
            WHERE (:productId IS NULL OR r.product.id = :productId)
              AND (:minRating IS NULL OR r.rating >= :minRating)
              AND (:maxRating IS NULL OR r.rating <= :maxRating)
              AND (:moderationStatus IS NULL OR r.moderationStatus = :moderationStatus)
              AND (:startDate IS NULL OR r.createdAt >= :startDate)
              AND (:endDate IS NULL OR r.createdAt <= :endDate)
              AND (
                    :search IS NULL OR :search = '' OR
                    LOWER(r.comment) LIKE LOWER(CONCAT('%', :search, '%')) OR
                    LOWER(r.user.name) LIKE LOWER(CONCAT('%', :search, '%')) OR
                    LOWER(r.product.name) LIKE LOWER(CONCAT('%', :search, '%'))
              )
            ORDER BY r.createdAt DESC
            """
    )
    Page<ProductReview> findAdminReviews(
            @Param("productId") Long productId,
            @Param("minRating") Integer minRating,
            @Param("maxRating") Integer maxRating,
            @Param("moderationStatus") String moderationStatus,
            @Param("startDate") java.time.LocalDateTime startDate,
            @Param("endDate") java.time.LocalDateTime endDate,
            @Param("search") String search,
            Pageable pageable);
}

