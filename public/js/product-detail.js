/**
 * Product Detail Page Logic
 */

let currentProduct = null;
let selectedQuantity = 1;

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');

  if (!productId) {
    window.location.href = '/index.html';
    return;
  }

  await loadProductDetails(productId);
  setupReviewForm(productId);
});

async function loadProductDetails(id) {
  const container = document.getElementById('product-detail-container');
  if (!container) return;

  try {
    const res = await apiFetch(`/products/${id}`);
    const p = res.product;
    currentProduct = p;

    document.title = `${p.name} - ShopEasy`;

    const isOutOfStock = p.stock <= 0;
    const isLowStock = p.stock > 0 && p.stock < 5;

    let stockBadge = '';
    if (isOutOfStock) {
      stockBadge = '<span class="badge badge-danger">Out of Stock</span>';
    } else if (isLowStock) {
      stockBadge = `<span class="badge badge-warning">Hurry! Only ${p.stock} left in stock</span>`;
    } else {
      stockBadge = `<span class="badge badge-success">In Stock (${p.stock} units available)</span>`;
    }

    container.innerHTML = `
      <div class="product-detail-grid">
        <div class="product-detail-gallery">
          <img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}" onerror="this.src='https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80'" />
        </div>
        <div class="product-detail-info">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
            <span class="product-category" style="font-size:0.9rem;">${escapeHtml(p.category_name || 'General')}</span>
            ${stockBadge}
          </div>
          <h1>${escapeHtml(p.name)}</h1>
          
          <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:1rem;">
            <div style="color:var(--accent); font-weight:700;">★ ${p.avg_rating > 0 ? p.avg_rating : 'New'}</div>
            <span style="color:var(--text-muted); font-size:0.85rem;">(${p.review_count} ratings)</span>
          </div>

          <div class="product-detail-price">${formatPrice(p.price)}</div>

          <p style="color:var(--text-muted); line-height:1.7; margin-bottom:2rem; font-size:1.02rem;">
            ${escapeHtml(p.description || 'No description provided.')}
          </p>

          <div style="display:flex; align-items:center; gap:1.5rem; margin-bottom:2rem;">
            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label">Quantity</label>
              <div class="qty-control">
                <button type="button" class="qty-btn" id="btn-qty-dec" ${isOutOfStock ? 'disabled' : ''}>-</button>
                <input type="text" id="qty-input" class="qty-input" value="1" readonly />
                <button type="button" class="qty-btn" id="btn-qty-inc" ${isOutOfStock ? 'disabled' : ''}>+</button>
              </div>
            </div>

            <div style="flex:1; padding-top:1.6rem;">
              <button 
                type="button" 
                class="btn btn-primary btn-block btn-lg" 
                id="add-to-cart-btn"
                ${isOutOfStock ? 'disabled' : ''}
              >
                ${isOutOfStock ? 'Sold Out' : '🛒 Add to Shopping Cart'}
              </button>
            </div>
          </div>

          <div style="border-top:1px solid var(--border); padding-top:1.25rem; font-size:0.85rem; color:var(--text-muted);">
            <div style="display:flex; gap:1.5rem;">
              <div>🚚 <strong>Free Delivery</strong> on all orders</div>
              <div>💵 <strong>Cash on Delivery</strong> available</div>
              <div>🔒 <strong>100% Genuine</strong> guaranteed</div>
            </div>
          </div>
        </div>
      </div>
    `;

    setupQuantityListeners();
    setupAddToCartButton();
    renderReviews(p.reviews);
  } catch (err) {
    console.error('Product details error:', err);
    container.innerHTML = `
      <div style="text-align:center; padding:3rem;">
        <h2>Product Not Found</h2>
        <p style="color:var(--text-muted); margin:1rem 0;">The requested product could not be found or has been removed.</p>
        <a href="/index.html" class="btn btn-primary">Back to Catalog</a>
      </div>
    `;
  }
}

function setupQuantityListeners() {
  const decBtn = document.getElementById('btn-qty-dec');
  const incBtn = document.getElementById('btn-qty-inc');
  const input = document.getElementById('qty-input');

  if (!decBtn || !incBtn || !input || !currentProduct) return;

  decBtn.addEventListener('click', () => {
    if (selectedQuantity > 1) {
      selectedQuantity--;
      input.value = selectedQuantity;
    }
  });

  incBtn.addEventListener('click', () => {
    if (selectedQuantity < currentProduct.stock) {
      selectedQuantity++;
      input.value = selectedQuantity;
    } else {
      showToast(`Only ${currentProduct.stock} items in stock.`, 'warning');
    }
  });
}

function setupAddToCartButton() {
  const btn = document.getElementById('add-to-cart-btn');
  if (!btn || !currentProduct) return;

  btn.addEventListener('click', async () => {
    if (!isLoggedIn()) {
      showToast('Please log in to add items to your cart.', 'warning');
      setTimeout(() => {
        window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.href)}`;
      }, 1000);
      return;
    }

    btn.disabled = true;
    const oldText = btn.innerHTML;
    btn.innerHTML = 'Adding...';

    try {
      const res = await apiFetch('/cart', {
        method: 'POST',
        body: {
          productId: currentProduct.id,
          quantity: selectedQuantity,
        },
      });

      showToast(res.message || 'Added to cart!', 'success');
      updateCartBadge();
      btn.innerHTML = '✓ Added to Cart';
      setTimeout(() => {
        btn.innerHTML = oldText;
        btn.disabled = false;
      }, 1500);
    } catch (err) {
      showToast(err.message || 'Failed to add item.', 'danger');
      btn.innerHTML = oldText;
      btn.disabled = false;
    }
  });
}

function renderReviews(reviews = []) {
  const reviewsContainer = document.getElementById('reviews-list');
  if (!reviewsContainer) return;

  if (reviews.length === 0) {
    reviewsContainer.innerHTML = `<p style="color:var(--text-muted); padding:1rem 0;">No reviews yet. Be the first to share your thoughts!</p>`;
    return;
  }

  reviewsContainer.innerHTML = reviews.map((r) => `
    <div style="border-bottom:1px solid var(--border); padding:1rem 0;">
      <div style="display:flex; justify-content:space-between; margin-bottom:0.35rem;">
        <strong>${escapeHtml(r.user_name)}</strong>
        <span style="color:var(--accent); font-weight:700;">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
      </div>
      <p style="color:var(--text-muted); font-size:0.92rem; margin-bottom:0.25rem;">${escapeHtml(r.comment || '')}</p>
      <small style="color:var(--text-light); font-size:0.75rem;">${formatDate(r.created_at)}</small>
    </div>
  `).join('');
}

function setupReviewForm(productId) {
  const form = document.getElementById('review-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!isLoggedIn()) {
      showToast('Please log in to submit a review.', 'warning');
      return;
    }

    const rating = document.getElementById('review-rating').value;
    const comment = document.getElementById('review-comment').value.trim();

    try {
      const res = await apiFetch(`/products/${productId}/reviews`, {
        method: 'POST',
        body: { rating, comment },
      });

      showToast(res.message || 'Review submitted!', 'success');
      form.reset();
      await loadProductDetails(productId);
    } catch (err) {
      showToast(err.message || 'Failed to submit review.', 'danger');
    }
  });
}
