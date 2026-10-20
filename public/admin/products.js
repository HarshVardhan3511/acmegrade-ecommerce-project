/**
 * Admin Product Management Logic
 */

let allCategories = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (!isLoggedIn() || !isAdmin()) {
    showToast('Admin privileges required.', 'danger');
    setTimeout(() => { window.location.href = '/login.html'; }, 1000);
    return;
  }

  await loadCategoriesForSelect();
  await loadAdminProducts();
  setupProductForm();
  setupSearchAndFilters();
});

async function loadCategoriesForSelect() {
  try {
    const res = await apiFetch('/categories');
    allCategories = res.categories || [];

    const selectEl = document.getElementById('prod-category');
    const filterCatEl = document.getElementById('filter-category');

    let options = '<option value="">Select Category</option>';
    let filterOptions = '<option value="">All Categories</option>';

    allCategories.forEach((cat) => {
      options += `<option value="${cat.id}">${escapeHtml(cat.name)}</option>`;
      filterOptions += `<option value="${cat.id}">${escapeHtml(cat.name)}</option>`;
    });

    if (selectEl) selectEl.innerHTML = options;
    if (filterCatEl) filterCatEl.innerHTML = filterOptions;
  } catch (err) {
    console.error('Failed to load categories:', err);
  }
}

async function loadAdminProducts() {
  const container = document.getElementById('admin-products-table');
  if (!container) return;

  const search = document.getElementById('admin-search')?.value.trim() || '';
  const category = document.getElementById('filter-category')?.value || '';

  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (category) params.append('category', category);
  params.append('limit', 100);
  params.append('includeInactive', 'true');

  try {
    const res = await apiFetch(`/products?${params.toString()}`);
    const products = res.products || [];

    if (products.length === 0) {
      container.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:2rem;">No products found.</td></tr>`;
      return;
    }

    container.innerHTML = products.map((p) => {
      const isLowStock = p.stock > 0 && p.stock < 5;
      const isOutOfStock = p.stock === 0;

      let stockTag = `<span>${p.stock}</span>`;
      if (isOutOfStock) {
        stockTag = `<span class="badge badge-danger">0 (Out of stock)</span>`;
      } else if (isLowStock) {
        stockTag = `<span class="badge badge-warning">${p.stock} (Low stock)</span>`;
      }

      return `
        <tr>
          <td>
            <img src="${escapeHtml(p.image_url)}" alt="" style="width:40px; height:40px; border-radius:4px; object-fit:cover;" onerror="this.src='https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80'" />
          </td>
          <td>
            <strong>${escapeHtml(p.name)}</strong>
          </td>
          <td>${escapeHtml(p.category_name || '-')}</td>
          <td><strong>${formatPrice(p.price)}</strong></td>
          <td>${stockTag}</td>
          <td>
            <span class="badge ${p.is_active === 1 ? 'badge-success' : 'badge-danger'}">
              ${p.is_active === 1 ? 'Active' : 'Inactive'}
            </span>
          </td>
          <td>
            <div style="display:flex; gap:0.4rem;">
              <button class="btn btn-sm btn-secondary" onclick='openEditModal(${JSON.stringify(p)})'>Edit</button>
              <button class="btn btn-sm btn-outline" style="border-color:var(--danger); color:var(--danger);" onclick="deleteProductById(${p.id}, '${escapeHtml(p.name)}')">Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load admin products:', err);
    showToast('Failed to load products list.', 'danger');
  }
}

function setupSearchAndFilters() {
  const searchInput = document.getElementById('admin-search');
  const catSelect = document.getElementById('filter-category');

  if (searchInput) {
    let timer;
    searchInput.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => loadAdminProducts(), 350);
    });
  }

  if (catSelect) {
    catSelect.addEventListener('change', () => loadAdminProducts());
  }
}

function openAddModal() {
  document.getElementById('modal-title').textContent = 'Add New Product';
  document.getElementById('product-form').reset();
  document.getElementById('prod-id').value = '';
  document.getElementById('prod-modal').classList.add('active');
}

function openEditModal(prod) {
  document.getElementById('modal-title').textContent = 'Edit Product';
  document.getElementById('prod-id').value = prod.id;
  document.getElementById('prod-name').value = prod.name;
  document.getElementById('prod-category').value = prod.category_id;
  document.getElementById('prod-price').value = prod.price;
  document.getElementById('prod-stock').value = prod.stock;
  document.getElementById('prod-image-url').value = prod.image_url || '';
  document.getElementById('prod-description').value = prod.description || '';
  document.getElementById('prod-active').checked = prod.is_active === 1;

  document.getElementById('prod-modal').classList.add('active');
}

function closeModal() {
  document.getElementById('prod-modal').classList.remove('active');
}

function setupProductForm() {
  const form = document.getElementById('product-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('prod-id').value;
    const name = document.getElementById('prod-name').value.trim();
    const category_id = document.getElementById('prod-category').value;
    const price = document.getElementById('prod-price').value;
    const stock = document.getElementById('prod-stock').value;
    const description = document.getElementById('prod-description').value.trim();
    const image_url = document.getElementById('prod-image-url').value.trim();
    const is_active = document.getElementById('prod-active').checked ? 1 : 0;
    const fileInput = document.getElementById('prod-image-file');

    if (!name || !category_id || price === '' || stock === '') {
      showToast('Please fill in all required fields.', 'warning');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    try {
      // Use FormData if file is attached, otherwise JSON
      let payload;
      let isMultipart = false;

      if (fileInput && fileInput.files && fileInput.files[0]) {
        isMultipart = true;
        const formData = new FormData();
        formData.append('name', name);
        formData.append('category_id', category_id);
        formData.append('price', price);
        formData.append('stock', stock);
        formData.append('description', description);
        formData.append('is_active', is_active);
        formData.append('image', fileInput.files[0]);
        if (image_url) formData.append('image_url', image_url);
        payload = formData;
      } else {
        payload = {
          name,
          category_id,
          price,
          stock,
          description,
          image_url: image_url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
          is_active,
        };
      }

      if (id) {
        // Update product
        await apiFetch(`/products/${id}`, {
          method: 'PUT',
          body: payload,
        });
        showToast('Product updated successfully.', 'success');
      } else {
        // Create product
        await apiFetch('/products', {
          method: 'POST',
          body: payload,
        });
        showToast('Product created successfully.', 'success');
      }

      closeModal();
      await loadAdminProducts();
    } catch (err) {
      showToast(err.message || 'Operation failed.', 'danger');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save Product';
    }
  });
}

async function deleteProductById(id, name) {
  if (!confirm(`Are you sure you want to deactivate or remove "${name}"?`)) {
    return;
  }

  try {
    const res = await apiFetch(`/products/${id}`, { method: 'DELETE' });
    showToast(res.message || 'Product removed.', 'success');
    await loadAdminProducts();
  } catch (err) {
    showToast(err.message || 'Failed to delete product.', 'danger');
  }
}
