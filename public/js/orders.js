/**
 * Customer Order History Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (!isLoggedIn()) {
    showToast('Please log in to view your orders.', 'warning');
    setTimeout(() => {
      window.location.href = `/login.html?redirect=/orders.html`;
    }, 1000);
    return;
  }

  await loadOrders();
});

async function loadOrders() {
  const container = document.getElementById('orders-list');
  const emptyState = document.getElementById('orders-empty-state');

  if (!container) return;

  try {
    const res = await apiFetch('/orders');
    const orders = res.orders || [];

    if (orders.length === 0) {
      container.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    container.innerHTML = orders.map((order) => {
      const isPlaced = order.status === 'Placed';
      let badgeClass = 'badge-info';
      if (order.status === 'Delivered') badgeClass = 'badge-success';
      if (order.status === 'Shipped') badgeClass = 'badge-warning';
      if (order.status === 'Cancelled') badgeClass = 'badge-danger';

      return `
        <div class="cart-card" style="margin-bottom:1.5rem;" id="order-card-${order.id}">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.75rem; border-bottom:1px solid var(--border); padding-bottom:1rem; margin-bottom:1rem;">
            <div>
              <div style="font-weight:800; font-size:1.1rem; color:var(--secondary);">Order #${order.id}</div>
              <small style="color:var(--text-muted);">Placed on ${formatDate(order.created_at)}</small>
            </div>
            <div style="display:flex; align-items:center; gap:0.75rem;">
              <span class="badge ${badgeClass}">${order.status}</span>
              <span style="font-weight:800; font-size:1.2rem; color:var(--primary);">${formatPrice(order.total_amount)}</span>
            </div>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
            <div style="font-size:0.88rem; color:var(--text-muted);">
              <div>📍 <strong>Ship to:</strong> ${escapeHtml(order.shipping_name)}, ${escapeHtml(order.shipping_city)}</div>
              <div>💵 <strong>Payment:</strong> ${escapeHtml(order.payment_method)}</div>
              <div>📦 <strong>Items:</strong> ${order.total_items} item(s)</div>
            </div>

            <div style="display:flex; gap:0.5rem;">
              <button class="btn btn-sm btn-secondary" onclick="viewOrderDetails(${order.id})">
                View Details
              </button>
              ${isPlaced ? `
                <button class="btn btn-sm btn-outline" style="border-color:var(--danger); color:var(--danger);" onclick="cancelCustomerOrder(${order.id})">
                  Cancel Order
                </button>
              ` : ''}
            </div>
          </div>

          <!-- Collapsible details container -->
          <div id="order-details-${order.id}" style="display:none; margin-top:1.25rem; border-top:1px dashed var(--border); padding-top:1rem;"></div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load orders:', err);
    showToast('Failed to load order history.', 'danger');
  }
}

async function viewOrderDetails(orderId) {
  const detailsDiv = document.getElementById(`order-details-${orderId}`);
  if (!detailsDiv) return;

  if (detailsDiv.style.display === 'block') {
    detailsDiv.style.display = 'none';
    return;
  }

  detailsDiv.innerHTML = '<p style="color:var(--text-muted);">Loading order items...</p>';
  detailsDiv.style.display = 'block';

  try {
    const res = await apiFetch(`/orders/${orderId}`);
    const order = res.order;
    const items = order.items || [];

    detailsDiv.innerHTML = `
      <div style="background:var(--bg-subtle); padding:1rem; border-radius:var(--radius-sm); margin-bottom:1rem; font-size:0.85rem;">
        <strong>Delivery Address:</strong> ${escapeHtml(order.shipping_address)}, ${escapeHtml(order.shipping_city)} - ${escapeHtml(order.shipping_pincode)}<br/>
        <strong>Recipient Phone:</strong> ${escapeHtml(order.shipping_phone)}
      </div>
      <table class="custom-table" style="font-size:0.88rem;">
        <thead>
          <tr>
            <th>Product</th>
            <th>Unit Price</th>
            <th>Qty</th>
            <th>Line Total</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((it) => `
            <tr>
              <td>
                <div style="display:flex; align-items:center; gap:0.6rem;">
                  <img src="${escapeHtml(it.image_url)}" alt="" style="width:36px; height:36px; border-radius:4px; object-fit:cover;" onerror="this.src='https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80'" />
                  <span>${escapeHtml(it.product_name)}</span>
                </div>
              </td>
              <td>${formatPrice(it.unit_price)}</td>
              <td>${it.quantity}</td>
              <td style="font-weight:700;">${formatPrice(it.line_total)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    detailsDiv.innerHTML = `<p style="color:var(--danger);">Failed to load details: ${escapeHtml(err.message)}</p>`;
  }
}

async function cancelCustomerOrder(orderId) {
  if (!confirm(`Are you sure you want to cancel Order #${orderId}? Product stock will be returned to store inventory.`)) {
    return;
  }

  try {
    const res = await apiFetch(`/orders/${orderId}/cancel`, { method: 'POST' });
    showToast(res.message || 'Order cancelled.', 'success');
    await loadOrders();
  } catch (err) {
    showToast(err.message || 'Failed to cancel order.', 'danger');
  }
}
