const { all, get, run, transaction } = require('../db');
const { notifyOrderStatusUpdate } = require('../services/notification.service');

/**
 * Get Admin Dashboard Statistics
 * GET /api/admin/stats
 */
async function getDashboardStats(req, res) {
  try {
    // 1. Total products
    const prodRow = await get('SELECT COUNT(*) as total_products FROM products WHERE is_active = 1');

    // 2. Total orders
    const orderRow = await get('SELECT COUNT(*) as total_orders FROM orders');

    // 3. Total customers (role = 'customer')
    const userRow = await get('SELECT COUNT(*) as total_customers FROM users WHERE role = "customer"');

    // 4. Total revenue (sum of non-cancelled orders)
    const revRow = await get('SELECT COALESCE(SUM(total_amount), 0) as total_revenue FROM orders WHERE status != "Cancelled"');

    // 5. Low stock products (stock < 5)
    const lowStockRow = await get('SELECT COUNT(*) as low_stock_count FROM products WHERE stock < 5 AND is_active = 1');

    // 6. Orders by status distribution
    const statusCounts = await all(`
      SELECT status, COUNT(*) as count 
      FROM orders 
      GROUP BY status
    `);

    // 7. Sales by Category (for Chart.js visualization)
    const categorySales = await all(`
      SELECT 
        c.name as category,
        COALESCE(SUM(CASE WHEN o.id IS NOT NULL THEN oi.quantity * oi.unit_price ELSE 0 END), 0) as sales
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id
      LEFT JOIN order_items oi ON oi.product_id = p.id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.status != 'Cancelled'
      GROUP BY c.id
      ORDER BY sales DESC
    `);

    // 8. Recent 5 orders with customer name
    const recentOrders = await all(`
      SELECT 
        o.id,
        o.total_amount,
        o.status,
        o.payment_method,
        o.created_at,
        u.name as customer_name,
        u.email as customer_email
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
      LIMIT 5
    `);

    return res.status(200).json({
      success: true,
      stats: {
        total_products: prodRow ? prodRow.total_products : 0,
        total_orders: orderRow ? orderRow.total_orders : 0,
        total_customers: userRow ? userRow.total_customers : 0,
        total_revenue: revRow ? Number(revRow.total_revenue) : 0,
        low_stock_count: lowStockRow ? lowStockRow.low_stock_count : 0,
        status_distribution: statusCounts,
        category_sales: categorySales,
        recent_orders: recentOrders,
      },
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve admin statistics.',
    });
  }
}

/**
 * View all orders with customer details
 * GET /api/admin/orders
 */
async function getAllOrders(req, res) {
  try {
    const { status, search } = req.query;
    const conditions = [];
    const params = [];

    if (status && status !== 'all') {
      conditions.push('o.status = ?');
      params.push(status);
    }

    if (search && search.trim()) {
      conditions.push('(o.id LIKE ? OR u.name LIKE ? OR u.email LIKE ? OR o.shipping_phone LIKE ?)');
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const orders = await all(
      `SELECT 
         o.id,
         o.user_id,
         o.total_amount,
         o.status,
         o.shipping_name,
         o.shipping_phone,
         o.shipping_address,
         o.shipping_city,
         o.shipping_pincode,
         o.payment_method,
         o.created_at,
         u.name as customer_name,
         u.email as customer_email,
         COUNT(oi.id) as item_count
       FROM orders o
       JOIN users u ON o.user_id = u.id
       LEFT JOIN order_items oi ON oi.order_id = o.id
       ${whereClause}
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      params
    );

    return res.status(200).json({
      success: true,
      orders,
    });
  } catch (err) {
    console.error('Admin get orders error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve orders.',
    });
  }
}

/**
 * Update order status
 * PATCH /api/admin/orders/:id/status
 * Body: { status }
 */
async function updateOrderStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Placed', 'Shipped', 'Delivered', 'Cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const transition = await transaction(async (tx) => {
      const order = await tx.get('SELECT * FROM orders WHERE id = ?', [id]);
      if (!order) {
        const err = new Error('Order not found.');
        err.statusCode = 404;
        throw err;
      }

      const allowedTransitions = {
        Placed: ['Placed', 'Shipped', 'Cancelled'],
        Shipped: ['Shipped', 'Delivered'],
        Delivered: ['Delivered'],
        Cancelled: ['Cancelled'],
      };
      if (!allowedTransitions[order.status]?.includes(status)) {
        const err = new Error(`Order cannot move from "${order.status}" to "${status}".`);
        err.statusCode = 400;
        throw err;
      }

      if (order.status !== status) {
        if (status === 'Cancelled') {
          const items = await tx.all('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [id]);
          for (const item of items) {
            await tx.run('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);
          }
          if (order.coupon_code) {
            await tx.run(
              'UPDATE coupons SET used_count = MAX(0, used_count - 1) WHERE code = ? COLLATE NOCASE',
              [order.coupon_code]
            );
          }
        }
        await tx.run('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
      }

      return { changed: order.status !== status, order: await tx.get('SELECT * FROM orders WHERE id = ?', [id]) };
    });

    // Send status update notification after the order transition commits.
    if (transition.changed && ['Shipped', 'Delivered', 'Cancelled'].includes(status)) {
      get('SELECT * FROM users WHERE id = ?', [transition.order.user_id]).then((user) => {
        if (user) notifyOrderStatusUpdate(user, transition.order, status).catch(console.error);
      }).catch(console.error);
    }

    return res.status(200).json({
      success: true,
      message: transition.changed
        ? `Order #${id} status updated to "${status}".`
        : `Order #${id} is already "${status}".`,
      order: transition.order,
    });
  } catch (err) {
    console.error('Update order status error:', err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to update order status.',
    });
  }
}

/**
 * Get products that have low stock (stock < 5)
 * GET /api/admin/low-stock
 */
async function getLowStockProducts(req, res) {
  try {
    const products = await all(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.stock < 5 AND p.is_active = 1
      ORDER BY p.stock ASC
    `);

    return res.status(200).json({
      success: true,
      products,
    });
  } catch (err) {
    console.error('Get low stock error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve low-stock products.',
    });
  }
}

/**
 * Get notification logs (Admin only)
 * GET /api/admin/notifications
 */
async function getNotificationLogs(req, res) {
  try {
    const logs = await all(`
      SELECT n.*, u.name as user_name, u.email as user_email
      FROM notifications n
      JOIN users u ON n.user_id = u.id
      ORDER BY n.sent_at DESC
      LIMIT 100
    `);
    return res.status(200).json({ success: true, notifications: logs });
  } catch (err) {
    console.error('Get notifications error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve notifications.' });
  }
}

module.exports = {
  getDashboardStats,
  getAllOrders,
  updateOrderStatus,
  getLowStockProducts,
  getNotificationLogs,
};
