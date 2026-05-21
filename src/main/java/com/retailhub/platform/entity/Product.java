package com.retailhub.platform.entity;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "products")
public class Product {

	@Id
	@GeneratedValue(strategy = GenerationType.AUTO)
	Long id;

	@Column(nullable = false)
	private String name;

	@Column(nullable = false, length = 1000)
	private String description;

	@Column(nullable = false, precision = 10, scale = 2)
	private BigDecimal price;

	@Column(precision = 10, scale = 2)
	private BigDecimal actualPrice;

	@Column(nullable = false)
	private Integer stock;

	@Column(nullable = false)
	private String category;

	private String imageUrl;

	private String brand;

	@Column(length = 500)
	private String tags;

	public Product() {
		super();
	}

	public Product(String name, String description, BigDecimal price, BigDecimal actualPrice, Integer stock, String category, String imageUrl, String brand, String tags) {
		super();
		this.name = name;
		this.description = description;
		this.price = price;
		this.actualPrice = actualPrice;
		this.stock = stock;
		this.category = category;
		this.imageUrl = imageUrl;
		this.brand = brand;
		this.tags = tags;
	}

	public Product(Long id, String name, String description, BigDecimal price, BigDecimal actualPrice, Integer stock, String category,
			String imageUrl, String brand, String tags) {
		super();
		this.id = id;
		this.name = name;
		this.description = description;
		this.price = price;
		this.actualPrice = actualPrice;
		this.stock = stock;
		this.category = category;
		this.imageUrl = imageUrl;
		this.brand = brand;
		this.tags = tags;
	}

	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public String getDescription() {
		return description;
	}

	public void setDescription(String description) {
		this.description = description;
	}

	public BigDecimal getPrice() {
		return price;
	}

	public void setPrice(BigDecimal price) {
		this.price = price;
	}

	public Integer getStock() {
		return stock;
	}

	public void setStock(Integer stock) {
		this.stock = stock;
	}

	public String getCategory() {
		return category;
	}

	public void setCategory(String category) {
		this.category = category;
	}

	public String getImageUrl() {
		return imageUrl;
	}

	public void setImageUrl(String imageUrl) {
		this.imageUrl = imageUrl;
	}

	public BigDecimal getActualPrice() {
		return actualPrice;
	}

	public void setActualPrice(BigDecimal actualPrice) {
		this.actualPrice = actualPrice;
	}

	public String getBrand() {
		return brand;
	}

	public void setBrand(String brand) {
		this.brand = brand;
	}

	public String getTags() {
		return tags;
	}

	public void setTags(String tags) {
		this.tags = tags;
	}

}
