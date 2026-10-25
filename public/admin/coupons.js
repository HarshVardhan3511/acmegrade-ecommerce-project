/**
 * Admin Coupons Management Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Admin auth check
  const user = getUser();
  if (!user || user.role !== 'admin') {
    showToast('Admin access required.', 'danger');
    setTimeout(() => { window.location.href = '/login.html'; }, 1000);
    return;
  }

  await loadCoupons();
});

function updateDiscountLabel() {
  const type = document.getElementById('coupon-type').value;
  const label = document.getElementById('discount-value-label');
  if (label) {
    label.textContent = type === 'percentage' ? 'Discount Value (%) *' : 'Discount Value (₹) *';
  }
}

function toggleCreateForm() {
  const form = document.getElementById('create-coupon-form');
  if (!form) return;
  form.style.display = form.style.display === 'none' ? 'block' : 'none';
  if (form.style.display === 'block') {
    document.getElementById('coupon-code').focus();
  }
}

async function loadCoupons() {
  const tbody = document.getElementById('coupons-table');
  if (!tbody) return;

  try {
    const res = await apiFetch('/admin/coupons');
    const coupons = res.coupons || [];

    if (coupons.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--text-muted); padding:2rem;">No coupons found. Create your first coupon above.</td></tr>';
      return;
    }

    tbody.innerHTML = coupons.map((c) => {
      const discountLabel = c.discount_type === 'percentage'
        ? `${c.discount_value}%${c.max_discount ? ` (max ₹${c.max_discount})` : ''}`
        : `₹${Number(c.discount_value).toFixed(2)}`;
      const usageLabel = c.max_uses !== null ? `${c.used_count} / ${c.max_uses}` : `${c.used_count} / ∞`;
      const expiresLabel = c.expires_at
        ? new Date(c.expires_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'Never';
      const statusBadge = c.is_active
        ? '<span class="badge badge-success">Active</span>'
        : '<span class="badge badge-danger">Inactive</span>';

      return `
        <tr id="coupon-row-${c.id}">
          <td><strong style="font-family:monospace; font-size:0.95rem;">${escapeHtml(c.code)}</strong></td>
          <td><span class="badge ${c.discount_type === 'percentage' ? 'badge-info' : 'badge-warning'}">${c.discount_type}</span></td>
          <td style="font-weight:700;">${discountLabel}</td>
          <td>₹${Number(c.min_order_amount).toFixed(2)}</td>
          <td>${usageLabel}</td>
          <td>${statusBadge}</td>
          <td style="font-size:0.85rem;">${expiresLabel}</td>
          <td>
            <div style="display:flex; gap:0.4rem; flex-wrap:wrap;">
              <button class="btn btn-sm btn-secondary" onclick="toggleCoupon(${c.id}, '${escapeHtml(c.code)}')">
                ${c.is_active ? '⏸ Disable' : '▶ Enable'}
              </button>
              <button class="btn btn-sm btn-outline" style="border-color:var(--danger); color:var(--danger);" onclick="deleteCoupon(${c.id}, '${escapeHtml(c.code)}')">
                🗑 Delete
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--danger); padding:2rem;">Failed to load coupons: ${escapeHtml(err.message)}</td></tr>`;
  }
}

async function handleCreateCoupon(e) {
  e.preventDefault();
  const btn = document.getElementById('create-coupon-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Creating...'; }

  try {
    const code = document.getElementById('coupon-code').value.trim().toUpperCase();
    const discount_type = document.getElementById('coupon-type').value;
    const discount_value = parseFloat(document.getElementById('coupon-value').value);
    const min_order_amount = parseFloat(document.getElementById('coupon-min').value) || 0;
    const max_uses_val = document.getElementById('coupon-max-uses').value;
    const max_discount_val = document.getElementById('coupon-max-discount').value;
    const expires_at_val = document.getElementById('coupon-expires').value;

    await apiFetch('/admin/coupons', {
      method: 'POST',
      body: {
        code,
        discount_type,
        discount_value,
        min_order_amount,
        max_uses: max_uses_val ? parseInt(max_uses_val) : null,
        max_discount: max_discount_val ? parseFloat(max_discount_val) : null,
        expires_at: expires_at_val || null,
      },
    });

    showToast(`Coupon "${code}" created successfully!`, 'success');
    document.getElementById('coupon-form').reset();
    toggleCreateForm();
    await loadCoupons();
  } catch (err) {
    showToast(err.message || 'Failed to create coupon.', 'danger');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Create Coupon'; }
  }
}

async function toggleCoupon(id, code) {
  try {
    const res = await apiFetch(`/admin/coupons/${id}/toggle`, { method: 'PATCH' });
    showToast(res.message || `Coupon "${code}" status updated.`, 'success');
    await loadCoupons();
  } catch (err) {
    showToast(err.message || 'Failed to update coupon.', 'danger');
  }
}

async function deleteCoupon(id, code) {
  if (!confirm(`Are you sure you want to delete coupon "${code}"? This cannot be undone.`)) return;
  try {
    const res = await apiFetch(`/admin/coupons/${id}`, { method: 'DELETE' });
    showToast(res.message || `Coupon "${code}" deleted.`, 'success');
    await loadCoupons();
  } catch (err) {
    showToast(err.message || 'Failed to delete coupon.', 'danger');
  }
}
