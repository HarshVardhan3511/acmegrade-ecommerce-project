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
            window.location.pathname.includes('/checkout.html') ||
            window.location.pathname.includes('/profile.html')) {
          setTimeout(() => { window.location.href = '/index.html'; }, 500);
        }
      });
    }
  } else {
    navAuthContainer.innerHTML = `
      <a href="/login.html" class="btn btn-sm btn-secondary">Login</a>
      <a href="/register.html" class="btn btn-sm btn-primary">Sign Up</a>
    `;
  }

  updateCartBadge();
}

// Auto init navbar on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  updateNavAuth();
});
