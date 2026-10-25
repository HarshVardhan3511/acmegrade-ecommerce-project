const { get, run } = require('../db');

/**
 * Validate and apply a coupon code
 * POST /api/coupons/validate
 * Body: { code, cart_total }
 * Returns: coupon details with computed discount
 */
async function validateCoupon(req, res) {
  try {
    const { code, cart_total } = req.body;

    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Coupon code is required.' });
    }

    const cartTotal = Number(cart_total);
    if (isNaN(cartTotal) || cartTotal <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid cart total.' });
    }

    const coupon = await get(
      `SELECT * FROM coupons WHERE code = ? COLLATE NOCASE AND is_active = 1`,
      [code.trim()]
    );

    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Invalid or expired coupon code.' });
    }

    // Check expiry
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return res.status(400).json({ success: false, message: 'This coupon has expired.' });
    }

    // Check usage limit
    if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
      return res.status(400).json({ success: false, message: 'This coupon has reached its usage limit.' });
    }

    // Check minimum order amount
    if (cartTotal < coupon.min_order_amount) {
      return res.status(400).json({
        success: false,
        message: `This coupon requires a minimum order of ₹${Number(coupon.min_order_amount).toFixed(2)}.`,
      });
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.discount_type === 'percentage') {
      discountAmount = (cartTotal * coupon.discount_value) / 100;
      // Apply max_discount cap if set
      if (coupon.max_discount && discountAmount > coupon.max_discount) {
        discountAmount = coupon.max_discount;
      }
    } else {
      discountAmount = coupon.discount_value;
    }

    discountAmount = Math.min(discountAmount, cartTotal); // Can't discount more than total
    discountAmount = Number(discountAmount.toFixed(2));

    return res.status(200).json({
      success: true,
      message: `Coupon "${coupon.code}" applied! You save ₹${discountAmount}.`,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        discount_amount: discountAmount,
      },
    });
  } catch (err) {
    console.error('Validate coupon error:', err);
    return res.status(500).json({ success: false, message: 'Failed to validate coupon.' });
  }
}

/**
 * Get all coupons (Admin only)
 * GET /api/admin/coupons
 */
async function getAllCoupons(req, res) {
  try {
    const { all } = require('../db');
    const coupons = await all('SELECT * FROM coupons ORDER BY created_at DESC');
    return res.status(200).json({ success: true, coupons });
  } catch (err) {
    console.error('Get coupons error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve coupons.' });
  }
}

/**
 * Create a new coupon (Admin only)
 * POST /api/admin/coupons
 */
async function createCoupon(req, res) {
  try {
    const { code, discount_type, discount_value, min_order_amount, max_uses, max_discount, expires_at } = req.body;

    if (!code || !discount_type || !discount_value) {
      return res.status(400).json({ success: false, message: 'Code, discount_type, and discount_value are required.' });
    }

    if (!['percentage', 'flat'].includes(discount_type)) {
      return res.status(400).json({ success: false, message: 'discount_type must be "percentage" or "flat".' });
    }

    const result = await run(
      `INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, max_uses, max_discount, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        code.trim().toUpperCase(),
        discount_type,
        Number(discount_value),
        Number(min_order_amount) || 0,
        max_uses ? Number(max_uses) : null,
        max_discount ? Number(max_discount) : null,
        expires_at || null,
      ]
    );

    const { get: dbGet } = require('../db');
    const coupon = await dbGet('SELECT * FROM coupons WHERE id = ?', [result.lastID]);

    return res.status(201).json({ success: true, message: 'Coupon created successfully.', coupon });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(409).json({ success: false, message: 'A coupon with this code already exists.' });
    }
    console.error('Create coupon error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create coupon.' });
  }
}

/**
 * Toggle coupon active status (Admin only)
 * PATCH /api/admin/coupons/:id/toggle
 */
async function toggleCoupon(req, res) {
  try {
    const { id } = req.params;
    const { get: dbGet } = require('../db');
    const coupon = await dbGet('SELECT * FROM coupons WHERE id = ?', [id]);
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found.' });
    }
    const newStatus = coupon.is_active === 1 ? 0 : 1;
    await run('UPDATE coupons SET is_active = ? WHERE id = ?', [newStatus, id]);
    return res.status(200).json({
      success: true,
      message: `Coupon "${coupon.code}" is now ${newStatus ? 'active' : 'inactive'}.`,
    });
  } catch (err) {
    console.error('Toggle coupon error:', err);
    return res.status(500).json({ success: false, message: 'Failed to toggle coupon.' });
  }
}

/**
 * Delete a coupon (Admin only)
 * DELETE /api/admin/coupons/:id
 */
async function deleteCoupon(req, res) {
  try {
    const { id } = req.params;
    await run('DELETE FROM coupons WHERE id = ?', [id]);
    return res.status(200).json({ success: true, message: 'Coupon deleted successfully.' });
  } catch (err) {
    console.error('Delete coupon error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete coupon.' });
  }
}

module.exports = { validateCoupon, getAllCoupons, createCoupon, toggleCoupon, deleteCoupon };
