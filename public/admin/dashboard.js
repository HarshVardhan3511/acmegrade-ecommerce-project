/**
 * Admin Dashboard Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (!isLoggedIn() || !isAdmin()) {
    showToast('Admin privileges required.', 'danger');
    setTimeout(() => { window.location.href = '/login.html'; }, 1000);
    return;
  }

  await loadDashboardStats();
});

async function loadDashboardStats() {
  try {
    const res = await apiFetch('/admin/stats');
    const stats = res.stats;

    // Stat Cards
    document.getElementById('stat-revenue').textContent = formatPrice(stats.total_revenue);
    document.getElementById('stat-orders').textContent = stats.total_orders;
    document.getElementById('stat-products').textContent = stats.total_products;
    document.getElementById('stat-customers').textContent = stats.total_customers;

    // Low stock count badge / highlight (ADM-6)
    const lowStockBadge = document.getElementById('low-stock-count');
    if (lowStockBadge) {
      lowStockBadge.textContent = stats.low_stock_count;
      if (stats.low_stock_count > 0) {
        lowStockBadge.className = 'badge badge-danger';
      }
    }

    // Render Recent Orders
    renderRecentOrders(stats.recent_orders || []);

    // Render Low Stock Products
    await loadLowStockProducts();

    // Render Sales by Category Chart using Chart.js if loaded
    renderCategoryChart(stats.category_sales || []);
  } catch (err) {
    console.error('Failed to load admin stats:', err);
    showToast('Failed to load dashboard data.', 'danger');
  }
}

function renderRecentOrders(orders) {
  const container = document.getElementById('recent-orders-table');
  if (!container) return;

  if (orders.length === 0) {
    container.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">No orders placed yet.</td></tr>`;
    return;
  }

  container.innerHTML = orders.map((o) => `
    <tr>
      <td><strong>#${o.id}</strong></td>
      <td>${escapeHtml(o.customer_name)}<br/><small style="color:var(--text-muted);">${escapeHtml(o.customer_email)}</small></td>
      <td><strong>${formatPrice(o.total_amount)}</strong></td>
      <td><span class="badge ${getStatusBadge(o.status)}">${o.status}</span></td>
      <td>${formatDate(o.created_at)}</td>
    </tr>
  `).join('');
}

async function loadLowStockProducts() {
  const container = document.getElementById('low-stock-table');
  if (!container) return;

  try {
    const res = await apiFetch('/admin/low-stock');
    const products = res.products || [];

    if (products.length === 0) {
      container.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--success);">All products have healthy stock levels (≥ 5 units).</td></tr>`;
      return;
    }

    container.innerHTML = products.map((p) => `
      <tr style="background:#fffbeb;">
        <td>
          <div style="display:flex; align-items:center; gap:0.6rem;">
            <img src="${escapeHtml(p.image_url)}" alt="" style="width:32px; height:32px; border-radius:4px; object-fit:cover;" onerror="this.src='https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80'" />
            <strong>${escapeHtml(p.name)}</strong>
          </div>
        </td>
        <td>${escapeHtml(p.category_name)}</td>
        <td><span class="badge ${p.stock === 0 ? 'badge-danger' : 'badge-warning'}">${p.stock} units remaining</span></td>
        <td><a href="/admin/products.html" class="btn btn-sm btn-secondary">Restock</a></td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load low stock items:', err);
  }
}

function renderCategoryChart(data) {
  const canvas = document.getElementById('category-sales-chart');
  if (!canvas || typeof Chart === 'undefined') return;

  const labels = data.map((d) => d.category);
  const values = data.map((d) => Number(d.sales));

  new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: labels.length ? labels : ['No Data'],
      datasets: [
        {
          data: values.length ? values : [1],
          backgroundColor: [
            '#2563eb',
            '#10b981',
            '#f59e0b',
            '#8b5cf6',
            '#ec4899',
            '#06b6d4',
          ],
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
      },
    },
  });
}

function getStatusBadge(status) {
  if (status === 'Delivered') return 'badge-success';
  if (status === 'Shipped') return 'badge-warning';
  if (status === 'Cancelled') return 'badge-danger';
  return 'badge-info';
}
