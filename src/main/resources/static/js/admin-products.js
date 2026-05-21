// Product Management Logic for Admin
let allAdminProducts = [];
let adminSearchQuery = '';
let adminCategoryFilter = 'all';
let adminMinPrice = null;
let adminMaxPrice = null;
let adminStockFilter = 'all';

function getToken() {
  return localStorage.getItem("token");
}

function ensureAdmin() {
  const token = getToken();
  const role = localStorage.getItem("role");

  if (!token || role !== "ADMIN") {
    window.location.replace("/login.html");
    return false;
  }
  return true;
}

async function loadAdminProducts() {
  const productTableBody = document.getElementById("productTableBody");
  if (!productTableBody) return;

  try {
    const response = await fetch("/products", {
      headers: { "Authorization": "Bearer " + getToken() }
    });

    if (!response.ok) throw new Error("Failed to load");

    allAdminProducts = await response.json();
    renderAdminProductsTable();
  } catch (err) {
    productTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">Error loading products.</td></tr>';
  }
}

function renderAdminProductsTable() {
  const productTableBody = document.getElementById("productTableBody");
  if (!productTableBody) return;

  const filtered = allAdminProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(adminSearchQuery.toLowerCase()) ||
                          (p.brand && p.brand.toLowerCase().includes(adminSearchQuery.toLowerCase())) ||
                          (p.category && p.category.toLowerCase().includes(adminSearchQuery.toLowerCase())) ||
                          (p.id.toString().includes(adminSearchQuery));
    
    const matchesCategory = adminCategoryFilter === 'all' || p.category === adminCategoryFilter;

    const matchesPrice = (adminMinPrice === null || p.price >= adminMinPrice) &&
                         (adminMaxPrice === null || p.price <= adminMaxPrice);

    let matchesStock = true;
    if (adminStockFilter === 'out') matchesStock = p.stock === 0;
    else if (adminStockFilter === 'low') matchesStock = p.stock > 0 && p.stock <= 10;
    else if (adminStockFilter === 'in') matchesStock = p.stock > 10;
    
    return matchesSearch && matchesCategory && matchesPrice && matchesStock;
  });

  if (!filtered.length) {
    productTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 3rem;">No products found matching your filters.</td></tr>';
    return;
  }

  productTableBody.innerHTML = filtered.map(p => `
    <tr>
      <td>
        <img src="${p.imageUrl || ''}" class="product-thumb" style="width: 40px; height: 40px; border-radius: 4px; object-fit: cover;" />
      </td>
      <td>
        <div style="font-weight: 600;">${p.name}</div>
        <div style="font-size: 0.75rem; color: var(--text-muted);">ID: #${p.id} ${p.brand ? `| ${p.brand}` : ''}</div>
      </td>
      <td><span class="badge" style="background: var(--bg-alt); color: var(--text-secondary); border: 1px solid var(--border);">${p.category}</span></td>
      <td style="font-weight: 700; color: var(--primary);">
        ₹${p.price}
        ${p.actualPrice && p.actualPrice > p.price ? `<div class="price-actual" style="font-size: 0.75rem; opacity: 0.6;">₹${p.actualPrice}</div>` : ''}
      </td>
      <td>
        <div style="color: ${p.stock < 10 ? 'var(--error)' : 'inherit'}; font-weight: ${p.stock < 10 ? '700' : '400'};">
          ${p.stock} units
          ${p.stock < 10 ? '<div style="font-size: 0.7rem; text-transform: uppercase;">Low Stock</div>' : ''}
        </div>
      </td>
      <td>
        <div style="display: flex; gap: 0.5rem;">
          <a href="/view-product-admin.html?id=${p.id}" class="btn btn-ghost btn-sm">View</a>
          <a href="/edit-product-admin.html?id=${p.id}" class="btn btn-ghost btn-sm">Edit</a>
          <button onclick="deleteProduct(${p.id})" class="btn btn-ghost btn-sm" style="color: var(--error);">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}
async function handleAddProduct(event) {
  event.preventDefault();
  const messageEl = document.getElementById("message");
  
  const data = {
    name: document.getElementById("name").value,
    brand: document.getElementById("brand").value,
    category: document.getElementById("category").value,
    price: parseFloat(document.getElementById("price").value),
    actualPrice: parseFloat(document.getElementById("actualPrice").value) || parseFloat(document.getElementById("price").value),
    stock: parseInt(document.getElementById("stock").value),
    imageUrl: document.getElementById("imageUrl").value,
    description: document.getElementById("description").value,
    tags: document.getElementById('tags').value
  };

  try {
    const response = await fetch("/admin/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + getToken()
      },
      body: JSON.stringify(data)
    });

    if (response.ok) {
      showNotification("Product Added successfully");
      setTimeout(() => { window.location.href = "/all-products-admin.html"; }, 1500);
    } else {
      const result = await response.json().catch(() => ({}));
      messageEl.innerText = result.message || "Failed to add product";
      messageEl.style.color = "var(--error)";
    }
  } catch (err) {
    showNotification("Error connecting to server", "error");
  }
}

async function handleEditProduct(event) {
  event.preventDefault();
  const id = document.getElementById("productId").value;
  
  const data = {
    name: document.getElementById("name").value,
    brand: document.getElementById("brand").value,
    category: document.getElementById("category").value,
    price: parseFloat(document.getElementById("price").value),
    actualPrice: parseFloat(document.getElementById("actualPrice").value) || parseFloat(document.getElementById("price").value),
    stock: parseInt(document.getElementById("stock").value),
    imageUrl: document.getElementById("imageUrl").value,
    description: document.getElementById("description").value,
    tags: document.getElementById("tags").value
  };

  try {
    const response = await fetch(`/admin/products/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + getToken()
      },
      body: JSON.stringify(data)
    });

    if (response.ok) {
      showNotification("Product updated successfully");
      setTimeout(() => { window.location.href = "/all-products-admin.html"; }, 1500);
    } else {
      const result = await response.json().catch(() => ({}));
      showNotification(result.message || "Failed to update product", "error");
    }
  } catch (err) {
    showNotification("Error connecting to server", "error");
  }
}

async function deleteProduct(id) {
  if (!confirm("Are you sure you want to delete this product?")) return;

  try {
    const response = await fetch(`/admin/products/${id}`, {
      method: "DELETE",
      headers: { "Authorization": "Bearer " + getToken() }
    });

    if (response.ok) {
      showNotification("Product deleted");
      if (window.location.pathname.includes("view-product-admin")) {
        window.location.href = "/all-products-admin.html";
      } else {
        loadAdminProducts();
      }
    } else {
      showNotification("Failed to delete product", "error");
    }
  } catch (err) {
    showNotification("Error connecting to server", "error");
  }
}

function showNotification(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = "animate-fade-in";
  toast.style.position = "fixed";
  toast.style.bottom = "2rem";
  toast.style.right = "2rem";
  toast.style.padding = "1rem 2rem";
  toast.style.borderRadius = "var(--radius)";
  toast.style.background = type === "success" ? "var(--success)" : "var(--error)";
  toast.style.color = "white";
  toast.style.boxShadow = "var(--shadow-lg)";
  toast.style.zIndex = "2000";
  toast.innerText = message;

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

document.addEventListener("DOMContentLoaded", () => {
  if (!ensureAdmin()) return;

  if (document.getElementById("productTableBody")) {
    loadAdminProducts();

    // Smart Filter Listeners
    const searchInput = document.getElementById('adminProductSearch');
    const categorySelect = document.getElementById('adminCategoryFilter');
    const minPriceInput = document.getElementById('adminMinPrice');
    const maxPriceInput = document.getElementById('adminMaxPrice');
    const stockSelect = document.getElementById('adminStockFilter');

    const updateFilters = () => renderAdminProductsTable();

    if (searchInput) searchInput.addEventListener('input', (e) => { adminSearchQuery = e.target.value; updateFilters(); });
    if (categorySelect) categorySelect.addEventListener('change', (e) => { adminCategoryFilter = e.target.value; updateFilters(); });
    if (stockSelect) stockSelect.addEventListener('change', (e) => { adminStockFilter = e.target.value; updateFilters(); });
    
    if (minPriceInput) minPriceInput.addEventListener('input', (e) => { 
      adminMinPrice = e.target.value ? parseFloat(e.target.value) : null; 
      updateFilters(); 
    });
    
    if (maxPriceInput) maxPriceInput.addEventListener('input', (e) => { 
      adminMaxPrice = e.target.value ? parseFloat(e.target.value) : null; 
      updateFilters(); 
    });
  }

  const addProductForm = document.getElementById("addProductForm");
  if (addProductForm) {
    addProductForm.addEventListener("submit", handleAddProduct);
  }

  const editProductForm = document.getElementById("editProductForm");
  if (editProductForm) {
    editProductForm.addEventListener("submit", handleEditProduct);
    
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (id) {
      document.getElementById("productId").value = id;
      fetch(`/products/${id}`, {
        headers: { "Authorization": "Bearer " + getToken() }
      }).then(res => res.json()).then(p => {
        document.getElementById("name").value = p.name;
        document.getElementById("brand").value = p.brand || "";
        document.getElementById("category").value = p.category;
        document.getElementById("price").value = p.price;
        document.getElementById("actualPrice").value = p.actualPrice || p.price;
        document.getElementById("stock").value = p.stock;
        document.getElementById("imageUrl").value = p.imageUrl || "";
        document.getElementById("description").value = p.description || "";
        document.getElementById("tags").value = p.tags || "";
      });
    }
  }

  // View Product Details Page
  if (window.location.pathname.includes("view-product-admin")) {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (id) {
      fetch(`/products/${id}`, {
        headers: { "Authorization": "Bearer " + getToken() }
      }).then(res => res.json()).then(p => {
        // document.getElementById("productName").innerText = p.name;
        document.getElementById("productTitle").innerText = p.name;
        document.getElementById("productCategory").innerText = p.category;
        document.getElementById("productPrice").innerText = `₹${p.price}`;
        
        if (p.actualPrice && p.actualPrice > p.price) {
          const actualPriceEl = document.getElementById("productActualPrice");
          const badgeEl = document.getElementById("productDiscountBadge");
          const savingsEl = document.getElementById("productSavings");
          
          actualPriceEl.innerText = `₹${p.actualPrice}`;
          actualPriceEl.style.display = "block";
          
          badgeEl.innerText = `${p.discountPercentage}% OFF`;
          badgeEl.style.display = "inline-block";
          
          savingsEl.innerText = `You save ₹${(p.actualPrice - p.price).toFixed(2)}`;
          savingsEl.style.display = "block";
        }

        document.getElementById("productDescription").innerText = p.description || "No description available.";
        document.getElementById("productStock").innerText = `${p.stock} units`;
        document.getElementById("productIdText").innerText = `#${p.id}`;
        if (p.imageUrl) document.getElementById("productImage").src = p.imageUrl;
        document.getElementById("editLink").href = `/edit-product-admin.html?id=${p.id}`;
        window.currentProductId = p.id;
      });
    }
  }
});

// Global for inline onclick
window.deleteProduct = deleteProduct;