// Customer Dashboard & Cart Logic
let dashboardSearchQuery = '';

function getToken() {
  return localStorage.getItem("token");
}

function getRole() {
  return localStorage.getItem("role");
}

function ensureCustomer() {
  const token = getToken();
  const role = getRole();

  if (!token || role !== "USER") {
    window.location.replace("/login.html");
    return false;
  }

  const name = localStorage.getItem("name") || localStorage.getItem("username");
  const welcomeName = document.getElementById("welcomeName");
  if (welcomeName) welcomeName.innerText = name;

  return true;
}

async function loadRecommendedProducts() {
  const productList = document.getElementById("productList");
  const shoppingSection = document.getElementById("shoppingSection");
  if (!productList) return;

  try {
    const response = await fetch("/products", {
      headers: { "Authorization": "Bearer " + getToken() }
    });

    if (!response.ok) throw new Error("Failed to load");

    allDashboardProducts = await response.json();
    window.currentProducts = allDashboardProducts; // Store for re-rendering on cart update
    if (shoppingSection) shoppingSection.style.display = "block";

    // Ensure cart IDs are loaded before rendering products to show correct buttons
    await updateCartBadge();

    if (!allDashboardProducts.length) {
      productList.innerHTML = '<div class="empty-state">No products found</div>';
      return;
    }

    renderFilteredDashboardProducts();
  } catch (err) {
    productList.innerHTML = '<div class="empty-state">Unable to load recommendations.</div>';
  }
}

function renderFilteredDashboardProducts() {
  const products = window.currentProducts || [];
  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(dashboardSearchQuery.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(dashboardSearchQuery.toLowerCase()))
  );
  renderProducts(filtered);
}

function renderProducts(products) {
  const productList = document.getElementById("productList");
  if (!productList) return;

  if (products.length === 0) {
    productList.innerHTML = `<div class="empty-state">No matching products found for "${dashboardSearchQuery}".</div>`;
    return;
  }

  const cartProductIds = window.cartProductIds || [];

  productList.innerHTML = products.map(p => {
    const inCart = cartProductIds.includes(p.id);
    const hasDiscount = p.actualPrice && p.actualPrice > p.price;

    return `
      <div class="product-card">
        ${hasDiscount ? `<div class="discount-badge">${p.discountPercentage}% OFF</div>` : ''}
        <div class="media-container">
          <a href="/view-product.html?id=${p.id}">
            <img src="${p.imageUrl || '/static/img/placeholder.png'}" alt="${p.name}" class="media" />
          </a>
        </div>
        <div class="body">
          <a href="/view-product.html?id=${p.id}" style="text-decoration: none; color: inherit;">
            <h3 class="title">${p.name}</h3>
          </a>
          <div class="meta">
            <span>★ 4.2</span>
            <span>•</span>
            <span>${p.stock > 0 ? 'In Stock' : 'Out of Stock'}</span>
          </div>
          <div class="price-row">
            <div class="price-section">
              <div class="price">₹${p.price}</div>
              ${hasDiscount ? `<div class="price-actual">₹${p.actualPrice}</div>` : ''}
            </div>
            ${hasDiscount ? `<div class="price-discount-text">Save ₹${(p.actualPrice - p.price)}</div>` : ''}
            <div class="actions">
              ${inCart
        ? `<a href="/view-cart.html" class="btn btn-primary btn-add" onclick="event.stopPropagation()">Go to Cart</a>`
        : `<button onclick="addToCart(${p.id}, event)" class="btn btn-add" ${p.stock <= 0 ? 'disabled' : ''}>
                    ${p.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
                  </button>`
      }
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderMinimalCustomerProductCard(p) {
  const hasDiscount = Number(p.actualPrice) > Number(p.price);
  return `
    <a class="product-card product-card-minimal" href="/view-product.html?id=${encodeURIComponent(p.id)}" aria-label="View ${escapeHtml(p.name || 'Product')}">
      ${hasDiscount ? `<div class="discount-badge">${escapeHtml(p.discountPercentage || 0)}% OFF</div>` : ''}
      <div class="media-container">
        <img src="${escapeHtml(p.imageUrl || '/static/img/placeholder.png')}" alt="${escapeHtml(p.name || 'Product')}" class="media" />
      </div>
      <div class="body">
        <h3 class="title">${escapeHtml(p.name || 'Product')}</h3>
        ${p.brand ? `<div class="minimal-brand">${escapeHtml(p.brand)}</div>` : ''}
      </div>
    </a>
  `;
}

function renderProducts(products) {
  const productList = document.getElementById("productList");
  if (!productList) return;

  if (products.length === 0) {
    productList.innerHTML = `<div class="empty-state">No matching products found for "${escapeHtml(dashboardSearchQuery)}".</div>`;
    return;
  }

  productList.innerHTML = products.map(renderMinimalCustomerProductCard).join('');
}

async function addToCart(productId, event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  // client-side pre-check if product info loaded
  const product = (window.currentProducts || []).find(p => Number(p.id) === Number(productId));
  if (product && product.stock != null && product.stock <= 0) {
    showNotification('Product is out of stock', 'error');
    return;
  }
  try {
    const response = await fetch("/customer/cart", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + getToken()
      },
      body: JSON.stringify({ productId, quantity: 1 })
    });

    const result = await response.json().catch(() => ({}));
    if (response.ok) {
      showNotification(result.message || "Added to cart!");
      updateCartBadge(); // Update badge and buttons
    } else {
      showNotification(result.message || "Failed to add to cart", "error");
    }
  } catch (err) {
    showNotification("Error connecting to server", "error");
  }
}

async function loadCart() {
  const cartItemsContainer = document.getElementById("cartItems");
  const cartSubtotal = document.getElementById("cartSubtotal");
  const cartTotal = document.getElementById("cartTotal");
  if (!cartItemsContainer) return;

  try {
    const response = await fetch("/customer/cart", {
      headers: { "Authorization": "Bearer " + getToken() }
    });

    if (!response.ok) throw new Error("Failed to load cart");

    const cart = await response.json();
    const orderSummaryCard = document.getElementById("orderSummaryCard");
    const cartGrid = document.getElementById("cartGrid");

    if (!cart.items || cart.items.length === 0) {
      if (orderSummaryCard) orderSummaryCard.style.display = "none";
      if (cartGrid) cartGrid.style.gridTemplateColumns = "1fr";
      cartItemsContainer.innerHTML = `
            <div style="text-align: center; padding: 3rem;">
              <div class="text-muted">Your cart is empty. <a href="/">Go shopping!</a></div>
            </div>
      `;
      if (cartSubtotal) cartSubtotal.innerText = "₹0.00";
      if (cartTotal) cartTotal.innerText = "₹0.00";
      return;
    }

    if (orderSummaryCard) orderSummaryCard.style.display = "block";
    if (cartGrid) cartGrid.style.gridTemplateColumns = "2fr 1fr";

    // store cart items with stock info for client-side validation
    window.cartItems = {};
    cartItemsContainer.innerHTML = cart.items.map(item => {
      window.cartItems[item.cartItemId] = item;
      const hasDiscount = item.actualPrice && item.actualPrice > item.price;
      const maxAttr = item.stock != null ? `max="${item.stock}"` : '';
      const stockNote = item.stock != null ? `<div style="font-size:0.75rem;color:${item.quantity>item.stock? 'var(--error)' : 'var(--text-muted)'}">Stock: ${item.stock}</div>` : '';
      const disablePlus = item.stock != null && item.quantity >= item.stock ? 'disabled' : '';
      const disableMinus = item.quantity <= 1 ? 'disabled' : '';
      return `
        <div class="cart-item">
          <a href="/view-product.html?id=${item.productId}">
            <img src="${item.imageUrl || ''}" alt="${item.productName}" class="cart-item-img" />
            <div class="cart-item-details">
              <div class="cart-item-title">${item.productName}</div>
          </a>
            <div class="cart-item-meta">
              ${hasDiscount ? `<span class="price-discount">${item.discountPercentage}% OFF</span>` : ''}
            </div>
            <div class="cart-item-actions">
              <div>
                <div class="cart-item-price">₹${item.price}</div>
                ${hasDiscount ? `<div class="price-actual" style="font-size:0.85rem; color: var(--text-muted);">₹${item.actualPrice}</div>` : ''}
              </div>
              <div style="display:flex; align-items:center; gap:0.5rem;">
                <button class="btn btn-ghost btn-sm" onclick="decrementQuantity(${item.cartItemId})" ${disableMinus} aria-label="Decrease">−</button>
                <input id="cart-qty-${item.cartItemId}" data-cart-id="${item.cartItemId}" type="number" value="${item.quantity}" min="1" ${maxAttr} role="spinbutton" aria-valuemin="1" aria-valuemax="${item.stock != null ? item.stock : ''}" aria-valuenow="${item.quantity}" onchange="debouncedUpdateCartItem(${item.cartItemId}, this.value)" style="width: 60px; padding: 4px 8px; text-align:center;" />
                <button id="inc-${item.cartItemId}" class="btn btn-ghost btn-sm" onclick="incrementQuantity(${item.cartItemId})" ${disablePlus} aria-label="Increase">＋</button>
              </div>
              <button onclick="removeCartItem(${item.cartItemId})" class="btn btn-ghost btn-sm" style="color: var(--error);">Remove</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    if (cartSubtotal) cartSubtotal.innerText = `₹${cart.totalAmount}`;
    if (cartTotal) cartTotal.innerText = `₹${cart.totalAmount}`;
    updateCartBadge(); // Sync badge with cart page state
  } catch (err) {
    cartItemsContainer.innerHTML = '<div style="text-align: center; padding: 2rem;">Error loading cart.</div>';
  }
}

async function updateCartItem(cartItemId, quantity) {
  // client-side validation against available stock
  const q = parseInt(quantity);
  const item = window.cartItems ? window.cartItems[cartItemId] : null;
  if (item && item.stock != null && q > item.stock) {
    showNotification(`Only ${item.stock} units available in stock`, "error");
    // revert input value to max available
    const input = document.querySelector(`input[type=number][onchange*="${cartItemId}"]`);
    if (input) input.value = item.stock;
    return;
  }

  try {
    const response = await fetch(`/customer/cart/${cartItemId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + getToken()
      },
      body: JSON.stringify({ quantity: q })
    });

    const resJson = await response.json().catch(() => ({}));
    if (response.ok) {
      loadCart();
    } else {
      showNotification(resJson.message || "Failed to update quantity", "error");
      loadCart();
    }
  } catch (err) {
    showNotification("Error updating cart", "error");
  }
}

async function removeCartItem(cartItemId) {
  try {
    const response = await fetch(`/customer/cart/${cartItemId}`, {
      method: "DELETE",
      headers: { "Authorization": "Bearer " + getToken() }
    });

    if (response.ok) {
      if (ensureCustomer()) {
        loadCart();
        loadSavedAddresses();
        updateCartBadge();
      }
      showNotification("Item removed");
    } else {
      showNotification("Failed to remove item", "error");
    }
  } catch (err) {
    showNotification("Error removing item", "error");
  }
}

async function checkout() {
  const totalText = document.getElementById("cartTotal")?.innerText || "0";
  const totalAmount = parseFloat(totalText.replace(/[^\d.]/g, ''));

  if (isNaN(totalAmount) || totalAmount <= 0) {
    if (confirm("Your cart is empty. Would you like to go back to shopping?")) {
      window.location.replace("/customer-home.html");
    }
    return;
  }

  const btn = document.getElementById("checkoutBtn");
  const selectedMethod = document.querySelector('input[name="paymentMethod"]:checked');
  const paymentMethod = selectedMethod ? selectedMethod.value : "PREPAID";

  btn.disabled = true;
  btn.innerText = "Processing...";

  const addressData = getAddressData();
  if (!addressData) {
    btn.disabled = false;
    btn.innerText = "Place Order";
    return;
  }

  // Validate cart quantities against stock before proceeding
  try {
    const cartRes = await fetch('/customer/cart', { headers: { 'Authorization': 'Bearer ' + getToken() } });
    if (!cartRes.ok) throw new Error('Unable to validate cart');
    const cartData = await cartRes.json();
    const bad = (cartData.items || []).find(i => i.stock != null && i.quantity > i.stock);
    if (bad) {
      showNotification(`Insufficient stock for ${bad.productName} (available ${bad.stock})`, 'error');
      btn.disabled = false;
      btn.innerText = "Place Order";
      return;
    }
  } catch (err) {
    showNotification('Could not validate cart before checkout', 'error');
    btn.disabled = false;
    btn.innerText = "Place Order";
    return;
  }

  try {
    if (paymentMethod === "COD") {
      // Handle Cash on Delivery
      const response = await fetch("/customer/payment/cod", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + getToken()
        },
        body: JSON.stringify(addressData)
      });

      if (response.ok) {
        showNotification("Order placed successfully with COD!", "success");
        setTimeout(() => { window.location.replace("/my-orders.html"); }, 1000);
      } else {
        const errData = await response.json().catch(() => ({}));
        showNotification(errData.message || "Failed to place COD order", "error");
        btn.disabled = false;
        btn.innerText = "Place Order";
      }
      return;
    }

    // Handle Online Payment (Razorpay)
    const response = await fetch("/customer/payment/create-order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + getToken()
      },
      body: JSON.stringify(addressData)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      showNotification(errData.message || "Checkout failed", "error");
      btn.disabled = false;
      btn.innerText = "Place Order";
      return;
    }

    const orderData = await response.json();

    if (typeof Razorpay === "undefined") {
      showNotification("Payment system is currently unavailable", "error");
      btn.disabled = false;
      btn.innerText = "Place Order";
      return;
    }

    const options = {
      key: orderData.keyId,
      amount: orderData.amount,
      currency: orderData.currency,
      name: "RetailHub",
      description: "Order Payment",
      order_id: orderData.razorpayOrderId,
      handler: async function (res) {
        const verifyRes = await fetch("/customer/payment/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + getToken()
          },
          body: JSON.stringify({
            localOrderId: orderData.localOrderId,
            razorpayPaymentId: res.razorpay_payment_id,
            razorpayOrderId: res.razorpay_order_id,
            razorpaySignature: res.razorpay_signature
          })
        });

        if (verifyRes.ok) {
          showNotification("Payment Successful! Redirecting...", "success");
          setTimeout(() => { window.location.href = "/my-orders.html"; }, 2000);
        } else {
          showNotification("Payment verification failed", "error");
          btn.disabled = false;
          btn.innerText = "Place Order";
        }
      },
      prefill: { name: localStorage.getItem("name") },
      theme: { color: "#4f46e5" }
    };

    const rzp = new Razorpay(options);
    rzp.open();
  } catch (err) {
    showNotification("Checkout error occurred", "error");
    btn.disabled = false;
    btn.innerText = "Place Order";
  }
}

async function loadOrders() {
  const ordersList = document.getElementById("ordersList");
  if (!ordersList) return;

  try {
    const response = await fetch("/customer/orders", {
      headers: { "Authorization": "Bearer " + getToken() }
    });

    if (!response.ok) throw new Error("Failed to load orders");

    const orders = await response.json();
    window.currentOrders = orders;

    const inputs = ["orderSearchInput", "statusFilter", "dateFilter", "minPrice", "maxPrice"];
    inputs.forEach(id => {
      const el = document.getElementById(id);
      if (el && !el.dataset.listenerAdded) {
        el.addEventListener("input", () => renderOrdersList(orders));
        el.addEventListener("change", () => renderOrdersList(orders));
        el.dataset.listenerAdded = 'true';
      }
    });

    renderOrdersList(orders);
  } catch (err) {
    console.error("Order load error:", err);
    ordersList.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 2rem; color: red;">Error loading orders: ${err.message}</td></tr>`;
  }
}

function renderOrdersList(orders) {
  const ordersList = document.getElementById("ordersList");
  if (!ordersList) return;

  const searchInput = document.getElementById("orderSearchInput");
  const statusFilter = document.getElementById("statusFilter");
  const dateFilter = document.getElementById("dateFilter");
  const minPrice = document.getElementById("minPrice");
  const maxPrice = document.getElementById("maxPrice");

  const query = searchInput ? searchInput.value.toLowerCase() : "";
  const status = statusFilter ? statusFilter.value : "";
  const days = dateFilter ? dateFilter.value : "all";
  const minP = minPrice && minPrice.value ? parseFloat(minPrice.value) : 0;
  const maxP = maxPrice && maxPrice.value ? parseFloat(maxPrice.value) : Infinity;

  const now = new Date();

  let filtered = orders.filter(o => {
    // Search
    if (query) {
      const matchId = String(o.orderId).includes(query);
      const matchProduct = o.items && o.items.some(i => i.productName.toLowerCase().includes(query));
      if (!matchId && !matchProduct) return false;
    }

    // Status
    if (status && o.status !== status) return false;

    // Date
    if (days !== "all") {
      const orderDate = parseDate(o.orderDate);
      const diffDays = (now - orderDate) / (1000 * 60 * 60 * 24);
      if (diffDays > parseInt(days)) return false;
    }

    // Price
    if (o.totalAmount < minP || o.totalAmount > maxP) return false;

    return true;
  });

  if (!orders || orders.length === 0) {
    ordersList.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 3rem;"><div class="text-muted">You haven&apos;t placed any orders yet. <a href="/">Start shopping!</a></div></td></tr>';
    return;
  }

  if (!filtered || filtered.length === 0) {
    ordersList.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 3rem;">No orders found matching your search.</td></tr>';
    return;
  }

  ordersList.innerHTML = filtered.map(order => {
    let productHtml = '<div class="text-muted">No items</div>';
    if (order.items && order.items.length > 0) {
      const firstItem = order.items[0];
      const extraCount = order.items.length - 1;
      const imageUrl = firstItem.imageUrl || 'https://via.placeholder.com/48';

      productHtml = `
        <div style="display: flex; align-items: center; gap: 1rem;">
          <a href="/view-product.html?id=${firstItem.productId}">
            <img src="${imageUrl}" alt="${firstItem.productName}" style="width: 48px; height: 48px; border-radius: var(--radius-sm); object-fit: cover; background: var(--surface-hover);">
            <div>
              <div style="font-weight: 600; max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text);">
                ${firstItem.productName}
              </div>
            </a>
             ${extraCount > 0
          ? `<div style="font-size: 0.75rem; color: var(--primary); font-weight: 500;">+${extraCount} more item(s)</div>`
          : `<div style="font-size: 0.75rem; color: var(--text-muted);">Qty: ${firstItem.quantity}</div>`}
           </div>
        </div>
      `;
    }

    const safeStatus = order.status || 'PENDING';
    const deliveredLabel = formatDeliveredDate(order);

    return `
      <tr>
        <td>
          ${productHtml}
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.5rem; font-family: monospace;">Order #${order.orderId}</div>
        </td>
        <td style="font-weight: 500;">${formatOrderDateLabel(order.orderDate)}</td>
        <td style="font-weight: 500;">${deliveredLabel ? deliveredLabel : '<span class="text-muted">—</span>'}</td>
        <td><span class="order-status-badge status-${safeStatus.toLowerCase()}">${formatOrderStatus(safeStatus)}</span></td>
        <td style="font-weight: 700; color: var(--text);">${formatCurrency(order.totalAmount)}</td>
        <td>
          <button type="button" onclick="viewOrderDetails(${order.orderId})" class="btn btn-ghost btn-sm">View Details</button>
          ${(order.status || '').toUpperCase() === 'DELIVERED' && order.items && order.items.some(i => !i.reviewRating)
            ? `<button type="button" onclick="viewOrderDetails(${order.orderId})" class="btn btn-primary btn-sm" style="margin-left: 0.35rem;">Rate</button>`
            : ''}
        </td>
      </tr>
    `;
  }).join('');
}

function parseDate(d) {
  if (!d) return new Date();
  if (Array.isArray(d)) {
    return new Date(d[0], d[1] - 1, d[2], d[3] || 0, d[4] || 0, d[5] || 0);
  }
  return new Date(d);
}

function incrementQuantity(cartItemId) {
  const input = document.getElementById(`cart-qty-${cartItemId}`);
  if (!input) return;
  const current = parseInt(input.value) || 0;
  const item = window.cartItems ? window.cartItems[cartItemId] : null;
  const max = item && item.stock != null ? item.stock : Infinity;
  if (current >= max) {
    showNotification(`Only ${max} units available`, 'error');
    // disable button
    const btn = document.getElementById(`inc-${cartItemId}`);
    if (btn) btn.disabled = true;
    return;
  }
  const next = current + 1;
  input.value = next;
  // optimistically update UI; backend validation will correct if needed
  updateCartItem(cartItemId, next);
}

function decrementQuantity(cartItemId) {
  const input = document.getElementById(`cart-qty-${cartItemId}`);
  if (!input) return;
  const current = parseInt(input.value) || 0;
  if (current <= 1) return;
  const next = current - 1;
  input.value = next;
  updateCartItem(cartItemId, next);
}

function escapeHtml(text) {
  if (text == null) return "";
  const el = document.createElement("span");
  el.textContent = String(text);
  return el.innerHTML;
}

function formatCurrency(amount) {
  const n = Number(amount);
  if (Number.isNaN(n)) return "₹0";
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatPaymentMethod(method) {
  const m = (method || "").toUpperCase();
  if (m === "COD") return "Cash on Delivery";
  if (m === "PREPAID" || m === "ONLINE") return "Online Payment";
  return method || "Online Payment";
}

function formatOrderStatus(status) {
  if (!status) return "Pending";
  const s = String(status).toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatOrderDateLabel(d, style = "short") {
  const date = parseDate(d);
  if (style === "long") {
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  }
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatDeliveredDate(order) {
  if ((order.status || "").toUpperCase() !== "DELIVERED" || !order.deliveredDate) {
    return null;
  }
  return formatOrderDateLabel(order.deliveredDate);
}

const TIMELINE_CHECK_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>';

function applyOrderStatusBadge(el, status) {
  if (!el) return;
  const key = (status || "PENDING").toUpperCase();
  el.textContent = formatOrderStatus(key);
  el.className = `order-status-badge status-${key.toLowerCase()}`;
}

function renderOrderTimeline(status) {
  const steps = [
    { key: "PENDING", label: "Ordered" },
    { key: "PROCESSING", label: "Processing" },
    { key: "SHIPPED", label: "Shipped" },
    { key: "DELIVERED", label: "Delivered" }
  ];
  const normalized = (status || "PENDING").toUpperCase();

  if (normalized === "CANCELLED" || normalized === "RETURNED") {
    const msg = normalized === "RETURNED"
      ? "This order was returned."
      : "This order was cancelled.";
    return `<div class="order-timeline-cancelled">${msg}</div>`;
  }

  const currentIndex = steps.findIndex(s => s.key === normalized);
  const activeIndex = currentIndex === -1 ? 0 : currentIndex;
  const isDelivered = normalized === "DELIVERED";
  const progressPct = isDelivered ? 100 : (activeIndex <= 0 ? 0 : (activeIndex / (steps.length - 1)) * 100);

  let stepsHtml = "";
  steps.forEach((step, index) => {
    let stepClass = "";
    let dotInner = "";
    if (isDelivered || index < activeIndex) {
      stepClass = "is-done";
      dotInner = TIMELINE_CHECK_SVG;
    } else if (index === activeIndex) {
      stepClass = "is-active";
    }
    stepsHtml += `
      <div class="order-timeline-step ${stepClass}">
        <div class="order-timeline-dot">${dotInner}</div>
        <span class="order-timeline-label">${step.label}</span>
      </div>`;
  });

  return `
    <div class="order-timeline-track">
      <div class="order-timeline-progress" style="width: ${progressPct}%"></div>
    </div>
    <div class="order-timeline-steps">${stepsHtml}</div>`;
}

function renderStarRating(productId, orderId, currentRating, interactive) {
  const stars = [1, 2, 3, 4, 5].map(n => {
    const filled = currentRating >= n;
    const cls = interactive ? "star-btn" : "star-display";
    const extra = interactive ? ` data-rating="${n}" onclick="setItemRating(${orderId}, ${productId}, ${n})"` : "";
    return `<button type="button" class="${cls}${filled ? " is-filled" : ""}"${extra} aria-label="${n} star">★</button>`;
  }).join("");
  return '<div class="star-rating" data-product-id="' + productId + '">' + stars + '</div>';
}

function renderItemReviewSection(order, item) {
  const isDelivered = (order.status || "").toUpperCase() === "DELIVERED";
  if (!isDelivered) return "";

  const orderId = order.orderId;
  const productId = item.productId;
  const hasReview = item.reviewRating != null && item.reviewRating > 0;

  if (hasReview) {
    return `
      <div class="item-review-section item-review-section--done">
        <span class="item-review-label">Your rating</span>
        ${renderStarRating(productId, orderId, item.reviewRating, false)}
        ${item.reviewComment ? `<p class="item-review-comment">${escapeHtml(item.reviewComment)}</p>` : ""}
      </div>`;
  }

  return `
    <div class="item-review-section" id="review-section-${orderId}-${productId}">
      <span class="item-review-label">Rate this product</span>
      <div class="star-rating star-rating--interactive" id="stars-${orderId}-${productId}">
        ${renderStarRating(productId, orderId, window._pendingRatings?.[`${orderId}-${productId}`] || 0, true)}
      </div>
      <textarea class="form-control item-review-textarea" id="review-comment-${orderId}-${productId}"
        placeholder="Share your experience (optional)" rows="2" maxlength="1000"></textarea>
      <button type="button" class="btn btn-primary btn-sm item-review-submit"
        onclick="submitProductReview(${orderId}, ${productId})">Submit Review</button>
    </div>`;
}

window._pendingRatings = window._pendingRatings || {};

function setItemRating(orderId, productId, rating) {
  window._pendingRatings[`${orderId}-${productId}`] = rating;
  const container = document.getElementById(`stars-${orderId}-${productId}`);
  if (container) {
    container.innerHTML = renderStarRating(productId, orderId, rating, true);
  }
}

async function submitProductReview(orderId, productId) {
  const rating = window._pendingRatings[`${orderId}-${productId}`];
  if (!rating || rating < 1) {
    showNotification("Please select a star rating", "error");
    return;
  }

  const commentEl = document.getElementById(`review-comment-${orderId}-${productId}`);
  const comment = commentEl ? commentEl.value.trim() : "";

  const btn = document.querySelector(`#review-section-${orderId}-${productId} .item-review-submit`);
  if (btn) {
    btn.disabled = true;
    btn.innerText = "Submitting…";
  }

  try {
    const response = await fetch("/customer/reviews", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + getToken()
      },
      body: JSON.stringify({ orderId, productId, rating, comment })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Failed to submit review");
    }

    showNotification("Thank you for your review!", "success");
    delete window._pendingRatings[`${orderId}-${productId}`];

    const freshOrder = await fetchOrderById(orderId);
    if (freshOrder) {
      updateOrderInCache(freshOrder);
      populateOrderModal(freshOrder);
      renderOrdersList(window.currentOrders);
    }
  } catch (err) {
    showNotification(err.message || "Could not submit review", "error");
    if (btn) {
      btn.disabled = false;
      btn.innerText = "Submit Review";
    }
  }
}

async function fetchOrderById(orderId) {
  const response = await fetch(`/customer/orders/${orderId}`, {
    headers: { "Authorization": "Bearer " + getToken() }
  });
  if (!response.ok) return null;
  return response.json();
}

function updateOrderInCache(order) {
  if (!window.currentOrders) return;
  const idx = window.currentOrders.findIndex(o => Number(o.orderId) === Number(order.orderId));
  if (idx >= 0) {
    window.currentOrders[idx] = order;
  }
}

function setModalLoading(loading) {
  const loadingEl = document.getElementById("modalLoadingState");
  const contentEl = document.getElementById("modalOrderContent");
  if (loadingEl) loadingEl.style.display = loading ? "flex" : "none";
  if (contentEl) contentEl.style.display = loading ? "none" : "block";
}

function populateOrderModal(order) {
  if (!order) return;

  document.getElementById("modalOrderId").innerText = `Order #${order.orderId}`;
  document.getElementById("modalOrderDate").innerText = `Placed on ${formatOrderDateLabel(order.orderDate, "long")}`;

  const deliveredLabel = formatDeliveredDate(order);
  const modalDeliveredDate = document.getElementById("modalDeliveredDate");
  const modalDeliveredDateDetail = document.getElementById("modalDeliveredDateDetail");
  if (modalDeliveredDate) {
    if (deliveredLabel) {
      modalDeliveredDate.style.display = "block";
      modalDeliveredDate.innerText = `Delivered on ${formatOrderDateLabel(order.deliveredDate, "long")}`;
    } else {
      modalDeliveredDate.style.display = "none";
      modalDeliveredDate.innerText = "";
    }
  }
  if (modalDeliveredDateDetail) {
    modalDeliveredDateDetail.innerText = deliveredLabel || "—";
  }

  document.getElementById("modalPaymentMethod").innerText = formatPaymentMethod(order.paymentMethod);
  document.getElementById("modalSubtotal").innerText = formatCurrency(order.totalAmount);
  document.getElementById("modalTotalAmount").innerText = formatCurrency(order.totalAmount);

  applyOrderStatusBadge(document.getElementById("modalStatusBadge"), order.status);

  const addrText = document.getElementById("modalAddressText");
  if (addrText) {
    if (order.deliveryAddress) {
      const a = order.deliveryAddress;
      addrText.innerHTML = `${escapeHtml(a.street)}<br>${escapeHtml(a.city)}, ${escapeHtml(a.state)} - ${escapeHtml(a.zipCode)}<br>${escapeHtml(a.country)}`;
    } else {
      addrText.innerText = "No address specified";
    }
  }

  const itemsContainer = document.getElementById("modalOrderItems");
  if (itemsContainer) {
    if (!order.items || order.items.length === 0) {
      itemsContainer.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-muted);">No items found</div>';
    } else {
      itemsContainer.innerHTML = order.items.map(item => `
        <div class="modal-item modal-item--with-review">
          <img src="${escapeHtml(item.imageUrl || "https://via.placeholder.com/64")}" class="modal-item-thumb" alt="${escapeHtml(item.productName)}" />
            <div class="modal-item-body">
              <div class="modal-item-top">
                <div style="flex: 1; min-width: 0;">
                  <div class="order-item-name">
                    ${escapeHtml(item.productName)}
                  </div>
                <div class="text-muted" style="font-size: 0.875rem; margin-top: 0.25rem;">Qty: ${item.quantity} × ${formatCurrency(item.priceAtPurchase)}</div>
              </div>
              <div class="modal-item-price">${formatCurrency(item.subtotal)}</div>
            </div>
            ${renderItemReviewSection(order, item)}
          </div>
        </div>
      `).join("");
    }
  }

  const timelineContainer = document.getElementById("modalOrderTimeline");
  if (timelineContainer) {
    timelineContainer.innerHTML = renderOrderTimeline(order.status);
  }

}

async function viewOrderDetails(orderId) {
  const modal = document.getElementById("orderDetailsModal");
  if (!modal) return;

  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
  setModalLoading(true);

  let order = window.currentOrders
    ? window.currentOrders.find(o => Number(o.orderId) === Number(orderId))
    : null;

  if (!order) {
    try {
      order = await fetchOrderById(orderId);
      if (order) {
        window.currentOrders = window.currentOrders || [];
        updateOrderInCache(order);
        if (!window.currentOrders.some(o => Number(o.orderId) === Number(orderId))) {
          window.currentOrders.push(order);
        }
      }
    } catch (err) {
      console.error("Order fetch error:", err);
    }
  }

  setModalLoading(false);

  if (!order) {
    closeOrderModal();
    showNotification("Could not load order details", "error");
    return;
  }

  populateOrderModal(order);
}

function closeOrderModal() {
  const modal = document.getElementById("orderDetailsModal");
  if (modal) modal.style.display = "none";
  document.body.style.overflow = "auto";
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeOrderModal();
});

document.getElementById("orderDetailsModal")?.addEventListener("click", (e) => {
  if (e.target.id === "orderDetailsModal") closeOrderModal();
});

window.viewOrderDetails = viewOrderDetails;
window.closeOrderModal = closeOrderModal;
window.setItemRating = setItemRating;
window.submitProductReview = submitProductReview;

// Simple notification system
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

// Initialization is now handled by specific pages
// Global for inline onclick
window.checkout = checkout;

async function loadSavedAddresses() {
  const container = document.getElementById("savedAddressesContainer");
  const select = document.getElementById("savedAddressSelect");
  if (!select) return;

  try {
    const response = await fetch("/customer/addresses", {
      headers: { "Authorization": "Bearer " + getToken() }
    });

    if (response.ok) {
      const addresses = await response.json();
      if (addresses.length > 0) {
        container.style.display = "block";
        window.savedAddresses = addresses;
        addresses.forEach(addr => {
          const option = document.createElement("option");
          option.value = addr.id;
          option.innerText = `${addr.street}, ${addr.city}, ${addr.state} - ${addr.zipCode}`;
          select.appendChild(option);
        });

        select.addEventListener("change", (e) => {
          const newForm = document.getElementById("newAddressForm");
          if (e.target.value === "new") {
            newForm.style.display = "block";
          } else {
            newForm.style.display = "none";
          }
        });
      }
    }
  } catch (err) {
    console.error("Failed to load addresses", err);
  }
}

function getAddressData() {
  const select = document.getElementById("savedAddressSelect");
  const isSaved = select && select.value !== "new";

  if (isSaved) {
    return { addressId: parseInt(select.value) };
  }

  const street = document.getElementById("street").value.trim();
  const city = document.getElementById("city").value.trim();
  const state = document.getElementById("state").value.trim();
  const zipCode = document.getElementById("zipCode").value.trim();
  const country = document.getElementById("country").value.trim();
  const saveAddress = document.getElementById("saveAddress").checked;

  if (!street || !city || !state || !zipCode || !country) {
    showNotification("Please fill in all address fields", "error");
    return null;
  }

  return { street, city, state, zipCode, country, saveAddress };
}

async function updateCartBadge() {
  const badge = document.getElementById("cartBadge");
  if (!badge) return;

  try {
    const response = await fetch("/customer/cart", {
      headers: { "Authorization": "Bearer " + getToken() }
    });

    if (response.ok) {
      const cart = await response.json();
      const count = cart.items ? cart.items.length : 0;
      badge.innerText = count;
      badge.style.display = count > 0 ? "inline-block" : "none";

      // Track IDs for "Go to Cart" button logic
      window.cartProductIds = cart.items ? cart.items.map(item => item.productId) : [];

      // Refresh product buttons if on home page and products are loaded
      const productList = document.getElementById("productList");
      if (productList && window.currentProducts) {
        renderFilteredDashboardProducts();
      }

      // Notify other parts of the app (like view-product page)
      document.dispatchEvent(new CustomEvent('cartUpdated', { detail: { cartProductIds: window.cartProductIds } }));
    }
  } catch (err) {
    console.error("Failed to update cart badge", err);
  }
}

// Update badge on page load if logged in as customer
if (getRole() === 'USER' && getToken()) {
  updateCartBadge();

  // Dashboard Search Listener
  document.addEventListener('DOMContentLoaded', () => {
    const dashSearch = document.getElementById('dashboardSearch');
    if (dashSearch) {
      dashSearch.addEventListener('input', (e) => {
        dashboardSearchQuery = e.target.value;
        renderFilteredDashboardProducts();
      });
    }
  });
}

// Debounce helper: per-item debounce to avoid rapid server calls
const _debounceTimers = {};
function debouncedUpdateCartItem(cartItemId, quantity, wait = 300) {
  if (_debounceTimers[cartItemId]) clearTimeout(_debounceTimers[cartItemId]);
  _debounceTimers[cartItemId] = setTimeout(() => {
    updateCartItem(cartItemId, quantity);
    delete _debounceTimers[cartItemId];
  }, wait);
}
