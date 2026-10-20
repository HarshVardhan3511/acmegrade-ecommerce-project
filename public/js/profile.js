/**
 * Customer Profile Logic (AUTH-7)
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (!isLoggedIn()) {
    showToast('Please log in to view profile.', 'warning');
    setTimeout(() => { window.location.href = '/login.html'; }, 800);
    return;
  }

  await loadUserProfile();
  setupProfileForm();
});

async function loadUserProfile() {
  try {
    const res = await apiFetch('/auth/me');
    const user = res.user;
    setUser(user);

    document.getElementById('profile-name').value = user.name || '';
    document.getElementById('profile-email').value = user.email || '';
    document.getElementById('profile-phone').value = user.phone || '';
    document.getElementById('profile-address').value = user.address || '';
    document.getElementById('profile-role').textContent = user.role.toUpperCase();
    document.getElementById('profile-joined').textContent = formatDate(user.created_at);
  } catch (err) {
    showToast('Failed to load profile.', 'danger');
  }
}

function setupProfileForm() {
  const form = document.getElementById('profile-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('profile-name').value.trim();
    const phone = document.getElementById('profile-phone').value.trim();
    const address = document.getElementById('profile-address').value.trim();
    const submitBtn = form.querySelector('button[type="submit"]');

    if (name.length < 2) {
      showToast('Name must be at least 2 characters.', 'warning');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    try {
      const res = await apiFetch('/auth/profile', {
        method: 'PUT',
        body: { name, phone, address },
      });

      setUser(res.user);
      updateNavAuth();
      showToast('Profile updated successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to update profile.', 'danger');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save Changes';
    }
  });
}
