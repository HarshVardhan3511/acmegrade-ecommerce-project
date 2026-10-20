/**
 * Shopping Cart Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (!isLoggedIn()) {
    showToast('Please log in to view your shopping cart.', 'warning');
    setTimeout(() => {
      window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.pathname)}`;
    }, 1000);
    return;
  }

  await loadCart();
});

async function loadCart() {
  const container = document.getElementById('cart-items-container');
  const emptyState = document.getElementById('cart-empty-state');
  const summarySection = document.getElementById('cart-summary-section');

  if (!container) return;

  try {
    const res = await apiFetch('/cart');
    const cart = res.cart;
    const items = cart.items || [];

    updateCartBadge();

    if (items.length === 0) {
      container.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      if (summarySection) summarySection.style.display = 'none';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (summarySection) summarySection.style.display = 'block';

    // Render items table/list
    container.innerHTML = items.map((item) => `
      <div class="cart-item-row" style="display:flex; align-items:center; gap:1.25rem; padding:1.25rem 0; border-bottom:1px solid var(--border);" data-item-id="${item.cart_item_id}">
        <div style="width:72px; height:72px; border-radius:var(--radius-sm); overflow:hidden; background:#f1f5f9; flex-shrink:0;">
          <img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.name)}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80'" />
        </div>
        <div style="flex:1;">
          <h4 style="font-size:1rem; font-weight:700; margin-bottom:0.25rem;">
            <a href="/product.html?id=${item.product_id}" style="color:inherit;">${escapeHtml(item.name)}</a>
          </h4>
          <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.4rem;">
            Unit Price: ${formatPrice(item.price)}
          </div>
          ${item.exceeds_stock ? `<span class="badge badge-danger">Exceeds available stock (${item.stock} left)</span>` : ''}
          ${!item.is_available ? `<span class="badge badge-danger">Product currently unavailable</span>` : ''}
        </div>
        <div style="display:flex; align-items:center; gap:0.5rem;">
          <div class="qty-control">
            <button type="button" class="qty-btn" onclick="updateItemQuantity(${item.cart_item_id}, ${item.quantity - 1})">-</button>
            <input type="text" class="qty-input" value="${item.quantity}" readonly />
            <button type="button" class="qty-btn" onclick="updateItemQuantity(${item.cart_item_id}, ${item.quantity + 1}, ${item.stock})">+</button>
          </div>
        </div>
        <div style="font-weight:800; font-size:1.1rem; min-width:90px; text-align:right;">
          ${formatPrice(item.line_total)}
        </div>
        <div>
          <button type="button" class="btn btn-sm btn-secondary" onclick="removeItemFromCart(${item.cart_item_id})" title="Remove item" style="color:var(--danger); border:none;">
            ✕
          </button>
        </div>
      </div>
    `).join('');

    // Update Summary
    document.getElementById('summary-subtotal').textContent = formatPrice(cart.grand_total);
    document.getElementById('summary-total-items').textContent = cart.total_items;
    document.getElementById('summary-grand-total').textContent = formatPrice(cart.grand_total);

    // Disable checkout if any item exceeds stock
    const hasInvalidItems = items.some((it) => it.exceeds_stock || !it.is_available);
    const checkoutBtn = document.getElementById('btn-checkout');
    if (checkoutBtn) {
      if (hasInvalidItems) {
        checkoutBtn.disabled = true;
        checkoutBtn.textContent = 'Resolve Stock Issues to Checkout';
      } else {
        checkoutBtn.disabled = false;
        checkoutBtn.textContent = 'Proceed to Checkout ➔';
      }
    }
  } catch (err) {
    console.error('Failed to load cart:', err);
    showToast('Failed to load shopping cart.', 'danger');
  }
}

async function updateItemQuantity(itemId, newQty, maxStock) {
  if (maxStock !== undefined && newQty > maxStock) {
    showToast(`Cannot increase. Only ${maxStock} items available in stock.`, 'warning');
    return;
  }

  try {
    await apiFetch(`/cart/${itemId}`, {
      method: 'PUT',
      body: { quantity: newQty },
    });
    await loadCart();
  } catch (err) {
    showToast(err.message || 'Failed to update quantity.', 'danger');
  }
}

async function removeItemFromCart(itemId) {
  try {
    await apiFetch(`/cart/${itemId}`, { method: 'DELETE' });
    showToast('Item removed from cart.', 'info');
    await loadCart();
  } catch (err) {
    showToast(err.message || 'Failed to remove item.', 'danger');
  }
}

async function clearEntireCart() {
  if (!confirm('Are you sure you want to empty your entire cart?')) return;
  try {
    await apiFetch('/cart', { method: 'DELETE' });
    showToast('Cart cleared.', 'info');
    await loadCart();
  } catch (err) {
    showToast('Failed to clear cart.', 'danger');
  }
}
