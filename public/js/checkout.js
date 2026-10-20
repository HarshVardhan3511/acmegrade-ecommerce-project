/**
 * Checkout Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (!isLoggedIn()) {
    showToast('Please log in to proceed to checkout.', 'warning');
    setTimeout(() => {
      window.location.href = `/login.html?redirect=/checkout.html`;
    }, 1000);
    return;
  }

  await loadCheckoutSummary();
  populateUserDetails();
  setupCheckoutForm();
});

function populateUserDetails() {
  const user = getUser();
  if (!user) return;

  if (document.getElementById('shipping_name') && user.name) {
    document.getElementById('shipping_name').value = user.name;
  }
  if (document.getElementById('shipping_phone') && user.phone) {
    document.getElementById('shipping_phone').value = user.phone;
  }
  if (document.getElementById('shipping_address') && user.address) {
    document.getElementById('shipping_address').value = user.address;
  }
}

async function loadCheckoutSummary() {
  const container = document.getElementById('checkout-items-preview');
  const subtotalEl = document.getElementById('checkout-subtotal');
  const grandTotalEl = document.getElementById('checkout-grand-total');

  try {
    const res = await apiFetch('/cart');
    const items = res.cart.items || [];

    if (items.length === 0) {
      showToast('Your cart is empty. Redirecting to catalog...', 'info');
      setTimeout(() => { window.location.href = '/index.html'; }, 1200);
      return;
    }

    if (container) {
      container.innerHTML = items.map((item) => `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem; font-size:0.9rem;">
          <div style="display:flex; align-items:center; gap:0.6rem;">
            <img src="${escapeHtml(item.image_url)}" alt="" style="width:36px; height:36px; border-radius:4px; object-fit:cover;" onerror="this.src='https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80'" />
            <div>
              <span style="font-weight:600;">${escapeHtml(item.name)}</span>
              <div style="font-size:0.8rem; color:var(--text-muted);">Qty: ${item.quantity} × ${formatPrice(item.price)}</div>
            </div>
          </div>
          <span style="font-weight:700;">${formatPrice(item.line_total)}</span>
        </div>
      `).join('');
    }

    if (subtotalEl) subtotalEl.textContent = formatPrice(res.cart.grand_total);
    if (grandTotalEl) grandTotalEl.textContent = formatPrice(res.cart.grand_total);
  } catch (err) {
    showToast('Failed to load cart summary for checkout.', 'danger');
  }
}

function setupCheckoutForm() {
  const form = document.getElementById('checkout-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('shipping_name').value.trim();
    const phone = document.getElementById('shipping_phone').value.trim();
    const address = document.getElementById('shipping_address').value.trim();
    const city = document.getElementById('shipping_city').value.trim();
    const pincode = document.getElementById('shipping_pincode').value.trim();
    const submitBtn = document.getElementById('place-order-btn');

    // Validation
    if (name.length < 2) {
      showToast('Please provide a valid full name.', 'warning');
      return;
    }

    const phoneRegex = /^[0-9+() -]{10,15}$/;
    if (!phoneRegex.test(phone)) {
      showToast('Please enter a valid 10-digit phone number.', 'warning');
      return;
    }

    if (address.length < 5) {
      showToast('Please enter a complete street address.', 'warning');
      return;
    }

    if (city.length < 2) {
      showToast('Please enter your city.', 'warning');
      return;
    }

    const pinRegex = /^[0-9]{5,6}$/;
    if (!pinRegex.test(pincode)) {
      showToast('Please enter a valid 5 to 6 digit PIN code.', 'warning');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Placing Order...';

    try {
      const res = await apiFetch('/orders', {
        method: 'POST',
        body: {
          shipping_name: name,
          shipping_phone: phone,
          shipping_address: address,
          shipping_city: city,
          shipping_pincode: pincode,
        },
      });

      showToast(res.message || 'Order placed successfully!', 'success');
      updateCartBadge();

      setTimeout(() => {
        window.location.href = `/success.html?orderId=${res.order.id}`;
      }, 800);
    } catch (err) {
      showToast(err.message || 'Could not place order.', 'danger');
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Place Order (Cash on Delivery) ➔';
    }
  });
}
