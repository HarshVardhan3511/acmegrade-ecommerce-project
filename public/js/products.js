/**
 * Products Catalog Logic (Search, Filter, Sort, Pagination, Add to Cart)
 */

let currentQuery = {
  search: '',
  category: '',
  sort: 'newest',
  page: 1,
  limit: 8,
};

let userWishlistSet = new Set();

document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await loadCategories();
  await loadWishlistIds();
  await fetchAndRenderProducts();
});

function setupEventListeners() {
  // Search input with debounce & Enter key support
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        currentQuery.search = e.target.value.trim();
        currentQuery.page = 1;
        fetchAndRenderProducts();
      }, 400);
    });

    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        clearTimeout(debounceTimer);
        currentQuery.search = e.target.value.trim();
        currentQuery.page = 1;
        fetchAndRenderProducts();
      }
    });
  }

  // Sort dropdown
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentQuery.sort = e.target.value;
      currentQuery.page = 1;
      fetchAndRenderProducts();
    });
  }
}

// Load Categories for filter pills
async function loadCategories() {
  const container = document.getElementById('category-pills');
  if (!container) return;

  try {
    const res = await apiFetch('/categories');
    const categories = res.categories || [];

    let html = `<button type="button" class="pill-btn active" data-cat-id="">All Products</button>`;
    categories.forEach((cat) => {
      html += `
        <button type="button" class="pill-btn" data-cat-id="${cat.id}">
          ${escapeHtml(cat.name)} (${cat.product_count})
        </button>
      `;
    });
    container.innerHTML = html;

    // Attach click handlers
    container.querySelectorAll('.pill-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.pill-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        currentQuery.category = btn.getAttribute('data-cat-id');
        currentQuery.page = 1;
        fetchAndRenderProducts();
      });
    });
  } catch (err) {
    console.error('Failed to load categories:', err);
  }
}

// Load user's wishlist IDs if logged in
async function loadWishlistIds() {
  if (!isLoggedIn()) return;
  try {
    const res = await apiFetch('/wishlist');
    if (res.items) {
      userWishlistSet = new Set(res.items.map((it) => it.product_id));
    }
  } catch (err) {
    // Ignore wishlist failure for guests
  }
}

// Fetch and render products
async function fetchAndRenderProducts() {
  const grid = document.getElementById('products-grid');
  const emptyState = document.getElementById('empty-state');
  const paginationContainer = document.getElementById('pagination-container');
  const resultsCount = document.getElementById('results-count');

  if (!grid) return;

  grid.innerHTML = `
    <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
      <div style="display:inline-block; width:36px; height:36px; border:3px solid #cbd5e1; border-top-color:var(--primary); border-radius:50%; animation: spin 0.8s linear infinite;"></div>
      <p style="margin-top:1rem; color:var(--text-muted);">Loading products...</p>
    </div>
  `;

  try {
    const params = new URLSearchParams();
    if (currentQuery.search) params.append('search', currentQuery.search);
    if (currentQuery.category) params.append('category', currentQuery.category);
    if (currentQuery.sort) params.append('sort', currentQuery.sort);
    params.append('page', currentQuery.page);
    params.append('limit', currentQuery.limit);

    const data = await apiFetch(`/products?${params.toString()}`);
    const products = data.products || [];
    const pagination = data.pagination || {};

    if (resultsCount) {
      resultsCount.textContent = `Showing ${products.length} of ${pagination.total} products`;
    }

    if (products.length === 0) {
      grid.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      if (paginationContainer) paginationContainer.innerHTML = '';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    grid.innerHTML = products.map((product) => renderProductCard(product)).join('');

    // Attach card event listeners (Add to cart & Wishlist)
    attachCardListeners();

    // Render pagination
    renderPagination(pagination);
  } catch (err) {
    console.error('Fetch products error:', err);
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--danger);">
        <p>Failed to load products: ${escapeHtml(err.message)}</p>
        <button class="btn btn-secondary btn-sm" onclick="fetchAndRenderProducts()" style="margin-top:0.75rem;">Retry</button>
      </div>
    `;
  }
}

function renderProductCard(p) {
  const isOutOfStock = p.stock <= 0;
  const isLowStock = p.stock > 0 && p.stock < 5;
  const isWishlisted = userWishlistSet.has(p.id);

  let stockBadge = '';
  if (isOutOfStock) {
    stockBadge = `<span class="badge badge-danger">Out of Stock</span>`;
  } else if (isLowStock) {
    stockBadge = `<span class="badge badge-warning">Only ${p.stock} left!</span>`;
  } else {
    stockBadge = `<span class="badge badge-success">In Stock</span>`;
  }

  return `
    <div class="product-card" data-id="${p.id}">
      <div class="product-image-wrap">
        <a href="/product.html?id=${p.id}">
          <img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80'" />
        </a>
        <button type="button" class="wishlist-toggle-btn ${isWishlisted ? 'active' : ''}" data-product-id="${p.id}" title="Save to wishlist">
          ♥
        </button>
      </div>
      <div class="product-body">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.35rem;">
          <span class="product-category">${escapeHtml(p.category_name || 'General')}</span>
          ${stockBadge}
        </div>
        <h3 class="product-title">
          <a href="/product.html?id=${p.id}">${escapeHtml(p.name)}</a>
        </h3>
        <p class="product-desc">${escapeHtml(p.description || '')}</p>
        <div class="product-meta">
          <span class="product-price">${formatPrice(p.price)}</span>
          <button 
            type="button" 
            class="btn btn-sm ${isOutOfStock ? 'btn-secondary' : 'btn-primary'} quick-add-btn" 
            data-product-id="${p.id}"
            ${isOutOfStock ? 'disabled title="Out of stock"' : ''}
          >
            ${isOutOfStock ? 'Sold Out' : '🛒 Add'}
          </button>
        </div>
      </div>
    </div>
  `;
}

function attachCardListeners() {
  // Add to cart buttons
  document.querySelectorAll('.quick-add-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const productId = btn.getAttribute('data-product-id');

      if (!isLoggedIn()) {
        showToast('Please log in to add items to your cart.', 'warning');
        setTimeout(() => {
          window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.pathname)}`;
        }, 1200);
        return;
      }

      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '...';

      try {
        const res = await apiFetch('/cart', {
          method: 'POST',
          body: { productId, quantity: 1 },
        });

        showToast(res.message || 'Item added to cart!', 'success');
        updateCartBadge();
        btn.innerHTML = '✓ Added';
        setTimeout(() => {
          btn.innerHTML = originalText;
          btn.disabled = false;
        }, 1500);
      } catch (err) {
        showToast(err.message || 'Could not add to cart.', 'danger');
        btn.innerHTML = originalText;
        btn.disabled = false;
      }
    });
  });

  // Wishlist toggle buttons
  document.querySelectorAll('.wishlist-toggle-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const productId = btn.getAttribute('data-product-id');

      if (!isLoggedIn()) {
        showToast('Please log in to manage your wishlist.', 'warning');
        return;
      }

      try {
        const res = await apiFetch(`/wishlist/${productId}`, { method: 'POST' });
        if (res.is_wishlisted) {
          btn.classList.add('active');
          userWishlistSet.add(Number(productId));
        } else {
          btn.classList.remove('active');
          userWishlistSet.delete(Number(productId));
        }
        showToast(res.message, 'info');
      } catch (err) {
        showToast(err.message || 'Failed to update wishlist.', 'danger');
      }
    });
  });
}

function renderPagination(pagination) {
  const container = document.getElementById('pagination-container');
  if (!container) return;

  const { totalPages, page, hasNext, hasPrev } = pagination;
  if (!totalPages || totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = '';

  // Prev button
  html += `
    <button class="page-btn" ${!hasPrev ? 'disabled' : ''} onclick="goToPage(${page - 1})">
      ◀
    </button>
  `;

  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    html += `
      <button class="page-btn ${i === page ? 'active' : ''}" onclick="goToPage(${i})">
        ${i}
      </button>
    `;
  }

  // Next button
  html += `
    <button class="page-btn" ${!hasNext ? 'disabled' : ''} onclick="goToPage(${page + 1})">
      ▶
    </button>
  `;

  container.innerHTML = html;
}

function goToPage(page) {
  currentQuery.page = page;
  fetchAndRenderProducts();
  window.scrollTo({ top: 350, behavior: 'smooth' });
}
