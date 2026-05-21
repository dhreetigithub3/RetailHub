// Homepage scripts: load products into a grid
let allProducts = [];
let currentCategory = 'all';
let searchQuery = '';

function getToken() {
  return localStorage.getItem('token');
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function loadProductsGrid() {
  const grid = document.getElementById('homeProductGrid');
  if (!grid) return;

  if (getToken()) {
    const hero = document.getElementById('marketingHero');
    const stats = document.getElementById('marketingStats');
    if (hero) hero.style.display = 'none';
    if (stats) stats.style.display = 'none';
  }

  grid.innerHTML = '<div class="empty-state">Fetching latest products...</div>';

  const token = getToken();
  const headers = token ? { 'Authorization': 'Bearer ' + token } : {};

  if (typeof updateCartBadge === 'function') {
    await updateCartBadge();
  }

  try {
    const response = await fetch('/products', { headers });

    if (response.status === 401 && token) {
      localStorage.clear();
      window.location.reload();
      return;
    }

    if (!response.ok) {
      grid.innerHTML = '<div class="empty-state">Products are currently unavailable.</div>';
      return;
    }

    allProducts = await response.json().catch(() => []);
    renderFilteredProducts();
  } catch (err) {
    grid.innerHTML = '<div class="empty-state">Failed to connect to the store.</div>';
  }
}

let currentFilteredProducts = [];
let itemsLoadedCount = 0;
const ITEMS_PER_PAGE = 8;
let infiniteScrollObserver = null;

function renderFilteredProducts() {
  const grid = document.getElementById('homeProductGrid');
  if (!grid) return;

  currentFilteredProducts = allProducts.filter(p => {
    const pCat = (p.category || '').trim().toLowerCase();
    const cCat = (currentCategory || 'all').trim().toLowerCase();
    return cCat === 'all' || pCat === cCat;
  });

  if (currentCategory === 'all') {
    currentFilteredProducts = currentFilteredProducts.sort(() => Math.random() - 0.5);
  }

  grid.innerHTML = '';
  itemsLoadedCount = 0;

  const trigger = document.getElementById('scrollTrigger');
  if (trigger) trigger.remove();

  if (currentFilteredProducts.length === 0) {
    grid.innerHTML = `<div class="empty-state">No products found in ${currentCategory === 'all' ? 'any category' : escapeHtml(currentCategory)}.</div>`;
    return;
  }

  loadMoreProducts();
  setupInfiniteScroll();
}

function renderMinimalProductCard(p) {
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
}

function loadMoreProducts() {
  const grid = document.getElementById('homeProductGrid');
  const nextBatch = currentFilteredProducts.slice(itemsLoadedCount, itemsLoadedCount + ITEMS_PER_PAGE);
  if (nextBatch.length === 0) return;

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = nextBatch.map(renderMinimalProductCard).join('');
  while (tempDiv.firstChild) {
    grid.appendChild(tempDiv.firstChild);
  }

  itemsLoadedCount += nextBatch.length;
}

function setupInfiniteScroll() {
  const grid = document.getElementById('homeProductGrid');
  if (infiniteScrollObserver) infiniteScrollObserver.disconnect();

  if (itemsLoadedCount >= currentFilteredProducts.length) return;

  const trigger = document.createElement('div');
  trigger.id = 'scrollTrigger';
  trigger.style.padding = '2rem';
  trigger.style.textAlign = 'center';
  trigger.style.color = 'var(--text-muted)';
  trigger.style.width = '100%';
  grid.parentNode.insertBefore(trigger, grid.nextSibling);

  infiniteScrollObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && itemsLoadedCount < currentFilteredProducts.length) {
      trigger.innerHTML = '<span>Loading more products...</span>';
      setTimeout(() => {
        loadMoreProducts();
        if (itemsLoadedCount >= currentFilteredProducts.length) {
          trigger.innerHTML = '<span style="font-size: 0.85rem;">You have reached the end of the catalog.</span>';
          infiniteScrollObserver.disconnect();
        } else {
          trigger.innerHTML = '';
        }
      }, 500);
    }
  }, { rootMargin: '200px' });

  infiniteScrollObserver.observe(trigger);
}

document.addEventListener('DOMContentLoaded', () => {
  loadProductsGrid();

  const categoryList = document.getElementById('categoryList');
  if (categoryList) {
    categoryList.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (!link) return;
      e.preventDefault();

      categoryList.querySelectorAll('a').forEach(a => a.classList.remove('active'));
      link.classList.add('active');

      currentCategory = link.dataset.category;

      const hero = document.getElementById('marketingHero');
      if (hero) {
        hero.style.display = currentCategory === 'all' ? 'block' : 'none';
      }

      renderFilteredProducts();
    });
  }
});
