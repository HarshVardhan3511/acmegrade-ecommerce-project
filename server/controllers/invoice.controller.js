const { get, all } = require('../db');

/**
 * Generate HTML Invoice for an order
 * GET /api/orders/:id/invoice
 */
async function getInvoice(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;

    const order = await get(
      `SELECT o.*, u.name as customer_name, u.email as customer_email, u.phone as customer_phone
       FROM orders o
       JOIN users u ON o.user_id = u.id
       WHERE o.id = ?`,
      [id]
    );

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    // Only the customer or admin can view the invoice
    if (user.role !== 'admin' && order.user_id !== user.id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const items = await all(
      `SELECT oi.*, p.name as product_name, p.image_url, c.name as category_name
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE oi.order_id = ?`,
      [id]
    );

    const subtotal = order.subtotal || order.total_amount;
    const discountAmount = order.discount_amount || 0;
    const gstAmount = order.gst_amount || 0;
    const totalAmount = order.total_amount;

    const orderDate = new Date(order.created_at).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric'
    });

    const itemRows = items.map((item, idx) => `
      <tr>
        <td style="padding:10px 8px; border-bottom:1px solid #e5e7eb;">${idx + 1}</td>
        <td style="padding:10px 8px; border-bottom:1px solid #e5e7eb; font-weight:600;">${escStr(item.product_name)}</td>
        <td style="padding:10px 8px; border-bottom:1px solid #e5e7eb; color:#6b7280;">${escStr(item.category_name || 'N/A')}</td>
        <td style="padding:10px 8px; border-bottom:1px solid #e5e7eb; text-align:center;">${item.quantity}</td>
        <td style="padding:10px 8px; border-bottom:1px solid #e5e7eb; text-align:right;">₹${Number(item.unit_price).toFixed(2)}</td>
        <td style="padding:10px 8px; border-bottom:1px solid #e5e7eb; text-align:right; font-weight:700;">₹${(item.quantity * item.unit_price).toFixed(2)}</td>
      </tr>
    `).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice #${order.id} - ShopEasy</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; background: #f8fafc; }
    .invoice-wrapper { max-width: 820px; margin: 2rem auto; background: #fff; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.10); overflow: hidden; }
    .invoice-header { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #fff; padding: 2.5rem 2.5rem 2rem; }
    .invoice-header h1 { font-size: 2rem; font-weight: 800; letter-spacing: -0.5px; }
    .invoice-header .subtitle { opacity: 0.85; font-size: 0.95rem; margin-top: 4px; }
    .invoice-meta { display: flex; justify-content: space-between; gap: 2rem; padding: 1.75rem 2.5rem; border-bottom: 1px solid #e5e7eb; flex-wrap: wrap; }
    .meta-block h4 { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; margin-bottom: 6px; }
    .meta-block p { font-size: 0.95rem; color: #1e293b; line-height: 1.6; }
    .meta-block p strong { font-weight: 700; }
    .invoice-body { padding: 1.75rem 2.5rem; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #f1f5f9; }
    thead th { padding: 10px 8px; text-align: left; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; font-weight: 700; }
    thead th:last-child, thead th:nth-child(4), thead th:nth-child(5) { text-align: right; }
    thead th:nth-child(4) { text-align: center; }
    .totals-section { margin-top: 1.5rem; display: flex; justify-content: flex-end; }
    .totals-table { min-width: 300px; }
    .totals-table tr td { padding: 6px 8px; font-size: 0.95rem; }
    .totals-table tr td:first-child { color: #6b7280; }
    .totals-table tr td:last-child { text-align: right; font-weight: 600; }
    .total-row td { font-size: 1.1rem; font-weight: 800; color: #4f46e5; border-top: 2px solid #4f46e5; padding-top: 10px; }
    .coupon-row td { color: #16a34a !important; }
    .invoice-footer { background: #f8fafc; border-top: 1px solid #e5e7eb; padding: 1.5rem 2.5rem; text-align: center; color: #6b7280; font-size: 0.85rem; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 0.78rem; font-weight: 700; }
    .badge-placed { background: #dbeafe; color: #1d4ed8; }
    .badge-shipped { background: #fef3c7; color: #d97706; }
    .badge-delivered { background: #dcfce7; color: #16a34a; }
    .badge-cancelled { background: #fee2e2; color: #dc2626; }
    @media print { body { background: #fff; } .invoice-wrapper { box-shadow: none; margin: 0; border-radius: 0; } }
  </style>
</head>
<body>
  <div class="invoice-wrapper">
    <div class="invoice-header">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:1rem;">
        <div>
          <h1>🛍️ ShopEasy</h1>
          <p class="subtitle">Tax Invoice / Order Receipt</p>
        </div>
        <div style="text-align:right;">
          <div style="font-size:1.5rem; font-weight:800;">Invoice #${order.id}</div>
          <div style="opacity:0.85; font-size:0.9rem; margin-top:4px;">${orderDate}</div>
          <div style="margin-top:8px;"><span class="badge badge-${order.status.toLowerCase()}">${order.status}</span></div>
        </div>
      </div>
    </div>

    <div class="invoice-meta">
      <div class="meta-block">
        <h4>Billed To</h4>
        <p>
          <strong>${escStr(order.customer_name)}</strong><br/>
          ${escStr(order.customer_email)}<br/>
          ${order.customer_phone ? escStr(order.customer_phone) : ''}
        </p>
      </div>
      <div class="meta-block">
        <h4>Shipped To</h4>
        <p>
          <strong>${escStr(order.shipping_name)}</strong><br/>
          ${escStr(order.shipping_address)}<br/>
          ${escStr(order.shipping_city)} - ${escStr(order.shipping_pincode)}<br/>
          📞 ${escStr(order.shipping_phone)}
        </p>
      </div>
      <div class="meta-block">
        <h4>Order Info</h4>
        <p>
          <strong>Order ID:</strong> #${order.id}<br/>
          <strong>Date:</strong> ${orderDate}<br/>
          <strong>Payment:</strong> ${escStr(order.payment_method)}<br/>
          ${order.coupon_code ? `<strong>Coupon:</strong> ${escStr(order.coupon_code)}` : ''}
        </p>
      </div>
    </div>

    <div class="invoice-body">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Product</th>
            <th>Category</th>
            <th style="text-align:center;">Qty</th>
            <th style="text-align:right;">Unit Price</th>
            <th style="text-align:right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>

      <div class="totals-section">
        <table class="totals-table">
          <tr>
            <td>Subtotal</td>
            <td>₹${Number(subtotal).toFixed(2)}</td>
          </tr>
          ${discountAmount > 0 ? `
          <tr class="coupon-row">
            <td>Discount${order.coupon_code ? ` (${escStr(order.coupon_code)})` : ''}</td>
            <td>-₹${Number(discountAmount).toFixed(2)}</td>
          </tr>` : ''}
          ${gstAmount > 0 ? `
          <tr>
            <td>GST (18%)</td>
            <td>₹${Number(gstAmount).toFixed(2)}</td>
          </tr>` : ''}
          <tr>
            <td>Shipping</td>
            <td style="color:#16a34a; font-weight:700;">FREE</td>
          </tr>
          <tr class="total-row">
            <td>Total Payable</td>
            <td>₹${Number(totalAmount).toFixed(2)}</td>
          </tr>
        </table>
      </div>
    </div>

    <div class="invoice-footer">
      <p style="margin-bottom:6px;">Thank you for shopping with <strong>ShopEasy</strong>! 🎉</p>
      <p>This is a computer-generated invoice. For support, contact support@shopeasy.com</p>
      <p style="margin-top:8px; font-size:0.78rem; color:#9ca3af;">GST Registration: SHOPEASY2026IN | &copy; 2026 ShopEasy E-Commerce Platform</p>
      <div style="margin-top:12px;">
        <button onclick="window.print()" style="padding:8px 20px; background:#4f46e5; color:#fff; border:none; border-radius:6px; cursor:pointer; font-size:0.9rem; font-weight:600;">🖨️ Print Invoice</button>
      </div>
    </div>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    return res.send(html);
  } catch (err) {
    console.error('Invoice generation error:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate invoice.' });
  }
}

function escStr(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

module.exports = { getInvoice };
