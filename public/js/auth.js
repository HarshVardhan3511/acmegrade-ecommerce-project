/**
 * Authentication Scripts (Login & Register)
 */

document.addEventListener('DOMContentLoaded', () => {
  // If already logged in on login page, display helpful switch banner instead of blocking
  if (isLoggedIn() && window.location.pathname.includes('login.html')) {
    const user = getUser();
    const wrapper = document.querySelector('.auth-wrapper');
    if (wrapper && user) {
      const banner = document.createElement('div');
      banner.style.cssText = 'background:var(--primary-light); border:1px solid #bfdbfe; border-radius:8px; padding:0.75rem 1rem; margin-bottom:1.25rem; font-size:0.88rem; display:flex; justify-content:space-between; align-items:center;';
      banner.innerHTML = `
        <div>
          Signed in: <strong>${escapeHtml(user.name)}</strong> (${user.role.toUpperCase()})
        </div>
        <button type="button" class="btn btn-sm btn-secondary" onclick="clearAuth(); window.location.reload();">
          Logout
        </button>
      `;
      wrapper.insertBefore(banner, wrapper.children[1]);
    }
  } else if (isLoggedIn() && window.location.pathname.includes('register.html')) {
    window.location.href = '/index.html';
    return;
  }

  // --- LOGIN FORM ---
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const submitBtn = loginForm.querySelector('button[type="submit"]');

      if (!email || !password) {
        showToast('Please enter both email and password.', 'warning');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Logging in...';

      try {
        const res = await apiFetch('/auth/login', {
          method: 'POST',
          body: { email, password },
        });

        setToken(res.token);
        setUser(res.user);
        showToast(`Welcome back, ${res.user.name}!`, 'success');

        setTimeout(() => {
          if (res.user.role === 'admin') {
            window.location.href = '/admin/dashboard.html';
          } else {
            const redirectUrl = new URLSearchParams(window.location.search).get('redirect') || '/index.html';
            window.location.href = redirectUrl;
          }
        }, 800);
      } catch (err) {
        showToast(err.message || 'Login failed.', 'danger');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
      }
    });

    // Demo Fill Buttons
    const fillAdminBtn = document.getElementById('fill-admin-btn');
    if (fillAdminBtn) {
      fillAdminBtn.addEventListener('click', () => {
        document.getElementById('email').value = 'admin@shopeasy.com';
        document.getElementById('password').value = 'admin123';
      });
    }

    const fillCustomerBtn = document.getElementById('fill-customer-btn');
    if (fillCustomerBtn) {
      fillCustomerBtn.addEventListener('click', () => {
        document.getElementById('email').value = 'customer@shopeasy.com';
        document.getElementById('password').value = 'customer123';
      });
    }
  }

  // --- REGISTER FORM ---
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirm_password').value;
      const phone = document.getElementById('phone') ? document.getElementById('phone').value.trim() : '';
      const address = document.getElementById('address') ? document.getElementById('address').value.trim() : '';
      const submitBtn = registerForm.querySelector('button[type="submit"]');

      // Client-side validations
      if (name.length < 2) {
        showToast('Name must be at least 2 characters long.', 'warning');
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showToast('Please enter a valid email address.', 'warning');
        return;
      }

      if (password.length < 6) {
        showToast('Password must be at least 6 characters.', 'warning');
        return;
      }

      if (password !== confirmPassword) {
        showToast('Passwords do not match.', 'danger');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating Account...';

      try {
        const res = await apiFetch('/auth/register', {
          method: 'POST',
          body: { name, email, password, phone, address },
        });

        setToken(res.token);
        setUser(res.user);
        showToast('Account created successfully! Welcome to ShopEasy.', 'success');

        setTimeout(() => {
          window.location.href = '/index.html';
        }, 800);
      } catch (err) {
        showToast(err.message || 'Registration failed.', 'danger');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
      }
    });
  }
});
