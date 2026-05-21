// Admin Order Management Logic
let allOrders = [];
let orderSearchQuery = '';
let orderStatusFilter = 'all';
let orderStartDate = null;
let orderEndDate = null;

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

async function loadAdminOrders() {
  const ordersTableBody = document.getElementById("ordersTableBody");
  if (!ordersTableBody) return;

  try {
    const response = await fetch("/admin/orders", {
      headers: { "Authorization": "Bearer " + getToken() }
    });
    
    // Also fetch stats for the summary cards
    const statsResponse = await fetch("/admin/dashboard/stats", {
      headers: { "Authorization": "Bearer " + getToken() }
    });

    if (response.ok) {
      allOrders = await response.json();
      window.currentOrders = allOrders; // For modal
      renderOrdersTable();
    }
    
    if (statsResponse.ok) {
      const stats = await statsResponse.json();
      const pc = document.getElementById("pendingCount");
      const proc = document.getElementById("processingCount");
      const sc = document.getElementById("shippedCount");
      const dc = document.getElementById("deliveredCount");
      const cc = document.getElementById("cancelledCount");
      
      if (pc) pc.innerText = stats.pendingOrders || 0;
      if (proc) proc.innerText = stats.processingOrders || 0;
      if (sc) sc.innerText = stats.shippedOrders || 0;
      if (dc) dc.innerText = stats.deliveredOrders || 0;
      if (cc) cc.innerText = stats.cancelledOrders || 0;
    }
  } catch (err) {
    ordersTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">Error loading orders.</td></tr>';
  }
}

function renderOrdersTable() {
  const ordersTableBody = document.getElementById("ordersTableBody");
  if (!ordersTableBody) return;

  const filtered = allOrders.filter(order => {
    const matchesSearch = order.orderId.toString().includes(orderSearchQuery) ||
                          (order.customerName && order.customerName.toLowerCase().includes(orderSearchQuery.toLowerCase())) ||
                          (order.customerEmail && order.customerEmail.toLowerCase().includes(orderSearchQuery.toLowerCase()));
    
    const matchesStatus = orderStatusFilter === 'all' || order.status === orderStatusFilter;
    
    let matchesDate = true;
    if (order.orderDate) {
      const oDate = new Date(order.orderDate);
      if (orderStartDate) {
        const sDate = new Date(orderStartDate);
        sDate.setHours(0,0,0,0);
        if (oDate < sDate) matchesDate = false;
      }
      if (orderEndDate) {
        const eDate = new Date(orderEndDate);
        eDate.setHours(23,59,59,999);
        if (oDate > eDate) matchesDate = false;
      }
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  const countBadge = document.getElementById("orderCountBadge");
  if (countBadge) {
    countBadge.innerText = `${allOrders.length} Total Orders`;
  }

  if (!filtered.length) {
    ordersTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 3rem;">No orders found matching your search.</td></tr>';
    return;
  }

  const statusColors = {
    'PENDING': 'background: #fff8e1; color: #f57f17; border: 1px solid #ffe082;',
    'PROCESSING': 'background: #e3f2fd; color: #1565c0; border: 1px solid #90caf9;',
    'SHIPPED': 'background: #f3e5f5; color: #7b1fa2; border: 1px solid #ce93d8;',
    'DELIVERED': 'background: #e8f5e9; color: #2e7d32; border: 1px solid #a5d6a7;',
    'CANCELLED': 'background: #ffebee; color: #c62828; border: 1px solid #ef9a9a;'
  };

  ordersTableBody.innerHTML = filtered.map(order => `
    <tr>
      <td style="font-family: monospace; font-weight: 600;">#${order.orderId}</td>
      <td>
        <div style="font-weight: 600;">${order.customerName || 'Unknown'}</div>
        <div class="text-muted" style="font-size: 0.875rem;">${order.customerEmail || ''}</div>
      </td>
      <td>${order.orderDate ? new Date(order.orderDate).toLocaleDateString() : 'N/A'}</td>
      <td><span class="badge" style="${statusColors[order.status] || ''} font-size: 0.75rem;">${order.status}</span></td>
      <td style="font-weight: 700;">₹${order.totalAmount}</td>
      <td>
        <button onclick="viewOrderDetails(${order.orderId})" class="btn btn-ghost btn-sm">Manage</button>
      </td>
    </tr>
  `).join('');
}

function viewOrderDetails(orderId) {
  const order = window.currentOrders ? window.currentOrders.find(o => o.orderId === orderId) : null;
  if (!order) return;

  document.getElementById("modalOrderId").innerText = `Order #${order.orderId}`;
  document.getElementById("modalOrderDate").innerText = order.orderDate ? new Date(order.orderDate).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric'
  }) : 'Date N/A';
  document.getElementById("modalCustomerName").innerText = order.customerName || 'Unknown';
  document.getElementById("modalPaymentMethod").innerText = order.paymentMethod || "COD";
  
  const addrText = document.getElementById("modalAddressText");
  if (order.deliveryAddress) {
    const a = order.deliveryAddress;
    addrText.innerText = `${a.street}, ${a.city}, ${a.state} - ${a.zipCode}, ${a.country}`;
  } else {
    addrText.innerText = "No address specified";
  }
  
  const statusSelect = document.getElementById("orderStatusSelect");
  statusSelect.value = order.status;
  
  const updateBtn = document.getElementById("updateStatusBtn");
  updateBtn.onclick = () => updateOrderStatus(order.orderId, statusSelect.value);

  document.getElementById("modalTotalAmount").innerText = `₹${order.totalAmount}`;

  const itemsContainer = document.getElementById("modalOrderItems");
  itemsContainer.innerHTML = order.items.map(item => `
    <div class="modal-item">
      <img src="${item.imageUrl || '/static/img/placeholder.png'}" class="modal-item-thumb" alt="${item.productName}" />
      <div style="flex: 1;">
        <div style="font-weight: 700; font-size: 1rem;">${item.productName}</div>
        <div class="text-muted" style="font-size: 0.875rem;">Quantity: ${item.quantity}</div>
      </div>
      <div style="text-align: right;">
        <div style="font-weight: 700; color: var(--primary);">₹${item.subtotal}</div>
        <div class="text-muted" style="font-size: 0.75rem;">₹${item.priceAtPurchase} each</div>
      </div>
    </div>
  `).join('');

  document.getElementById("orderDetailsModal").style.display = "flex";
  document.body.style.overflow = "hidden"; // Prevent background scroll
}

function closeOrderModal() {
  document.getElementById("orderDetailsModal").style.display = "none";
  document.body.style.overflow = "auto";
}

async function updateOrderStatus(orderId, newStatus) {
  try {
    const response = await fetch(`/admin/orders/${orderId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + getToken()
      },
      body: JSON.stringify({ status: newStatus })
    });

    if (response.ok) {
      showNotification("Order status updated successfully!");
      closeOrderModal();
      loadAdminOrders(); // Refresh table
    } else {
      const result = await response.json().catch(() => ({}));
      showNotification(result.message || "Failed to update order status", "error");
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
  loadAdminOrders();

  // Smart Filter Listeners
  const searchInput = document.getElementById('adminOrderSearch');
  const statusSelect = document.getElementById('adminStatusFilter');
  const startDateInput = document.getElementById('adminStartDate');
  const endDateInput = document.getElementById('adminEndDate');

  const updateFilters = () => renderOrdersTable();

  if (searchInput) searchInput.addEventListener('input', (e) => { orderSearchQuery = e.target.value; updateFilters(); });
  if (statusSelect) statusSelect.addEventListener('change', (e) => { orderStatusFilter = e.target.value; updateFilters(); });
  
  if (startDateInput) startDateInput.addEventListener('change', (e) => {
    orderStartDate = e.target.value || null;
    updateFilters();
  });

  if (endDateInput) endDateInput.addEventListener('change', (e) => {
    orderEndDate = e.target.value || null;
    updateFilters();
  });
});

// Global bindings
window.viewOrderDetails = viewOrderDetails;
window.closeOrderModal = closeOrderModal;
