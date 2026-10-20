const { all, get, run, transaction } = require('../db');

/**
 * Place a new order from current cart
 * POST /api/orders
 * Uses SQLite transaction for atomicity: verifies stock, inserts order & items, decrements stock, clears cart.
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
    } = req.body;

    // Execute order creation within a safe database transaction
    const orderResult = await transaction(async (tx) => {
      // 1. Fetch current cart items with latest product prices and stocks
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

      // 2. Validate stock and active status for every item
      let totalAmount = 0;
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

        totalAmount += item.quantity * Number(item.price);
      }

      totalAmount = Number(totalAmount.toFixed(2));

      // 3. Create Order record
      const orderInsert = await tx.run(
        `INSERT INTO orders (
           user_id, 
           total_amount, 
           status, 
           shipping_name, 
           shipping_phone, 
           shipping_address, 
           shipping_city, 
           shipping_pincode, 
           payment_method
         ) VALUES (?, ?, 'Placed', ?, ?, ?, ?, ?, 'Cash on Delivery')`,
        [
          userId,
          totalAmount,
          shipping_name,
          shipping_phone,
          shipping_address,
          shipping_city,
          shipping_pincode,
        ]
      );

      const orderId = orderInsert.lastID;

      // 4. Insert Order Items and reduce product stocks
      for (const item of cartItems) {
        await tx.run(
          `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
           VALUES (?, ?, ?, ?)`,
          [orderId, item.product_id, item.quantity, item.price]
        );

        // Deduct product stock
        await tx.run(
          'UPDATE products SET stock = stock - ? WHERE id = ?',
          [item.quantity, item.product_id]
        );
      }

      // 5. Empty user's cart
      await tx.run('DELETE FROM cart_items WHERE user_id = ?', [userId]);

      return { orderId, totalAmount, itemCount: cartItems.length };
    });

    // Fetch the newly created order with full details
    const order = await get('SELECT * FROM orders WHERE id = ?', [orderResult.orderId]);
    const items = await all(
      `SELECT oi.*, p.name as product_name, p.image_url 
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [orderResult.orderId]
    );

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully with Cash on Delivery!',
      order: {
        ...order,
        items,
      },
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

    return res.status(200).json({
      success: true,
      orders,
    });
  } catch (err) {
    console.error('Get my orders error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve order history.',
    });
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
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    // Role check: Only the customer who placed the order or an Admin can view it
    if (user.role !== 'admin' && order.user_id !== user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view this order.',
      });
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

    return res.status(200).json({
      success: true,
      order: {
        ...order,
        items,
      },
    });
  } catch (err) {
    console.error('Get order by ID error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve order details.',
    });
  }
}

/**
 * Cancel order (Customer ORD-6)
 * POST /api/orders/:id/cancel
 * Customers can cancel an order if status is "Placed". Restores stock in transaction.
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

      // Update status to Cancelled
      await tx.run('UPDATE orders SET status = "Cancelled" WHERE id = ?', [id]);

      // Restore stock for all items in the order
      const items = await tx.all('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [id]);
      for (const item of items) {
        await tx.run('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);
      }
    });

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

module.exports = {
  placeOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
};
