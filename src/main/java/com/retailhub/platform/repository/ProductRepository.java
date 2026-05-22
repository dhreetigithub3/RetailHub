package com.retailhub.platform.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import com.retailhub.platform.entity.Product;

public interface ProductRepository extends JpaRepository<Product, Long> {

	@Query("""
		SELECT p FROM Product p
		WHERE LOWER(COALESCE(p.name, '')) LIKE CONCAT('%', LOWER(:query), '%')
		OR LOWER(COALESCE(p.brand, '')) LIKE CONCAT('%', LOWER(:query), '%')
		OR LOWER(COALESCE(p.category, '')) LIKE CONCAT('%', LOWER(:query), '%')
		OR LOWER(COALESCE(p.tags, '')) LIKE CONCAT('%', LOWER(:query), '%')
		""")
	List<Product> searchProducts(@Param("query") String query);

	@Modifying
	@Transactional
	@Query("UPDATE Product p SET p.stock = p.stock - :qty WHERE p.id = :id AND p.stock >= :qty")
	int decrementStockIfAvailable(@Param("id") Long id, @Param("qty") Integer qty);

}
