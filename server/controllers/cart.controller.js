const { all, get, run } = require('../db');

/**
 * Get current user's shopping cart
 * GET /api/cart
 */
async function getCart(req, res) {
  try {
    const userId = req.user.id;

    const sql = `
      SELECT 
        ci.id as cart_item_id,
        ci.quantity,
        ci.created_at as added_at,
        p.id as product_id,
        p.name,
        p.price,
        p.stock,
        p.image_url,
        p.is_active,
        c.name as category_name
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE ci.user_id = ?
      ORDER BY ci.created_at DESC
    `;

    const items = await all(sql, [userId]);

    let grandTotal = 0;
    let totalItems = 0;

    const formattedItems = items.map((item) => {
      const unitPrice = Number(item.price);
      const qty = Number(item.quantity);
      const lineTotal = Number((unitPrice * qty).toFixed(2));
      const isAvailable = item.is_active === 1 && item.stock > 0;
      const exceedsStock = qty > item.stock;

      grandTotal += lineTotal;
      totalItems += qty;

      return {
        ...item,
        price: unitPrice,
        stock: Number(item.stock),
        quantity: qty,
        line_total: lineTotal,
        is_available: isAvailable,
        exceeds_stock: exceedsStock,
      };
    });

    return res.status(200).json({
      success: true,
      cart: {
        items: formattedItems,
        total_items: totalItems,
        grand_total: Number(grandTotal.toFixed(2)),
      },
    });
  } catch (err) {
    console.error('Get cart error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve cart.',
    });
  }
}

/**
 * Add an item to shopping cart
 * POST /api/cart
 * Body: { productId, quantity }
 */
async function addToCart(req, res) {
  try {
    const userId = req.user.id;
    const { productId, quantity = 1 } = req.body;

    const numProdId = parseInt(productId, 10);
    const numQty = parseInt(quantity, 10);

    if (!numProdId || isNaN(numProdId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid product ID is required.',
      });
    }

    if (!numQty || isNaN(numQty) || numQty <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1.',
      });
    }

    // Check product existence and stock
    const product = await get('SELECT id, name, price, stock, is_active FROM products WHERE id = ?', [numProdId]);
    if (!product || product.is_active !== 1) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or unavailable.',
      });
    }

    // PRD-7: Out-of-stock products cannot be added to cart
    if (product.stock <= 0) {
      return res.status(400).json({
        success: false,
        message: `Sorry, "${product.name}" is out of stock.`,
      });
    }

    // Check if product is already in user's cart
    const existing = await get(
      'SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ?',
      [userId, numProdId]
    );

    let newQuantity = numQty;
    if (existing) {
      newQuantity = existing.quantity + numQty;
    }

    // CRT-3: cannot exceed stock
    if (newQuantity > product.stock) {
      return res.status(400).json({
        success: false,
        message: `Cannot add ${numQty} more. Only ${product.stock} units available in stock (you already have ${existing ? existing.quantity : 0} in cart).`,
      });
    }

    if (existing) {
      await run('UPDATE cart_items SET quantity = ? WHERE id = ?', [newQuantity, existing.id]);
    } else {
      await run(
        'INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)',
        [userId, numProdId, newQuantity]
      );
    }

    // Return updated cart summary
    const totalRow = await get(
      'SELECT COALESCE(SUM(quantity), 0) as total_items FROM cart_items WHERE user_id = ?',
      [userId]
    );

    return res.status(200).json({
      success: true,
      message: `"${product.name}" added to cart.`,
      total_items: totalRow ? totalRow.total_items : 0,
    });
  } catch (err) {
    console.error('Add to cart error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to add item to cart.',
    });
  }
}

/**
 * Update quantity of a cart item
 * PUT /api/cart/:itemId
 * Body: { quantity }
 */
async function updateCartItem(req, res) {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;
    const { quantity } = req.body;

    const numQty = parseInt(quantity, 10);
    if (isNaN(numQty) || numQty < 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a non-negative integer.',
      });
    }

    const item = await get(
      `SELECT ci.id, ci.product_id, p.name, p.stock 
       FROM cart_items ci 
       JOIN products p ON ci.product_id = p.id 
       WHERE ci.id = ? AND ci.user_id = ?`,
      [itemId, userId]
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found.',
      });
    }

    // If quantity is 0, remove item
    if (numQty === 0) {
      await run('DELETE FROM cart_items WHERE id = ?', [itemId]);
      return res.status(200).json({
        success: true,
        message: 'Item removed from cart.',
      });
    }

    // Check stock limit
    if (numQty > item.stock) {
      return res.status(400).json({
        success: false,
        message: `Cannot set quantity to ${numQty}. Only ${item.stock} units are currently in stock.`,
      });
    }

    await run('UPDATE cart_items SET quantity = ? WHERE id = ?', [numQty, itemId]);

    return res.status(200).json({
      success: true,
      message: 'Cart updated successfully.',
    });
  } catch (err) {
    console.error('Update cart error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to update cart.',
    });
  }
}

/**
 * Remove an item from cart
 * DELETE /api/cart/:itemId
 */
async function removeCartItem(req, res) {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;

    const existing = await get('SELECT id FROM cart_items WHERE id = ? AND user_id = ?', [itemId, userId]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found.',
      });
    }

    await run('DELETE FROM cart_items WHERE id = ?', [itemId]);

    return res.status(200).json({
      success: true,
      message: 'Item removed from cart.',
    });
  } catch (err) {
    console.error('Remove cart item error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to remove item from cart.',
    });
  }
}

/**
 * Clear all items from cart
 * DELETE /api/cart
 */
async function clearCart(req, res) {
  try {
    const userId = req.user.id;
    await run('DELETE FROM cart_items WHERE user_id = ?', [userId]);

    return res.status(200).json({
      success: true,
      message: 'Cart cleared successfully.',
    });
  } catch (err) {
    console.error('Clear cart error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to clear cart.',
    });
  }
}

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
};
