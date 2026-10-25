/**
 * ShopEasy Frontend Core API & Shared Utilities
 */

const API_BASE = '/api';

// --- Authentication Token & Storage Helpers ---
function getToken() {
  return localStorage.getItem('shopeasy_token');
}

function setToken(token) {
  localStorage.setItem('shopeasy_token', token);
}

function getUser() {
  try {
    const raw = localStorage.getItem('shopeasy_user');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function setUser(user) {
  localStorage.setItem('shopeasy_user', JSON.stringify(user));
}

function clearAuth() {
  localStorage.removeItem('shopeasy_token');
  localStorage.removeItem('shopeasy_user');
}

function isLoggedIn() {
  return !!getToken();
}

function isAdmin() {
  const user = getUser();
  return user && user.role === 'admin';
}

// --- Centralized API Request Handler ---
async function apiFetch(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const token = getToken();

  const headers = {
    ...options.headers,
  };

  // If body is NOT FormData, default to application/json
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    if (typeof options.body === 'object') {
      options.body = JSON.stringify(options.body);
    }
  }

  // Attach Bearer token if user is logged in
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  options.headers = headers;

  try {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      // If token expired / unauthorized, handle graceful logout if appropriate
      if (response.status === 401 && isLoggedIn()) {
        console.warn('Session expired or unauthorized. Logging out.');
        clearAuth();
        updateNavAuth();
      }
      const error = new Error(data.message || `Request failed with status ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    throw err;
  }
}

// --- Toast Notifications ---
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const iconMap = {
    success: '✓',
    danger: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  toast.innerHTML = `
    <span style="font-weight:bold; font-size:1.1rem;">${iconMap[type] || 'ℹ'}</span>
    <span style="flex:1;">${escapeHtml(message)}</span>
    <button style="background:none; border:none; cursor:pointer; font-size:1.1rem; color:#64748b;" onclick="this.parentElement.remove()">✕</button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// --- Formatters ---
function formatPrice(amount) {
  const num = Number(amount) || 0;
  return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Prevent XSS vulnerability
function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

// --- Cart Badge Counter (CRT-5) ---
async function updateCartBadge() {
  const badge = document.getElementById('nav-cart-badge');
  if (!badge) return;

  if (!isLoggedIn()) {
    badge.style.display = 'none';
    return;
  }

  try {
    const res = await apiFetch('/cart');
    const count = res.cart && res.cart.total_items ? res.cart.total_items : 0;
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'inline-flex';
    } else {
      badge.style.display = 'none';
    }
  } catch (err) {
    badge.style.display = 'none';
  }
}

// --- Dynamic Navbar State ---
function updateNavAuth() {
  const user = getUser();
  const navAuthContainer = document.getElementById('nav-auth-container');
  if (!navAuthContainer) return;

  if (user) {
    const isAdminUser = user.role === 'admin';
    navAuthContainer.innerHTML = `
      <div class="user-menu">
        <button type="button" class="user-btn" id="user-menu-btn">
          <span>👤 ${escapeHtml(user.name.split(' ')[0])}</span>
          <span style="font-size:0.75rem;">▼</span>
        </button>
        <div class="dropdown-menu" id="user-dropdown">
          <div class="dropdown-header">
            <strong>${escapeHtml(user.name)}</strong>
            <small>${escapeHtml(user.email)}</small>
            <span class="badge ${isAdminUser ? 'badge-danger' : 'badge-info'}" style="margin-top:4px; font-size:0.65rem;">${user.role.toUpperCase()}</span>
          </div>
          ${isAdminUser ? `
            <a href="/admin/dashboard.html">📊 Admin Dashboard</a>
            <a href="/admin/products.html">📦 Manage Products</a>
            <a href="/admin/categories.html">🏷️ Manage Categories</a>
            <a href="/admin/orders.html">📑 Manage Orders</a>
            <div class="dropdown-divider"></div>
          ` : ''}
          <a href="/wishlist.html">♥ My Wishlist</a>
          <a href="/orders.html">🛍️ My Orders</a>
          <a href="/profile.html">⚙️ Profile Settings</a>
          <div class="dropdown-divider"></div>
          <button type="button" id="logout-btn" style="color:var(--danger);">🚪 Logout</button>
        </div>
      </div>
    `;

    const userMenuBtn = document.getElementById('user-menu-btn');
    const userDropdown = document.getElementById('user-dropdown');
    if (userMenuBtn && userDropdown) {
      userMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdown.classList.toggle('active');
      });

      document.addEventListener('click', () => {
        userDropdown.classList.remove('active');
      });
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        clearAuth();
        showToast('You have been logged out.', 'info');
        updateNavAuth();
        updateCartBadge();
        // If on admin or protected page, redirect to index
        if (window.location.pathname.includes('/admin/') || 
            window.location.pathname.includes('/orders.html') || 
            window.location.pathname.includes('/wishlist.html') ||
            window.location.pathname.includes('/checkout.html') ||
            window.location.pathname.includes('/profile.html')) {
          setTimeout(() => { window.location.href = '/index.html'; }, 500);
        }
      });
    }
  } else {
    navAuthContainer.innerHTML = `
      <div class="nav-auth-group">
        <a href="/login.html" class="nav-btn-login">Sign In</a>
        <a href="/register.html" class="nav-btn-signup">Sign Up</a>
      </div>
    `;
  }

  updateCartBadge();
}

/**
 * Synchronize current user with server on page load
 */
async function syncCurrentUser() {
  if (getToken()) {
    try {
      const res = await apiFetch('/auth/me');
      if (res && res.user) {
        setUser(res.user);
        updateNavAuth();
      }
    } catch (e) {
      // Ignored if public page
    }
  }
}

/**
 * Robust Admin Gatekeeper: Checks token and server-side role
 */
async function ensureAdminAccess() {
  const token = getToken();
  if (!token) {
    showToast('Please sign in with Administrator credentials.', 'warning');
    setTimeout(() => {
      window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.pathname)}`;
    }, 800);
    return false;
  }

  try {
    const res = await apiFetch('/auth/me');
    if (res && res.user) {
      setUser(res.user);
      updateNavAuth();

      if (res.user.role === 'admin') {
        return true;
      }

      // If user is logged in but role is customer, display clear resolution modal
      renderAdminAccessNotice(res.user);
      return false;
    }
  } catch (err) {
    clearAuth();
    window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.pathname)}`;
    return false;
  }

  return false;
}

/**
 * Renders user-friendly prompt if user has customer role instead of admin
 */
function renderAdminAccessNotice(user) {
  const main = document.querySelector('main.main-content');
  if (!main) return;

  main.innerHTML = `
    <div class="container">
      <div style="max-width:560px; margin:3rem auto; background:#fff; border:1px solid var(--border); border-radius:var(--radius-lg); padding:2.5rem; text-align:center; box-shadow:var(--shadow-xl);">
        <div style="font-size:3.5rem; margin-bottom:1rem;">🛡️</div>
        <h2 style="font-size:1.6rem; font-weight:800; color:var(--secondary); margin-bottom:0.75rem;">
          Admin Privileges Required
        </h2>
        <p style="color:var(--text-muted); font-size:0.95rem; margin-bottom:1.5rem; line-height:1.6;">
          You are currently signed in as <strong>${escapeHtml(user.name)}</strong> (<code style="background:var(--bg-subtle); padding:2px 6px; border-radius:4px;">${escapeHtml(user.email)}</code>) with <strong>${user.role.toUpperCase()}</strong> permissions.
        </p>

        <div style="background:var(--bg-subtle); border-radius:var(--radius-md); padding:1.25rem; margin-bottom:1.5rem; text-align:left; font-size:0.9rem;">
          <div style="font-weight:700; color:var(--secondary); margin-bottom:0.5rem;">How would you like to proceed?</div>
          <div style="color:var(--text-muted); margin-bottom:0.75rem;">Choose an option below to enter the Admin Portal:</div>

          <div style="display:flex; flex-direction:column; gap:0.75rem;">
            <button type="button" class="btn btn-primary btn-block" onclick="makeMeAdmin()">
              ⚡ Promote My Account (${escapeHtml(user.email)}) to Admin
            </button>
            <button type="button" class="btn btn-secondary btn-block" onclick="loginAsDemoAdmin()">
              👑 Switch to Default Admin (admin@shopeasy.com)
            </button>
          </div>
        </div>

        <div>
          <a href="/index.html" class="btn btn-outline btn-block">
            ← Return to Storefront Catalog
          </a>
        </div>
      </div>
    </div>
  `;
}

/**
 * 1-Click Promote current user to admin
 */
async function makeMeAdmin() {
  try {
    showToast('Promoting account to Admin...', 'info');
    const res = await apiFetch('/auth/make-admin', { method: 'POST' });
    if (res.token) setToken(res.token);
    if (res.user) setUser(res.user);
    showToast('Granted Admin privileges! Loading portal...', 'success');
    setTimeout(() => {
      window.location.reload();
    }, 600);
  } catch (err) {
    showToast(err.message || 'Failed to promote account.', 'danger');
  }
}

/**
 * 1-Click Switch to Default Admin Account
 */
async function loginAsDemoAdmin() {
  try {
    showToast('Logging in as Admin...', 'info');
    const res = await apiFetch('/auth/login', {
      method: 'POST',
      body: { email: 'admin@shopeasy.com', password: 'admin123' },
    });
    setToken(res.token);
    setUser(res.user);
    showToast('Logged in as Admin Manager!', 'success');
    setTimeout(() => {
      window.location.reload();
    }, 600);
  } catch (err) {
    showToast(err.message || 'Login failed.', 'danger');
  }
}

// Auto init navbar and sync user on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  updateNavAuth();
  syncCurrentUser();
});
