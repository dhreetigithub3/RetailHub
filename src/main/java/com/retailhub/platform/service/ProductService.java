package com.retailhub.platform.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.retailhub.platform.dto.ProductRequest;
import com.retailhub.platform.dto.ProductResponse;
import com.retailhub.platform.entity.Product;
import com.retailhub.platform.repository.ProductRepository;
import com.retailhub.platform.repository.ProductReviewRepository;

@Service
public class ProductService {

	private final ProductRepository productRepository;
	private final ProductReviewRepository productReviewRepository;

	public ProductService(ProductRepository productRepository, ProductReviewRepository productReviewRepository) {
		this.productRepository = productRepository;
		this.productReviewRepository = productReviewRepository;
	}

	public ProductResponse addProduct(ProductRequest request) {
		Product product = new Product(
				request.name(),
				request.description(),
				request.price(),
				request.actualPrice() != null ? request.actualPrice() : request.price(),
				request.stock(),
				request.category(),
				request.imageUrl(),
				request.brand(),
				request.tags());

		Product savedProduct = productRepository.save(product);
		return mapToResponse(savedProduct);
	}

	public ProductResponse updateProduct(Long id, ProductRequest request) {
		Product existingProduct = productRepository.findById(id)
				.orElseThrow(() -> new RuntimeException("Product not found with id: " + id));

		existingProduct.setName(request.name());
		existingProduct.setDescription(request.description());
		existingProduct.setPrice(request.price());
		existingProduct.setActualPrice(request.actualPrice() != null ? request.actualPrice() : request.price());
		existingProduct.setStock(request.stock());
		existingProduct.setCategory(request.category());
		existingProduct.setImageUrl(request.imageUrl());
		existingProduct.setBrand(request.brand());
		existingProduct.setTags(request.tags());

		Product updatedProduct = productRepository.save(existingProduct);
		return mapToResponse(updatedProduct);
	}

	public String deleteProduct(Long id) {
		Product existingProduct = productRepository.findById(id)
				.orElseThrow(() -> new RuntimeException("Product not found with id: " + id));

		productRepository.delete(existingProduct);
		return "Product deleted successfully";
	}

	public ProductResponse getProductById(Long id) {
		Product product = productRepository.findById(id)
				.orElseThrow(() -> new RuntimeException("Product not found with id: " + id));

		return mapToResponse(product);
	}

	public List<ProductResponse> getAllProducts() {
		return productRepository.findAll()
				.stream()
				.map(this::mapToResponse)
				.toList();
	}

	public List<ProductResponse> searchProducts(String query) {
		query = query.trim();
		return productRepository.searchProducts(query)
				.stream()
				.map(this::mapToResponse)
				.toList();
	}

	private ProductResponse mapToResponse(Product product) {
		Integer discountPercentage = 0;
		if (product.getActualPrice() != null && product.getActualPrice().compareTo(java.math.BigDecimal.ZERO) > 0) {
			java.math.BigDecimal discount = product.getActualPrice().subtract(product.getPrice());
			discountPercentage = discount.multiply(java.math.BigDecimal.valueOf(100))
					.divide(product.getActualPrice(), 0, java.math.RoundingMode.HALF_UP)
					.intValue();
		}

		// Calculate average rating and review count
		Double averageRating = productReviewRepository.averageRatingByProduct(product);
		long reviewCount = productReviewRepository.countByProduct(product);

		return new ProductResponse(
				product.getId(),
				product.getName(),
				product.getDescription(),
				product.getPrice(),
				product.getActualPrice(),
				discountPercentage,
				product.getStock(),
				product.getCategory(),
				product.getImageUrl(),
				product.getBrand(),
				product.getTags(),
				averageRating,
				reviewCount);
	}
}