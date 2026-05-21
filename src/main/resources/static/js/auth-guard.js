(function () {
    const path = window.location.pathname;
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    const publicPages = [
        '/',
        '/index.html',
        '/login.html',
        '/admin-login.html',
        '/signup.html',
        '/forgot-password.html',
        '/view-product.html',
        '/show-search-product.html'
    ];

    const adminPages = [
        '/admin-home.html',
        '/all-products-admin.html',
        '/add-product-admin.html',
        '/edit-product-admin.html',
        '/view-product-admin.html',
        '/view-orders-admin.html',
        '/admin-profile.html',
        '/user-management-admin.html',
        '/add-user-admin.html',
        '/edit-user-admin.html',
        '/reviews-manage-admin.html',
        '/sales-reports-admin.html'
    ];

    const customerPages = [
        '/customer-home.html',
        '/view-cart.html',
        '/my-orders.html',
        '/profile.html',
        '/edit-profile.html',
        '/manage-addresses.html'
    ];

    // Helper to check if current path matches any page in list
    const matches = (list) => list.some(p => {
        if (p === '/') {
            return path === '/' || path.endsWith('/');
        }
        return path === p || path.endsWith(p);
    });

    // 1. Allow CSS/JS/Images always (handled by browser, but just in case)
    if (path.includes('/css/') || path.includes('/js/') || path.includes('/img/')) return;

    // 2. Public Page Logic
    if (matches(publicPages)) {
        // If already logged in, don't show login/signup pages
        if (token && (path.includes('login.html') || path.includes('signup.html'))) {
            window.location.href = (role === 'ADMIN') ? '/admin-home.html' : '/index.html';
        }
        return;
    }

    // 3. Authentication Check
    if (!token) {
        console.warn("Access denied: No token found. Redirecting to login.");
        window.location.href = '/login.html';
        return;
    }

    // 4. Admin-Only Page Protection
    if (matches(adminPages)) {
        if (role !== 'ADMIN') {
            console.error("Access denied: Admin role required.");
            window.location.href = '/index.html';
        }
        return;
    }

    // 5. Customer-Only Page Protection
    if (matches(customerPages)) {
        if (role !== 'USER') {
            console.error("Access denied: Customer role required.");
            window.location.href = '/admin-home.html';
        }
        return;
    }
})();
