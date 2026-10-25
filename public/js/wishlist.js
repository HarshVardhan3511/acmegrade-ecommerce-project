document.addEventListener('DOMContentLoaded', async () => {
  if (!isLoggedIn()) {
    window.location.replace(`/login.html?redirect=${encodeURIComponent('/wishlist.html')}`);
    return;
  }

  updateNavAuth();
  updateCartBadge();
  await loadWishlist();
});

async function loadWishlist() {
  const grid = document.getElementById('wishlist-grid');
  const emptyState = document.getElementById('wishlist-empty');
  if (!grid || !emptyState) return;

  grid.innerHTML = '<p style="color:var(--text-muted);">Loading your wishlist...</p>';
  try {
    const res = await apiFetch('/wishlist');
    const items = res.items || [];
    emptyState.style.display = items.length ? 'none' : 'block';
    if (!items.length) {
      grid.innerHTML = '';
      return;
    }

    grid.innerHTML = items.map((item) => `
      <article class="product-card">
        <div class="product-image-wrap">
          <a href="/product.html?id=${item.product_id}" aria-label="View ${escapeHtml(item.name)}">
            <img src="${escapeHtml(item.image_url || '')}" alt="${escapeHtml(item.name)}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80'" />
          </a>
        </div>
        <div class="product-body">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem; margin-bottom:0.35rem;">
            <span class="product-category">${escapeHtml(item.category_name || 'General')}</span>
            <span class="badge ${item.stock > 0 ? 'badge-success' : 'badge-danger'}">${item.stock > 0 ? 'In Stock' : 'Out of Stock'}</span>
          </div>
          <h2 class="product-title"><a href="/product.html?id=${item.product_id}">${escapeHtml(item.name)}</a></h2>
          <div class="product-meta">
            <span class="product-price">${formatPrice(item.price)}</span>
            <div style="display:flex; gap:0.4rem;">
              <button type="button" class="btn btn-sm btn-primary wishlist-add-btn" data-product-id="${item.product_id}" ${item.stock <= 0 ? 'disabled' : ''}>Add to cart</button>
              <button type="button" class="btn btn-sm btn-outline wishlist-remove-btn" data-product-id="${item.product_id}" aria-label="Remove ${escapeHtml(item.name)} from wishlist">Remove</button>
            </div>
          </div>
        </div>
      </article>
    `).join('');

    grid.querySelectorAll('.wishlist-remove-btn').forEach((button) => {
      button.addEventListener('click', () => updateWishlistItem(button.dataset.productId));
    });
    grid.querySelectorAll('.wishlist-add-btn').forEach((button) => {
      button.addEventListener('click', () => addWishlistProductToCart(button));
    });
  } catch (err) {
    grid.innerHTML = `<p style="color:var(--danger);">Could not load your wishlist: ${escapeHtml(err.message)}</p>`;
  }
}

async function updateWishlistItem(productId) {
  try {
    const result = await apiFetch(`/wishlist/${productId}`, { method: 'POST' });
    showToast(result.message || 'Wishlist updated.', 'success');
    await loadWishlist();
  } catch (err) {
    showToast(err.message || 'Could not update your wishlist.', 'danger');
  }
}

async function addWishlistProductToCart(button) {
  button.disabled = true;
  try {
    const result = await apiFetch('/cart', {
      method: 'POST',
      body: { productId: button.dataset.productId, quantity: 1 },
    });
    showToast(result.message || 'Added to cart.', 'success');
    updateCartBadge();
  } catch (err) {
    showToast(err.message || 'Could not add this product to your cart.', 'danger');
  } finally {
    button.disabled = false;
  }
}
