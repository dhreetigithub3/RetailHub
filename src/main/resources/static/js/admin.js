// Admin Dashboard Logic

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

async function loadDashboardStats() {
  const token = getToken();
  try {
    const response = await fetch("/admin/dashboard/stats", {
      headers: { "Authorization": "Bearer " + token }
    });

    if (response.ok) {
      const stats = await response.json();

      document.getElementById("statTotalProducts").innerText = stats.totalProducts || 0;
      document.getElementById("statTotalUsers").innerText = stats.totalUsers || 0;
      document.getElementById("statTotalDeliveredOrders").innerText = stats.deliveredOrders || 0;

      const rev = stats.totalRevenue || 0;
      document.getElementById("statTotalRevenue").innerText = rev >= 1000
        ? `₹${(rev / 1000).toFixed(1)}K`
        : `₹${rev}`;
    }
  } catch (err) {
    console.error("Failed to load dashboard stats", err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (ensureAdmin()) {
    loadDashboardStats();
  }
});