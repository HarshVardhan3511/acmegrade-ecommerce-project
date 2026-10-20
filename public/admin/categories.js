/**
 * Admin Category Management Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (!isLoggedIn() || !isAdmin()) {
    showToast('Admin privileges required.', 'danger');
    setTimeout(() => { window.location.href = '/login.html'; }, 1000);
    return;
  }

  await loadCategoriesTable();
  setupCategoryForm();
});

async function loadCategoriesTable() {
  const container = document.getElementById('admin-categories-table');
  if (!container) return;

  try {
    const res = await apiFetch('/categories');
    const categories = res.categories || [];

    if (categories.length === 0) {
      container.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:2rem;">No categories defined.</td></tr>`;
      return;
    }

    container.innerHTML = categories.map((cat) => `
      <tr>
        <td><strong>#${cat.id}</strong></td>
        <td><strong>${escapeHtml(cat.name)}</strong></td>
        <td>${escapeHtml(cat.description || '-')}</td>
        <td><span class="badge badge-info">${cat.product_count} products</span></td>
        <td>
          <div style="display:flex; gap:0.4rem;">
            <button class="btn btn-sm btn-secondary" onclick='openEditCategory(${JSON.stringify(cat)})'>Edit</button>
            <button class="btn btn-sm btn-outline" style="border-color:var(--danger); color:var(--danger);" onclick="deleteCategoryById(${cat.id}, '${escapeHtml(cat.name)}')">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    showToast('Failed to load categories.', 'danger');
  }
}

function openAddCategory() {
  document.getElementById('cat-modal-title').textContent = 'Add Category';
  document.getElementById('category-form').reset();
  document.getElementById('cat-id').value = '';
  document.getElementById('cat-modal').classList.add('active');
}

function openEditCategory(cat) {
  document.getElementById('cat-modal-title').textContent = 'Edit Category';
  document.getElementById('cat-id').value = cat.id;
  document.getElementById('cat-name').value = cat.name;
  document.getElementById('cat-description').value = cat.description || '';
  document.getElementById('cat-modal').classList.add('active');
}

function closeCategoryModal() {
  document.getElementById('cat-modal').classList.remove('active');
}

function setupCategoryForm() {
  const form = document.getElementById('category-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('cat-id').value;
    const name = document.getElementById('cat-name').value.trim();
    const description = document.getElementById('cat-description').value.trim();

    if (!name) {
      showToast('Category name is required.', 'warning');
      return;
    }

    try {
      if (id) {
        await apiFetch(`/categories/${id}`, {
          method: 'PUT',
          body: { name, description },
        });
        showToast('Category updated successfully.', 'success');
      } else {
        await apiFetch('/categories', {
          method: 'POST',
          body: { name, description },
        });
        showToast('Category created successfully.', 'success');
      }

      closeCategoryModal();
      await loadCategoriesTable();
    } catch (err) {
      showToast(err.message || 'Operation failed.', 'danger');
    }
  });
}

async function deleteCategoryById(id, name) {
  if (!confirm(`Are you sure you want to delete category "${name}"?`)) {
    return;
  }

  try {
    const res = await apiFetch(`/categories/${id}`, { method: 'DELETE' });
    showToast(res.message || 'Category deleted.', 'success');
    await loadCategoriesTable();
  } catch (err) {
    showToast(err.message || 'Failed to delete category.', 'danger');
  }
}
