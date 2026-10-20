/**
 * Admin Order Management Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
  const hasAccess = await ensureAdminAccess();
  if (!hasAccess) return;

  await loadAdminOrders();
  setupOrderFilters();
});

async function loadAdminOrders() {
  const container = document.getElementById('admin-orders-table');
  if (!container) return;

  const status = document.getElementById('order-status-filter')?.value || 'all';
  const search = document.getElementById('order-search')?.value.trim() || '';

  const params = new URLSearchParams();
  if (status !== 'all') params.append('status', status);
  if (search) params.append('search', search);

  try {
    const res = await apiFetch(`/admin/orders?${params.toString()}`);
    const orders = res.orders || [];

    if (orders.length === 0) {
      container.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:2rem;">No orders found.</td></tr>`;
      return;
    }

    container.innerHTML = orders.map((o) => `
      <tr>
        <td><strong>#${o.id}</strong></td>
        <td>
          <strong>${escapeHtml(o.customer_name)}</strong><br/>
          <small style="color:var(--text-muted);">${escapeHtml(o.customer_email)}</small><br/>
          <small style="color:var(--text-muted);">📞 ${escapeHtml(o.shipping_phone)}</small>
        </td>
        <td>
          <small>${escapeHtml(o.shipping_address)}, ${escapeHtml(o.shipping_city)} - ${escapeHtml(o.shipping_pincode)}</small>
        </td>
        <td><strong>${formatPrice(o.total_amount)}</strong><br/><small style="color:var(--text-muted);">${o.item_count} items</small></td>
        <td>
          <select class="form-control" style="padding:0.35rem 0.6rem; font-size:0.85rem;" onchange="updateStatus(${o.id}, this.value)">
            <option value="Placed" ${o.status === 'Placed' ? 'selected' : ''}>Placed</option>
            <option value="Shipped" ${o.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
            <option value="Delivered" ${o.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
            <option value="Cancelled" ${o.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
        </td>
        <td><small>${formatDate(o.created_at)}</small></td>
        <td>
          <button class="btn btn-sm btn-secondary" onclick="viewAdminOrderModal(${o.id})">Details</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    showToast('Failed to load orders.', 'danger');
  }
}

function setupOrderFilters() {
  const statusFilter = document.getElementById('order-status-filter');
  const searchInput = document.getElementById('order-search');

  if (statusFilter) {
    statusFilter.addEventListener('change', () => loadAdminOrders());
  }

  if (searchInput) {
    let timer;
    searchInput.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => loadAdminOrders(), 350);
    });
  }
}

async function updateStatus(orderId, newStatus) {
  try {
    const res = await apiFetch(`/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      body: { status: newStatus },
    });
    showToast(res.message || 'Status updated.', 'success');
  } catch (err) {
    showToast(err.message || 'Failed to update order status.', 'danger');
    await loadAdminOrders();
  }
}

async function viewAdminOrderModal(orderId) {
  try {
    const res = await apiFetch(`/orders/${orderId}`);
    const order = res.order;
    const items = order.items || [];

    const modal = document.getElementById('order-modal');
    const body = document.getElementById('order-modal-body');

    body.innerHTML = `
      <div style="margin-bottom:1rem; font-size:0.9rem;">
        <div><strong>Order ID:</strong> #${order.id}</div>
        <div><strong>Status:</strong> ${order.status}</div>
        <div><strong>Customer Name:</strong> ${escapeHtml(order.shipping_name)}</div>
        <div><strong>Phone:</strong> ${escapeHtml(order.shipping_phone)}</div>
        <div><strong>Address:</strong> ${escapeHtml(order.shipping_address)}, ${escapeHtml(order.shipping_city)} - ${escapeHtml(order.shipping_pincode)}</div>
        <div><strong>Placed At:</strong> ${formatDate(order.created_at)}</div>
      </div>
      <table class="custom-table" style="font-size:0.85rem;">
        <thead>
          <tr>
            <th>Item</th>
            <th>Unit Price</th>
            <th>Qty</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((it) => `
            <tr>
              <td>${escapeHtml(it.product_name)}</td>
              <td>${formatPrice(it.unit_price)}</td>
              <td>${it.quantity}</td>
              <td>${formatPrice(it.line_total)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div style="text-align:right; margin-top:1rem; font-size:1.1rem; font-weight:800;">
        Total: ${formatPrice(order.total_amount)}
      </div>
    `;

    modal.classList.add('active');
  } catch (err) {
    showToast('Failed to load order items.', 'danger');
  }
}

function closeOrderModal() {
  document.getElementById('order-modal').classList.remove('active');
}
