(function () {
  /* Global Loader Module: injects a reusable loading overlay, intercepts
     fetch / XHR requests and navigation clicks, implements flicker
     prevention (delay before showing + minimum visible time), smooth
     fade animations, and disables multiple clicks while active. */
  const Loader = (function () {
    const DEFAULTS = { delay: 350, minVisible: 400, settleDelay: 150 };
    let options = Object.assign({}, DEFAULTS);
    let activeCount = 0;
    let showTimer = null;
    let hideTimer = null;
    let watchdogTimer = null;
    let shownAt = 0;
    let visible = false;
    let navigationInProgress = false;
    const MAX_OPERATION_TIMEOUT = 10000; // 10 second global timeout per operation

    function ensureDOM() {
      if (document.getElementById('globalLoader')) return;

      try {
        const href = '/css/loader.css';
        if (!Array.from(document.styleSheets).some(s => s.href && s.href.endsWith('loader.css'))) {
          const l = document.createElement('link');
          l.rel = 'stylesheet';
          l.href = href;
          document.head.appendChild(l);
        }
      } catch (e) {
        console.warn('Failed to inject loader stylesheet:', e);
      }

      if (!document.getElementById('globalLoaderCriticalStyles')) {
        const criticalStyles = document.createElement('style');
        criticalStyles.id = 'globalLoaderCriticalStyles';
        criticalStyles.textContent = [
          '.global-loader{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;opacity:0;visibility:hidden;z-index:999999;pointer-events:none}',
          '.global-loader[aria-hidden="false"]{opacity:1;visibility:visible;pointer-events:auto}',
          '.global-loader-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.35)}',
          '.global-loader-center{position:relative;display:flex;flex-direction:column;align-items:center;gap:12px;color:#fff}'
        ].join('');
        document.head.appendChild(criticalStyles);
      }

      const overlay = document.createElement('div');
      overlay.id = 'globalLoader';
      overlay.className = 'global-loader';
      overlay.setAttribute('aria-hidden', 'true');
      overlay.style.cssText = 'position:fixed;inset:0;opacity:0;visibility:hidden;pointer-events:none;';
      overlay.innerHTML = `
        <div class="global-loader-backdrop"></div>
        <div class="global-loader-center" role="status" aria-live="polite">
          <div class="spinner" aria-hidden="true"><div></div><div></div><div></div><div></div></div>
          <div class="loader-text">Loading...</div>
        </div>
      `;
      document.body.appendChild(overlay);
    }

    function showImmediate() {
      ensureDOM();
      const el = document.getElementById('globalLoader');
      if (!el) return;
      el.style.opacity = '';
      el.style.visibility = '';
      el.setAttribute('aria-hidden', 'false');
      el.style.pointerEvents = 'auto';
      document.documentElement.classList.add('global-loading');
      document.body.style.overflow = 'hidden';
      visible = true;
      shownAt = Date.now();
    }

    function hideImmediate() {
      const el = document.getElementById('globalLoader');
      if (el) {
        el.setAttribute('aria-hidden', 'true');
        el.style.pointerEvents = 'none';
      }
      document.documentElement.classList.remove('global-loading');
      document.body.style.overflow = '';
      visible = false;
      shownAt = 0;
    }

    function tryShow() {
      if (visible) return;
      clearTimeout(showTimer);
      showTimer = null;
      showImmediate();
    }

    function tryHide() {
      if (!visible) return;
      const elapsed = Date.now() - shownAt;
      const remaining = Math.max(0, options.minVisible - elapsed);
      
      clearTimeout(hideTimer);
      
      if (remaining > 0) {
        hideTimer = setTimeout(() => {
          hideImmediate();
          hideTimer = null;
          if (watchdogTimer) {
            clearTimeout(watchdogTimer);
            watchdogTimer = null;
          }
        }, remaining);
      } else {
        hideImmediate();
        if (watchdogTimer) {
          clearTimeout(watchdogTimer);
          watchdogTimer = null;
        }
      }
    }

    function startOperation(opts) {
      const operationOptions = Object.assign({}, options, opts || {});
      activeCount += 1;
      
      // Reset watchdog on each new operation
      if (watchdogTimer) clearTimeout(watchdogTimer);
      watchdogTimer = setTimeout(() => {
        console.warn('Loader: operation timeout exceeded, forcing hide');
        forceHide();
      }, MAX_OPERATION_TIMEOUT);

      // Cancel any pending hide and schedule show with flicker prevention
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
      
      if (showTimer) clearTimeout(showTimer);
      showTimer = setTimeout(() => {
        if (activeCount > 0) tryShow();
      }, operationOptions.delay);
    }

    function endOperation() {

      activeCount = Math.max(0, activeCount - 1);

      // Still active requests running
      if (activeCount > 0) return;

      // Prevent instant hide/show flicker
      clearTimeout(hideTimer);

      hideTimer = setTimeout(() => {

        // Another request started meanwhile
        if (activeCount > 0) return;

        // Cancel pending show
        if (showTimer) {
          clearTimeout(showTimer);
          showTimer = null;
        }

        tryHide();

      }, options.settleDelay);

  }

    function forceHide() {
      // Hard reset: clear all timers and state
      activeCount = 0;
      navigationInProgress = false;
      
      if (showTimer) {
        clearTimeout(showTimer);
        showTimer = null;
      }
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
      if (watchdogTimer) {
        clearTimeout(watchdogTimer);
        watchdogTimer = null;
      }
      
      try {
        hideImmediate();
      } catch (e) {
        console.error('Loader: forceHide error:', e);
      }
    }

    function trackPromise(p) {

      if (!(p && typeof p.then === 'function')) {
        return p;
      }

      let loaderStarted = false;

      const delayedStart = setTimeout(() => {

        loaderStarted = true;

        startOperation({ delay: 100 });

      }, 200);

      const cleanup = () => {

        clearTimeout(delayedStart);

        if (loaderStarted) {
          endOperation();
        }

      };

      return p.then(
        (result) => {
          cleanup();
          return result;
        },
        (error) => {
          cleanup();
          throw error;
        }
      );
    }

    function installInterceptors() {
      if (window.__globalLoaderInstalled) return;
      window.__globalLoaderInstalled = true;

      // Intercept fetch
      if (window.fetch) {
        const origFetch = window.fetch.bind(window);
        window.fetch = function () {
          try {
            const promise = origFetch.apply(null, arguments);
            return trackPromise(promise);
          } catch (e) {
            console.warn('Loader: fetch interception error:', e);
            return origFetch.apply(null, arguments);
          }
        };
      }

      // Intercept XMLHttpRequest
      try {
        const XHR = window.XMLHttpRequest;
        if (XHR && XHR.prototype && !XHR.prototype.__loaderPatched) {
          const origSend = XHR.prototype.send;
          XHR.prototype.send = function () {
            try {
              startOperation();
            } catch (e) {
              console.warn('Loader: XHR startOperation error:', e);
            }
            
            const onFinish = () => {
              try {
                endOperation();
              } catch (e) {
                console.warn('Loader: XHR endOperation error:', e);
              }
            };
            
            this.addEventListener('loadend', onFinish, { once: true });
            this.addEventListener('error', onFinish, { once: true });
            this.addEventListener('abort', onFinish, { once: true });
            
            return origSend.apply(this, arguments);
          };
          XHR.prototype.__loaderPatched = true;
        }
      } catch (e) {
        console.warn('Loader: XMLHttpRequest patching error:', e);
      }
    }

    function installNavigationHooks() {
      document.addEventListener('click', function (ev) {
        if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;

        const a = ev.target.closest('a');
        if (!a) return;
        
        // Skip external links, new tabs, downloads, mailto links
        if (a.target === '_blank' || a.hasAttribute('download')) return;
        const href = a.getAttribute('href');
        if (!href || href.startsWith('mailto:') || href.startsWith('#') || href.startsWith('javascript:')) return;
        
      //   // Same-origin check
      //   const isSameOrigin = href.startsWith('/') || href.indexOf(window.location.origin) === 0;
      //   if (isSameOrigin) {
      //     navigationInProgress = true;
      //     startOperation();
      //   }
      // }, { capture: true });

        let url;
        try {
          url = new URL(href, window.location.href);
        } catch (e) {
          return;
        }

        const currentUrl = new URL(window.location.href);
        const isSameOrigin = url.origin === currentUrl.origin;
        const isSamePage = url.pathname === currentUrl.pathname && url.search === currentUrl.search;
        const isPageNavigation =
          isSameOrigin &&
          !isSamePage &&
          (url.pathname.endsWith('.html') || url.pathname === '/' || href.startsWith('/'));

        if (isPageNavigation) {

          // Prevent duplicate triggers
          if (visible) return;

          navigationInProgress = true;
          startOperation({ delay: 75 });
        }
      // document.addEventListener('submit', function (ev) {
      //   navigationInProgress = true;
      //   startOperation();
      }, { capture: true });
    }

    function installClickGuard() {
      document.addEventListener('click', function (ev) {
        const overlay = document.getElementById('globalLoader');
        const overlayVisible = overlay && overlay.getAttribute('aria-hidden') === 'false';
        
        if (overlayVisible) {
          // Allow interactions within the loader element itself
          if (ev.target.closest && ev.target.closest('#globalLoader')) return;
          
          // Block all other interactions
          ev.stopPropagation();
          ev.preventDefault();
        }
      }, true);
    }

    function configure(opts) {
      options = Object.assign({}, options, opts || {});
    }

    function init(opts) {
      configure(opts);
      
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ensureDOM);
      } else {
        ensureDOM();
      }
      
      installInterceptors();
      installNavigationHooks();
      installClickGuard();
      
      // Hide loader on page load completion
      document.addEventListener('DOMContentLoaded', function () {
        setTimeout(() => {
          navigationInProgress = false;
          if (activeCount === 0) {
            tryHide();
          }
        }, 50);
      });
      
      // Cleanup on page unload
      window.addEventListener('beforeunload', () => {
        navigationInProgress = false;
      });
    }

    return { init, trackPromise, startOperation, endOperation, configure, forceHide };
  })();
  const NAV_PROFILE_CLASS = 'nav-profile';
  const NAV_LOGOUT_ID = 'navLogoutBtn';
  const NAV_DROPDOWN_ID = 'navProfileDropdown';

  function isLoggedIn() {
    return localStorage.getItem('isLoggedIn') === 'true' || !!localStorage.getItem('token');
  }

  function getUsername() {
    return localStorage.getItem('username') || localStorage.getItem('name') || 'User';
  }

  function getRole() {
    return localStorage.getItem('role') || 'USER';
  }

  function logout(e) {
    if (e && e.preventDefault) e.preventDefault();
    localStorage.clear();
    window.location.href = '/login.html';
  }

  function closeDropdown() {
    const dd = document.getElementById(NAV_DROPDOWN_ID);
    if (dd) dd.remove();
    const profile = document.querySelector('.' + NAV_PROFILE_CLASS);
    if (profile) profile.setAttribute('aria-expanded', 'false');
  }

  function buildProfileDropdown() {
    const dropdown = document.createElement('div');
    dropdown.id = NAV_DROPDOWN_ID;
    dropdown.className = 'nav-profile-dropdown';

    const list = document.createElement('ul');
    list.className = 'nav-profile-list';

    const role = getRole();

    // Links based on role
    const links = [];
    if (role === 'ADMIN') {
      links.push({ text: 'Admin Profile', href: '/admin-profile.html' });
      links.push({ text: 'Admin Dashboard', href: '/admin-home.html' });
      links.push({ text: 'User Management', href: '/user-management-admin.html' });
      links.push({ text: 'Product Management', href: '/all-products-admin.html' });
      links.push({ text: 'Order Management', href: '/view-orders-admin.html' });
    } else {
      links.push({ text: 'My Profile', href: '/profile.html' });
      // links.push({ text: 'Dashboard', href: '/customer-home.html' });
      links.push({ text: 'My Orders', href: '/my-orders.html' });
      // links.push({ text: 'View Cart', href: '/view-cart.html' });
    }

    links.forEach(link => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = link.href;
      a.innerText = link.text;
      li.appendChild(a);
      list.appendChild(li);
    });

    // Logout button
    const liLogout = document.createElement('li');
    const btnLogout = document.createElement('button');
    btnLogout.innerText = 'Logout';
    btnLogout.onclick = logout;
    liLogout.appendChild(btnLogout);
    list.appendChild(liLogout);

    dropdown.appendChild(list);
    return dropdown;
  }

  function renderNav() {
    const nav = document.querySelector('.nav');
    const headerContainer = document.querySelector('.header-container');
    if (!nav || !headerContainer) return;

    // Inject search bar if not present (for global accessibility)
    // ADMINs use specialized management filters, so we skip this for them
    if (getRole() !== 'ADMIN' && !document.getElementById('productSearch')) {
      const searchContainer = document.createElement('div');
      searchContainer.className = 'search-container';
      searchContainer.innerHTML = `
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input type="text" id="productSearch" placeholder="Search for products, brands and more..." aria-label="Search products" autocomplete="off" />
        </div>
        <div id="searchSuggestions" class="search-suggestions"></div>
      `;
      // Insert after brand
      const brand = headerContainer.querySelector('.brand');
      if (brand) {
        brand.after(searchContainer);
      } else {
        headerContainer.prepend(searchContainer);
      }

      const searchInput = document.getElementById('productSearch');
      const suggestionsBox = document.getElementById('searchSuggestions');

      searchInput.addEventListener('input', async (e) => {
        const query = e.target.value.trim();
        if (query.length < 2) {
          suggestionsBox.classList.remove('active');
          return;
        }

        try {
          // Fetch results directly from the database via search endpoint
          const res = await fetch(`/products/search?q=${encodeURIComponent(query)}`);
          if (!res.ok) throw new Error('Search failed');
          
          const matches = await res.json();

          if (matches.length > 0) {
            // Extract small keyword-based suggestions instead of full names
            const keywords = new Set();
            const qLower = query.toLowerCase();

            matches.forEach(p => {
              // Category suggestion
              if (p.category && p.category.toLowerCase().includes(qLower)) {
                 keywords.add(p.category.toLowerCase());
              }
              // Brand + Category suggestion
              if (p.brand && p.category) {
                 const brandCat = `${p.brand} ${p.category}`.toLowerCase();
                 if (brandCat.includes(qLower)) keywords.add(brandCat);
              }
              // Short name phrase suggestion (up to 3 words)
              if (p.name) {
                 const words = p.name.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').filter(Boolean);
                 if (words.length > 0) {
                     let phrase = words[0];
                     if (phrase.includes(qLower) || qLower.includes(phrase)) keywords.add(phrase);
                     
                     if (words.length > 1) {
                         phrase += ' ' + words[1];
                         if (phrase.includes(qLower) || qLower.includes(phrase)) keywords.add(phrase);
                     }
                     if (words.length > 2) {
                         phrase += ' ' + words[2];
                         if (phrase.includes(qLower) || qLower.includes(phrase)) keywords.add(phrase);
                     }
                 }
              }
            });

            // Filter to ensure query is included, sort by length (shorter first like generic keywords), take top 6
            let finalKeywords = Array.from(keywords)
                .filter(kw => kw.includes(qLower))
                .sort((a, b) => a.length - b.length)
                .slice(0, 6);
                
            if (finalKeywords.length === 0) finalKeywords.push(qLower);

            suggestionsBox.innerHTML = finalKeywords.map(kw => `
              <a href="/show-search-product.html?q=${encodeURIComponent(kw)}" class="suggestion-item" style="padding: 10px 15px; display: flex; align-items: center; text-decoration: none; color: var(--text);">
                <span style="margin-right: 12px; color: var(--text-muted); font-size: 1.1rem;">🔍</span>
                <span class="suggestion-name" style="font-weight: 500;">${kw}</span>
              </a>
            `).join('');
            suggestionsBox.classList.add('active');
          } else {
            suggestionsBox.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--text-muted); font-size: 0.875rem;">No matches found</div>';
            suggestionsBox.classList.add('active');
          }
        } catch (err) {
          console.error('Database search failed', err);
          suggestionsBox.classList.remove('active');
        }
      });

      // Close suggestions when clicking outside
      document.addEventListener('click', (e) => {
        if (!searchContainer.contains(e.target)) {
          suggestionsBox.classList.remove('active');
        }
      });

      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const query = searchInput.value.trim();
          if (query) {
            window.location.href = `/show-search-product.html?q=${encodeURIComponent(query)}`;
          }
        }
      });
    }

    nav.innerHTML = ''; // Clear current nav

    if (isLoggedIn()) {
      const role = getRole();

      // Home link
      const homeLink = document.createElement('a');
      homeLink.href = role === 'ADMIN' ? '/admin-home.html' : '/';
      homeLink.innerText = 'Home';
      if (window.location.pathname === homeLink.getAttribute('href') || (role === 'USER' && window.location.pathname === '/')) {
        homeLink.className = 'active';
      }
      nav.appendChild(homeLink);

      if (role === 'ADMIN') {
        // Add Admin Badge to Brand
        const brand = headerContainer.querySelector('.brand');
        if (brand && !brand.querySelector('.admin-badge')) {
          const badge = document.createElement('span');
          badge.className = 'admin-badge';
          badge.style.cssText = 'background: var(--primary); color: white; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; margin-left: 8px; vertical-align: middle; text-transform: uppercase; letter-spacing: 0.5px;';
          badge.innerText = 'Admin Portal';
          brand.appendChild(badge);
        }
      }

      // Cart link for users
      if (role === 'USER') {
        const cartLink = document.createElement('a');
        cartLink.href = '/view-cart.html';
        cartLink.id = 'cartBadgeLink';
        cartLink.innerHTML = `<span class="cart-icon" aria-hidden="true">🛒</span><span class="cart-label">Cart</span><span id="cartBadge" class="badge" style="display: none;">0</span>`;
        nav.appendChild(cartLink);
      }

      // Profile dropdown trigger
      const profile = document.createElement('a');
      profile.className = NAV_PROFILE_CLASS;
      profile.href = '#';
      profile.setAttribute('aria-haspopup', 'true');
      profile.setAttribute('aria-expanded', 'false');
      profile.innerHTML = `<span class="nav-profile-inner">👤 ${getUsername()}</span>`;
      profile.style.marginLeft = 'auto';

      profile.addEventListener('click', function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        const expanded = profile.getAttribute('aria-expanded') === 'true';
        closeDropdown();
        if (!expanded) {
          profile.setAttribute('aria-expanded', 'true');
          const dd = buildProfileDropdown();
          nav.appendChild(dd);
        }
      });

      nav.appendChild(profile);
    } else {
      // Not logged in
      const homeLink = document.createElement('a');
      homeLink.href = '/';
      homeLink.innerText = 'Home';
      nav.appendChild(homeLink);

      const loginLink = document.createElement('a');
      loginLink.href = '/login.html';
      loginLink.innerText = 'Login';
      nav.appendChild(loginLink);

      const signupLink = document.createElement('a');
      signupLink.href = '/signup.html';
      signupLink.className = 'btn-nav';
      signupLink.innerText = 'Sign Up';
      nav.appendChild(signupLink);
    }
  }

  window.addEventListener('storage', renderNav);
  window.updateNavbar = renderNav;
  window.logout = logout;

  // Expose the loader globally and initialize with defaults so other scripts can use it
  try {
    window.Loader = Loader;
    if (window.Loader && typeof window.Loader.init === 'function') {
      window.Loader.init();
    }
  } catch (e) {
    console.error('Failed to initialize global Loader', e);
  }

  document.addEventListener('click', function (e) {
    const dd = document.getElementById(NAV_DROPDOWN_ID);
    if (dd && !dd.contains(e.target) && !e.target.closest('.' + NAV_PROFILE_CLASS)) {
      closeDropdown();
    }
  });

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.target.closest('a, button, input, select, textarea')) return;
    const card = e.target.closest('.product-card');
    if (!card) return;
    const href = card.getAttribute('href') || card.querySelector('a[href*="/view-product.html"]')?.getAttribute('href');
    if (href) window.location.href = href;
  });

  document.addEventListener('DOMContentLoaded', renderNav);
})();
