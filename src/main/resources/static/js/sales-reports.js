let allOrders = [];
let allProducts = [];
let filteredOrders = [];
let revenueChartInstance = null;
let categoryChartInstance = null;

const SUCCESS_STATUSES = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"];

async function initReports() {
    try {
        const token = localStorage.getItem("token");
        if (!token) return;

        // Fetch Orders and Products concurrently
        const [ordersRes, productsRes] = await Promise.all([
            fetch("/admin/orders", { headers: { "Authorization": "Bearer " + token } }),
            fetch("/products")
        ]);

        if (ordersRes.ok && productsRes.ok) {
            allOrders = await ordersRes.json();
            allProducts = await productsRes.json();
            
            // Map categories for easier access
            const productCategories = {};
            allProducts.forEach(p => productCategories[p.id] = p.category);
            
            // Enrich order items with category
            allOrders.forEach(order => {
                order.items.forEach(item => {
                    item.category = productCategories[item.productId] || 'Uncategorized';
                });
            });

            applyFilters();
        }
    } catch (err) {
        console.error("Failed to load report data", err);
    }
}

function applyFilters() {
    const days = document.getElementById("dateFilter").value;
    const search = document.getElementById("reportSearch").value.toLowerCase();
    const now = new Date();

    filteredOrders = allOrders.filter(order => {
        // Date Filter
        if (days !== 'all') {
            const orderDate = new Date(order.orderDate);
            const diffTime = Math.abs(now - orderDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays > parseInt(days)) return false;
        }

        // Search Filter (Order ID or Customer Name)
        if (search) {
            const matchId = String(order.orderId).includes(search);
            const matchName = order.customerName.toLowerCase().includes(search);
            const matchProduct = order.items.some(i => i.productName.toLowerCase().includes(search));
            if (!matchId && !matchName && !matchProduct) return false;
        }

        return true;
    });

    renderDashboard();
}

function renderDashboard() {
    const successfulOrders = filteredOrders.filter(o => SUCCESS_STATUSES.includes(o.status));

    // 1. Summary Cards
    let totalRevenue = 0;
    let productsSold = 0;
    successfulOrders.forEach(o => {
        totalRevenue += o.totalAmount;
        o.items.forEach(i => productsSold += i.quantity);
    });
    
    const totalOrders = successfulOrders.length;
    const avgOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : 0;

    document.getElementById("totalRevenue").innerText = `₹${totalRevenue.toFixed(2)}`;
    document.getElementById("totalOrders").innerText = totalOrders;
    document.getElementById("avgOrderValue").innerText = `₹${avgOrderValue}`;
    document.getElementById("productsSold").innerText = productsSold;

    // 2. Data Aggregation
    const dailyMap = {};
    const categoryMap = {};
    const productMap = {};

    successfulOrders.forEach(order => {
        const dateStr = new Date(order.orderDate).toLocaleDateString('en-CA'); // YYYY-MM-DD
        dailyMap[dateStr] = (dailyMap[dateStr] || 0) + order.totalAmount;

        order.items.forEach(item => {
            // Category
            const cat = item.category;
            categoryMap[cat] = (categoryMap[cat] || 0) + item.subtotal;

            // Product
            if (!productMap[item.productId]) {
                productMap[item.productId] = { name: item.productName, qty: 0, revenue: 0 };
            }
            productMap[item.productId].qty += item.quantity;
            productMap[item.productId].revenue += item.subtotal;
        });
    });

    // 3. Render Revenue Chart
    const sortedDates = Object.keys(dailyMap).sort();
    const revenueData = sortedDates.map(d => dailyMap[d]);
    
    if (revenueChartInstance) revenueChartInstance.destroy();
    const ctxRev = document.getElementById('revenueChart').getContext('2d');
    revenueChartInstance = new Chart(ctxRev, {
        type: 'line',
        data: {
            labels: sortedDates,
            datasets: [{
                label: 'Revenue (₹)',
                data: revenueData,
                borderColor: '#4f46e5',
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // 4. Render Category Chart
    const categories = Object.keys(categoryMap);
    const categoryData = categories.map(c => categoryMap[c]);
    
    if (categoryChartInstance) categoryChartInstance.destroy();
    const ctxCat = document.getElementById('categoryChart').getContext('2d');
    categoryChartInstance = new Chart(ctxCat, {
        type: 'doughnut',
        data: {
            labels: categories,
            datasets: [{
                data: categoryData,
                backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // 5. Render Top Products Table
    const topProducts = Object.values(productMap)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
    
    document.getElementById("topProductsBody").innerHTML = topProducts.map(p => `
        <tr>
            <td style="font-weight: 500;">${p.name}</td>
            <td>${p.qty}</td>
            <td style="font-weight: 600; color: var(--primary);">₹${p.revenue.toFixed(2)}</td>
        </tr>
    `).join('') || `<tr><td colspan="3" style="text-align:center;">No data available</td></tr>`;

    // 6. Render Recent Orders Table
    const recentOrders = [...filteredOrders]
        .sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate))
        .slice(0, 5);

    document.getElementById("recentOrdersBody").innerHTML = recentOrders.map(o => `
        <tr>
            <td style="font-weight: 500;">#${o.orderId}</td>
            <td>${new Date(o.orderDate).toLocaleDateString()}</td>
            <td><span class="status-badge status-${o.status.toLowerCase()}">${o.status}</span></td>
            <td style="font-weight: 600;">₹${o.totalAmount.toFixed(2)}</td>
        </tr>
    `).join('') || `<tr><td colspan="4" style="text-align:center;">No orders found</td></tr>`;
}

const date = new Date().toISOString().split('T')[0];
// Export Functions
function exportToPDF() {
    const element = document.getElementById('reportContent');
    const opt = {
        margin:       0.5,
        filename:     `sales_report_${date}.pdf`,
        image:        { type: 'jpeg', quality: 1 },
        html2canvas:  { scale: 3, useScroll: true, scrollY: 0 },
        jsPDF:        { unit: 'in', format: 'a4', orientation: 'landscape' },
        pageBreak:    { mode: ['avoid-all', 'css', 'legacy'] }
    };
    html2pdf().set(opt).from(element).save();
}

function exportToExcel() {
    // Create a new workbook
    const wb = XLSX.utils.book_new();
    
    // Add Orders Sheet
    const wsOrders = XLSX.utils.json_to_sheet(filteredOrders.map(o => ({
        'Order ID': o.orderId,
        'Date': new Date(o.orderDate).toLocaleDateString(),
        'Customer': o.customerName,
        'Status': o.status,
        'Payment Method': o.paymentMethod,
        'Amount': o.totalAmount
    })));
    XLSX.utils.book_append_sheet(wb, wsOrders, "Orders");
    
    // Extract Items for a second sheet
    const itemsData = [];
    filteredOrders.forEach(o => {
        o.items.forEach(i => {
            itemsData.push({
                'Order ID': o.orderId,
                'Date': new Date(o.orderDate).toLocaleDateString(),
                'Product': i.productName,
                'Category': i.category,
                'Quantity': i.quantity,
                'Price': i.priceAtPurchase,
                'Subtotal': i.subtotal
            });
        });
    });
    
    const wsItems = XLSX.utils.json_to_sheet(itemsData);
    XLSX.utils.book_append_sheet(wb, wsItems, "Order Items");
    
    // Download
    XLSX.writeFile(wb, `sales_report_${date}.xlsx`);
}

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
    initReports();
    
    document.getElementById("dateFilter").addEventListener("change", applyFilters);
    document.getElementById("reportSearch").addEventListener("input", () => {
        // debounce search
        clearTimeout(window.searchTimeout);
        window.searchTimeout = setTimeout(applyFilters, 300);
    });
});
