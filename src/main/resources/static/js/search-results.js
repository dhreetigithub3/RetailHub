// Search Results Page Logic with Smart Filters
(function () {
  const grid = document.getElementById('searchResultsGrid');
  const title = document.getElementById('searchTitle');
  const stats = document.getElementById('searchStats');
  const filterPanel = document.getElementById('smartFilterPanel');
  const filterToggleBtn = document.getElementById('filterToggleBtn');
  const closeFilterBtn = document.getElementById('closeFilterBtn');
  const applyFiltersBtn = document.getElementById('applyFiltersBtn');
  const clearFiltersBtn = document.getElementById('clearFiltersBtn');
  const sortBySelect = document.getElementById('sortBy');

  let allProducts = [];
  let currentQuery = '';
  let activeFilters = {
    categories: new Set(),
    brands: new Set(),
    minPrice: 0,
    maxPrice: Infinity,
    discounts: new Set(['any']),
    ratings: new Set(['any']),
    stock: 'all',
    sort: 'relevance'
  };

  function debounce(fn, wait = 120) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), wait);
    };
  }

  function sanitizeText(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function setupToggleGroup(selector, allValue = 'all') {
    return function handleToggleGroup(e) {
      const allCheckbox = document.querySelector(`${selector}[value="${allValue}"]`);
      const optionCheckboxes = document.querySelectorAll(`${selector}:not([value="${allValue}"])`);

      if (e.target.value === allValue) {
        optionCheckboxes.forEach(cb => cb.checked = false);
      } else {
        if (allCheckbox) allCheckbox.checked = false;
        if (Array.from(optionCheckboxes).every(cb => !cb.checked) && allCheckbox) {
          allCheckbox.checked = true;
        }
      }

      applyFiltersDebounced();
    };
  }

  const handleCategoryChange = setupToggleGroup('.category-filter', 'all');
  const handleBrandChange = setupToggleGroup('.brand-filter', 'all');
  const handleRatingChange = setupToggleGroup('.rating-filter', 'any');
  const handleDiscountChange = setupToggleGroup('.discount-filter', 'any');
  const handleStockChange = setupToggleGroup('.stock-filter', 'all');

  const applyFiltersDebounced = debounce(() => applyFilters());

  // Build category filter list from products
  function buildCategoryFilters(products) {
    const categories = new Set();
    products.forEach(p => {
      if (p.category) categories.add(p.category);
    });

    const categoryList = document.getElementById('categoryFilterList');
    categoryList.innerHTML = `
      <label class="filter-checkbox">
        <input type="checkbox" name="category" value="all" checked class="category-filter">
        <span>All Categories</span>
      </label>
      ${Array.from(categories).map(cat => {
        const safeCat = sanitizeText(cat);
        return `
        <label class="filter-checkbox">
          <input type="checkbox" name="category" value="${encodeURIComponent(cat)}" class="category-filter">
          <span>${safeCat}</span>
        </label>
      `;
      }).join('')}
    `;

    document.querySelectorAll('.category-filter').forEach(checkbox => {
      checkbox.addEventListener('change', handleCategoryChange);
    });
  }

  function buildBrandFilters(products) {
    const brands = new Set();
    products.forEach(p => {
      if (p.brand) brands.add(p.brand);
    });

    const brandList = document.getElementById('brandFilterList');
    brandList.innerHTML = `
      <label class="filter-checkbox">
        <input type="checkbox" name="brand" value="all" checked class="brand-filter">
        <span>All Brands</span>
      </label>
      ${Array.from(brands).map(brand => {
        const safeBrand = sanitizeText(brand);
        return `
        <label class="filter-checkbox">
          <input type="checkbox" name="brand" value="${encodeURIComponent(brand)}" class="brand-filter">
          <span>${safeBrand}</span>
        </label>
      `;
      }).join('')}
    `;

    document.querySelectorAll('.brand-filter').forEach(checkbox => {
      checkbox.addEventListener('change', handleBrandChange);
    });
  }

  function buildRatingFilters() {
    const ratingList = document.getElementById('ratingFilterList');
    ratingList.querySelectorAll('.rating-filter').forEach(checkbox => {
      checkbox.addEventListener('change', handleRatingChange);
    });
  }

  function buildDynamicFilters(products) {
    buildCategoryFilters(products);
    buildBrandFilters(products);
    buildRatingFilters();
  }

  function syncActiveFiltersFromUI() {
    const selectedCategories = Array.from(document.querySelectorAll('.category-filter:checked'))
      .map(cb => cb.value)
      .filter(v => v !== 'all')
      .map(v => decodeURIComponent(v));
    activeFilters.categories = new Set(selectedCategories);

    const selectedBrands = Array.from(document.querySelectorAll('.brand-filter:checked'))
      .map(cb => cb.value)
      .filter(v => v !== 'all')
      .map(v => decodeURIComponent(v));
    activeFilters.brands = new Set(selectedBrands);

    const minPrice = parseFloat(document.getElementById('minPrice').value) || 0;
    const maxPrice = parseFloat(document.getElementById('maxPrice').value) || Infinity;
    activeFilters.minPrice = minPrice;
    activeFilters.maxPrice = maxPrice;

    const selectedDiscounts = Array.from(document.querySelectorAll('.discount-filter:checked'))
      .map(cb => cb.value);
    activeFilters.discounts = new Set(selectedDiscounts);

    const selectedRatings = Array.from(document.querySelectorAll('.rating-filter:checked'))
      .map(cb => cb.value);
    activeFilters.ratings = new Set(selectedRatings);

    const stockCheckbox = document.querySelector('.stock-filter[value="inStock"]:checked');
    activeFilters.stock = stockCheckbox ? 'inStock' : 'all';

    activeFilters.sort = document.getElementById('sortBy').value;
  }

  function updateFilterSummary() {
    const summary = document.getElementById('filterSummary');
    if (!summary) return;

    const tags = [];
    if (activeFilters.categories.size) tags.push(`Category: ${Array.from(activeFilters.categories).join(', ')}`);
    if (activeFilters.brands.size) tags.push(`Brand: ${Array.from(activeFilters.brands).join(', ')}`);
    if (!activeFilters.discounts.has('any')) tags.push(`Discount: ${Array.from(activeFilters.discounts).join('% or higher, ')}%`);
    if (!activeFilters.ratings.has('any')) tags.push(`Rating: ${Array.from(activeFilters.ratings).map(r => `${r}★+`).join(', ')}`);
    if (activeFilters.stock === 'inStock') tags.push('Availability: In Stock');
    if (activeFilters.minPrice || activeFilters.maxPrice !== Infinity) {
      const minLabel = activeFilters.minPrice ? `₹${activeFilters.minPrice}` : '0';
      const maxLabel = activeFilters.maxPrice !== Infinity ? `₹${activeFilters.maxPrice}` : 'Any';
      tags.push(`Price: ${minLabel} - ${maxLabel}`);
    }

    summary.innerHTML = tags.length
      ? tags.map(tag => `<span class="filter-tag">${tag}</span>`).join('')
      : '<span class="filter-tag filter-tag-muted">No active filters</span>';
  }

  function applyFilters({ closePanel = false } = {}) {
    syncActiveFiltersFromUI();
    filterAndRenderProducts();
    updateFilterSummary();
    if (closePanel) closeFilterPanel();
  }

  // Filter products based on active filters
  function filterAndRenderProducts() {
    let filtered = [...allProducts];

    if (activeFilters.categories.size > 0) {
      filtered = filtered.filter(p => activeFilters.categories.has(p.category));
    }

    if (activeFilters.brands.size > 0) {
      filtered = filtered.filter(p => activeFilters.brands.has(p.brand));
    }

    filtered = filtered.filter(p => {
      const price = Number(p.price) || 0;
      return price >= activeFilters.minPrice && price <= activeFilters.maxPrice;
    });

    if (!activeFilters.discounts.has('any')) {
      filtered = filtered.filter(p => {
        const discount = Number(p.discountPercentage) || 0;
        return Array.from(activeFilters.discounts).some(d => discount >= parseInt(d, 10));
      });
    }

    if (!activeFilters.ratings.has('any')) {
      filtered = filtered.filter(p => {
        const rating = Number(p.averageRating) || 0;
        return Array.from(activeFilters.ratings).some(r => rating >= parseFloat(r));
      });
    }

    if (activeFilters.stock === 'inStock') {
      filtered = filtered.filter(p => Number(p.stock) > 0);
    }

    filtered = sortProducts(filtered, activeFilters.sort);

    renderResults(filtered, currentQuery);
  }

  // Sort products based on criteria
  function sortProducts(products, sortBy) {
    const sorted = [...products];

    switch (sortBy) {
      case 'priceLow':
        return sorted.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
      case 'priceHigh':
        return sorted.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
      case 'discount':
        return sorted.sort((a, b) => (Number(b.discountPercentage) || 0) - (Number(a.discountPercentage) || 0));
      case 'newest':
        return sorted.sort((a, b) => {
          if (a.createdAt && b.createdAt) {
            return new Date(b.createdAt) - new Date(a.createdAt);
          }
          if (!isNaN(Number(a.id)) && !isNaN(Number(b.id))) {
            return Number(b.id) - Number(a.id);
          }
          return 0;
        });
      case 'popularity':
        return sorted.sort((a, b) => {
          const scoreA = Number(a.popularity) || Number(a.averageRating) || 0;
          const scoreB = Number(b.popularity) || Number(b.averageRating) || 0;
          return scoreB - scoreA;
        });
      case 'relevance':
      default:
        return sorted;
    }
  }

  // Toggle filter panel visibility
  function toggleFilterPanel() {
    if (filterPanel.style.display === 'none' || !filterPanel.style.display) {
      filterPanel.style.display = 'block';
      filterToggleBtn.classList.add('active');
    } else {
      closeFilterPanel();
    }
  }

  // Close filter panel
  function closeFilterPanel() {
    filterPanel.style.display = 'none';
    filterToggleBtn.classList.remove('active');
  }

  // Clear all filters
  function clearAllFilters() {
    document.querySelectorAll('.category-filter[value="all"]').forEach(cb => cb.checked = true);
    document.querySelectorAll('.category-filter:not([value="all"])').forEach(cb => cb.checked = false);
    document.querySelectorAll('.brand-filter[value="all"]').forEach(cb => cb.checked = true);
    document.querySelectorAll('.brand-filter:not([value="all"])').forEach(cb => cb.checked = false);
    document.querySelectorAll('.discount-filter').forEach(cb => cb.checked = cb.value === 'any');
    document.querySelectorAll('.rating-filter').forEach(cb => cb.checked = cb.value === 'any');
    document.querySelectorAll('.stock-filter').forEach(cb => cb.checked = cb.value === 'all');

    document.getElementById('minPrice').value = '';
    document.getElementById('maxPrice').value = '';
    document.getElementById('sortBy').value = 'relevance';

    activeFilters = {
      categories: new Set(),
      brands: new Set(),
      minPrice: 0,
      maxPrice: Infinity,
      discounts: new Set(['any']),
      ratings: new Set(['any']),
      stock: 'all',
      sort: 'relevance'
    };

    filterAndRenderProducts();
    updateFilterSummary();
  }

  async function fetchResults(query) {
    if (!grid) return;
    grid.innerHTML = '<div class="empty-state">Looking for matches...</div>';
    
    if (!query) {
      grid.innerHTML = '<div class="empty-state">Please enter a search term above.</div>';
      title.innerText = 'What are you looking for?';
      stats.innerText = '';
      filterToggleBtn.style.display = 'none';
      return;
    }

    currentQuery = query;
    title.innerText = `Results for "${query}"`;

    try {
      const response = await fetch(`/products/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Search failed');

      allProducts = await response.json();
      buildDynamicFilters(allProducts);
      filterToggleBtn.style.display = 'inline-block';
      applyFilters();
    } catch (err) {
      console.error(err);
      grid.innerHTML = '<div class="empty-state">Oops! We encountered an error while searching. Please try again.</div>';
    }
  }

  function renderResults(products, query) {
    if (!grid) return;

    if (products.length === 0) {
      grid.innerHTML = `<div class="empty-state">No products found matching your filters. Try adjusting your criteria!</div>`;
      stats.innerText = `Showing 0 of ${allProducts.length} results`;
      return;
    }

    stats.innerText = allProducts.length > products.length
      ? `Showing ${products.length} of ${allProducts.length} results`
      : `Found ${products.length} item${products.length > 1 ? 's' : ''}`;

    const role = localStorage.getItem('role');
    const isUser = role === 'USER' || !role;
    const cartProductIds = window.cartProductIds || [];

    grid.innerHTML = products.map(p => {
      const inCart = cartProductIds.includes(p.id);
      const hasDiscount = Number(p.actualPrice) > Number(p.price);
      const id = encodeURIComponent(p.id);
      const safeName = escapeHtml(p.name || 'Product');
      const safeBrand = escapeHtml(p.brand || '');
      const safeImage = escapeHtml(p.imageUrl || '/static/img/placeholder.png');

      return `
        <a class="product-card product-card-minimal animate-fade-in" href="/view-product.html?id=${id}" aria-label="View ${safeName}">
        ${hasDiscount ? `<div class="discount-badge">${escapeHtml(p.discountPercentage || 0)}% OFF</div>` : ''}
        <div class="media-container">
          <img src="${safeImage}" alt="${safeName}" class="media" loading="lazy" />
          ${p.averageRating? `<div class="product-rating">${Number(p.averageRating).toFixed(1)}
              <span>★</span>
            </div>`: ''}
        </div>
        <div class="body">
          <h3 class="title">${safeName}</h3>
          ${safeBrand ? `<div class="minimal-brand">${safeBrand}</div>` : ''}
        </div>
      </a>
    `;
    }).join('');
  }

  // Handle add to cart (shared logic)
  window.handleAddToCart = async function(event, productId) {
    event.preventDefault();
    event.stopPropagation();

    if (!localStorage.getItem('token')) {
      window.location.href = '/login.html';
      return;
    }

    if (typeof addToCart === 'function') {
      await addToCart(productId);
    } else {
      try {
        const res = await fetch("/customer/cart", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + localStorage.getItem('token')
          },
          body: JSON.stringify({ productId, quantity: 1 })
        });
        if (res.ok) alert("Added to cart!");
        else alert("Failed to add");
      } catch (e) { alert("Error adding to cart"); }
    }
  };

  // Event listeners
  if (filterToggleBtn) filterToggleBtn.addEventListener('click', toggleFilterPanel);
  if (closeFilterBtn) closeFilterBtn.addEventListener('click', closeFilterPanel);
  if (applyFiltersBtn) applyFiltersBtn.addEventListener('click', () => applyFilters({ closePanel: true }));
  if (clearFiltersBtn) clearFiltersBtn.addEventListener('click', clearAllFilters);
  if (sortBySelect) sortBySelect.addEventListener('change', applyFilters);
  const priceMinInput = document.getElementById('minPrice');
  const priceMaxInput = document.getElementById('maxPrice');
  const applyPriceBtn = document.getElementById('applyPriceBtn');
  const discountCheckboxes = document.querySelectorAll('.discount-filter');
  const stockCheckboxes = document.querySelectorAll('.stock-filter');

  if (priceMinInput) priceMinInput.addEventListener('input', applyFiltersDebounced);
  if (priceMaxInput) priceMaxInput.addEventListener('input', applyFiltersDebounced);
  if (applyPriceBtn) applyPriceBtn.addEventListener('click', (e) => { e.preventDefault(); applyFilters(); });
  discountCheckboxes.forEach(checkbox => checkbox.addEventListener('change', handleDiscountChange));
  stockCheckboxes.forEach(checkbox => checkbox.addEventListener('change', handleStockChange));

  // Close filter panel when clicking outside
  document.addEventListener('click', (e) => {
    if (filterPanel && filterPanel.style.display !== 'none' &&
      !filterPanel.contains(e.target) && !filterToggleBtn.contains(e.target)) {
      closeFilterPanel();
    }
  });

  // Initial load
  document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q');
    fetchResults(query);

    // Sync search input if it exists
    const searchInput = document.getElementById('productSearch');
    if (searchInput && query) {
      searchInput.value = query;
    }
  });
})();
