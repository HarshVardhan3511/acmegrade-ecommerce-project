const { all, get, run } = require('../db');

/**
 * Get current user's wishlist
 * GET /api/wishlist
 */
async function getWishlist(req, res) {
  try {
    const userId = req.user.id;

    const items = await all(
      `SELECT 
         w.id as wishlist_id,
         w.created_at as added_at,
         p.id as product_id,
         p.name,
         p.price,
         p.stock,
         p.image_url,
         c.name as category_name
       FROM wishlist w
       JOIN products p ON w.product_id = p.id
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE w.user_id = ?
       ORDER BY w.created_at DESC`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      items,
    });
  } catch (err) {
    console.error('Wishlist error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve wishlist.',
    });
  }
}

/**
 * Toggle item in wishlist (Add if not present, Remove if present)
 * POST /api/wishlist/:productId
 */
async function toggleWishlist(req, res) {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    const product = await get('SELECT id, name FROM products WHERE id = ?', [productId]);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    const existing = await get(
      'SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?',
      [userId, productId]
    );

    if (existing) {
      await run('DELETE FROM wishlist WHERE id = ?', [existing.id]);
      return res.status(200).json({
        success: true,
        is_wishlisted: false,
        message: `Removed "${product.name}" from wishlist.`,
      });
    } else {
      await run(
        'INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)',
        [userId, productId]
      );
      return res.status(200).json({
        success: true,
        is_wishlisted: true,
        message: `Added "${product.name}" to wishlist.`,
      });
    }
  } catch (err) {
    console.error('Toggle wishlist error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to update wishlist.',
    });
  }
}

module.exports = {
  getWishlist,
  toggleWishlist,
};
