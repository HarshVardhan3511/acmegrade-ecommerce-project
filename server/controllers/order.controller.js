const { all, get, run, transaction } = require('../db');
const { notifyOrderPlaced, notifyOrderStatusUpdate, GST_RATE } = require('../services/notification.service');

/**
 * Place a new order from current cart
 * POST /api/orders
 * Body includes optional coupon_code
 */
async function placeOrder(req, res) {
  try {
    const userId = req.user.id;
    const {
      shipping_name,
      shipping_phone,
      shipping_address,
      shipping_city,
      shipping_pincode,
      coupon_code,
    } = req.body;

    const orderResult = await transaction(async (tx) => {
      // 1. Fetch cart items
      const cartItems = await tx.all(
        `SELECT 
           ci.id as cart_item_id, 
           ci.quantity, 
           p.id as product_id, 
           p.name, 
           p.price, 
           p.stock, 
           p.is_active
         FROM cart_items ci
         JOIN products p ON ci.product_id = p.id
         WHERE ci.user_id = ?`,
        [userId]
      );

      if (!cartItems || cartItems.length === 0) {
        const err = new Error('Your cart is empty.');
        err.statusCode = 400;
        throw err;
      }

      // 2. Validate stock and active status
      let subtotal = 0;
      for (const item of cartItems) {
        if (item.is_active !== 1) {
          const err = new Error(`"${item.name}" is no longer available.`);
          err.statusCode = 400;
          throw err;
        }
        if (item.quantity > item.stock) {
          const err = new Error(
            `Insufficient stock for "${item.name}". Requested: ${item.quantity}, Available: ${item.stock}.`
          );
          err.statusCode = 400;
          throw err;
        }
        subtotal += item.quantity * Number(item.price);
      }
      subtotal = Number(subtotal.toFixed(2));

      // 3. Apply coupon if provided
      let discountAmount = 0;
      let appliedCouponCode = null;

      if (coupon_code && typeof coupon_code === 'string' && coupon_code.trim().length > 0) {
        const coupon = await tx.get(
          `SELECT * FROM coupons WHERE code = ? COLLATE NOCASE AND is_active = 1`,
          [coupon_code.trim()]
        );

        if (!coupon) {
          const err = new Error('Invalid or expired coupon code.');
          err.statusCode = 400;
          throw err;
        }

        if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
          const err = new Error('This coupon has expired.');
          err.statusCode = 400;
          throw err;
        }

        if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
          const err = new Error('This coupon has reached its usage limit.');
          err.statusCode = 400;
          throw err;
        }

        if (subtotal < coupon.min_order_amount) {
          const err = new Error(`This coupon requires a minimum order of ₹${Number(coupon.min_order_amount).toFixed(2)}.`);
          err.statusCode = 400;
          throw err;
        }

        if (coupon.discount_type === 'percentage') {
          discountAmount = (subtotal * coupon.discount_value) / 100;
          if (coupon.max_discount && discountAmount > coupon.max_discount) {
            discountAmount = coupon.max_discount;
          }
        } else {
          discountAmount = coupon.discount_value;
        }

        discountAmount = Math.min(discountAmount, subtotal);
        discountAmount = Number(discountAmount.toFixed(2));
        appliedCouponCode = coupon.code;

        // Increment coupon usage count
        await tx.run('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?', [coupon.id]);
      }

      // 4. Calculate GST (18% on amount after discount)
      const taxableAmount = subtotal - discountAmount;
      const gstAmount = Number((taxableAmount * GST_RATE).toFixed(2));

      // 5. Final total
      const totalAmount = Number((taxableAmount + gstAmount).toFixed(2));

      // 6. Create Order record
      const orderInsert = await tx.run(
        `INSERT INTO orders (
           user_id, 
           subtotal,
           discount_amount,
           coupon_code,
           gst_amount,
           total_amount, 
           status, 
           shipping_name, 
           shipping_phone, 
           shipping_address, 
           shipping_city, 
           shipping_pincode, 
           payment_method
         ) VALUES (?, ?, ?, ?, ?, ?, 'Placed', ?, ?, ?, ?, ?, 'Cash on Delivery')`,
        [
          userId,
          subtotal,
          discountAmount,
          appliedCouponCode,
          gstAmount,
          totalAmount,
          shipping_name,
          shipping_phone,
          shipping_address,
          shipping_city,
          shipping_pincode,
        ]
      );

      const orderId = orderInsert.lastID;

      // 7. Insert Order Items and reduce stock
      for (const item of cartItems) {
        await tx.run(
          `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
           VALUES (?, ?, ?, ?)`,
          [orderId, item.product_id, item.quantity, item.price]
        );
        await tx.run(
          'UPDATE products SET stock = stock - ? WHERE id = ?',
          [item.quantity, item.product_id]
        );
      }

      // 8. Clear cart
      await tx.run('DELETE FROM cart_items WHERE user_id = ?', [userId]);

      return { orderId, totalAmount, subtotal, discountAmount, gstAmount, appliedCouponCode, itemCount: cartItems.length };
    });

    // Fetch the complete order
    const order = await get('SELECT * FROM orders WHERE id = ?', [orderResult.orderId]);
    const items = await all(
      `SELECT oi.*, p.name as product_name, p.image_url 
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [orderResult.orderId]
    );

    // Send simulated notifications (fire and forget)
    get('SELECT * FROM users WHERE id = ?', [req.user.id]).then((user) => {
      notifyOrderPlaced(user, order).catch(console.error);
    }).catch(console.error);

    return res.status(201).json({
      success: true,
      message: orderResult.appliedCouponCode
        ? `Order placed! Coupon "${orderResult.appliedCouponCode}" saved you ₹${orderResult.discountAmount}. Total: ₹${orderResult.totalAmount} (incl. 18% GST).`
        : `Order placed successfully! Total: ₹${orderResult.totalAmount} (incl. 18% GST).`,
      order: { ...order, items },
    });
  } catch (err) {
    console.error('Place order error:', err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to place order. Please try again.',
    });
  }
}

/**
 * Get current user's order history
 * GET /api/orders
 */
async function getMyOrders(req, res) {
  try {
    const userId = req.user.id;
    const orders = await all(
      `SELECT 
         o.id,
         o.subtotal,
         o.discount_amount,
         o.coupon_code,
         o.gst_amount,
         o.total_amount,
         o.status,
         o.shipping_name,
         o.shipping_city,
         o.payment_method,
         o.created_at,
         COUNT(oi.id) as total_items
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.user_id = ?
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [userId]
    );
    return res.status(200).json({ success: true, orders });
  } catch (err) {
    console.error('Get my orders error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve order history.' });
  }
}

/**
 * Get single order details with items
 * GET /api/orders/:id
 */
async function getOrderById(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;

    const order = await get('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (user.role !== 'admin' && order.user_id !== user.id) {
      return res.status(403).json({ success: false, message: 'You are not authorized to view this order.' });
    }

    const items = await all(
      `SELECT 
         oi.id,
         oi.product_id,
         oi.quantity,
         oi.unit_price,
         (oi.quantity * oi.unit_price) as line_total,
         p.name as product_name,
         p.image_url,
         c.name as category_name
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE oi.order_id = ?`,
      [id]
    );

    return res.status(200).json({ success: true, order: { ...order, items } });
  } catch (err) {
    console.error('Get order by ID error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve order details.' });
  }
}

/**
 * Cancel order (Customer)
 * POST /api/orders/:id/cancel
 */
async function cancelOrder(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await transaction(async (tx) => {
      const order = await tx.get('SELECT * FROM orders WHERE id = ? AND user_id = ?', [id, userId]);
      if (!order) {
        const err = new Error('Order not found or access denied.');
        err.statusCode = 404;
        throw err;
      }
      if (order.status !== 'Placed') {
        const err = new Error(`Order cannot be cancelled because it is already "${order.status}".`);
        err.statusCode = 400;
        throw err;
      }

      await tx.run('UPDATE orders SET status = "Cancelled" WHERE id = ?', [id]);

      // Restore stock
      const items = await tx.all('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [id]);
      for (const item of items) {
        await tx.run('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);
      }

      // Restore coupon usage if applied
      if (order.coupon_code) {
        await tx.run(
          'UPDATE coupons SET used_count = MAX(0, used_count - 1) WHERE code = ? COLLATE NOCASE',
          [order.coupon_code]
        );
      }
    });

    const cancelledOrder = await get('SELECT * FROM orders WHERE id = ?', [id]);
    const user = await get('SELECT * FROM users WHERE id = ?', [userId]);
    if (user && cancelledOrder) {
      notifyOrderStatusUpdate(user, cancelledOrder, 'Cancelled').catch(console.error);
    }

    return res.status(200).json({
      success: true,
      message: 'Order cancelled successfully. Product stock has been restored.',
    });
  } catch (err) {
    console.error('Cancel order error:', err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to cancel order.',
    });
  }
}

module.exports = { placeOrder, getMyOrders, getOrderById, cancelOrder };
