const { all, get, run } = require('../db');

/**
 * List products with search, category filtering, sorting, and pagination
 * GET /api/products
 * Query params: search, category, sort, page, limit
 */
async function getProducts(req, res) {
  try {
    const {
      search,
      category,
      sort,
      page = 1,
      limit = 8,
      includeInactive = false,
    } = req.query;

    const showInactive = includeInactive === true || includeInactive === 'true';
    if (showInactive && req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access is required to view inactive products.' });
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 8));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    const params = [];

    // Filter active products unless admin specifically requests all
    if (!showInactive) {
      conditions.push('p.is_active = 1');
    }

    // Search query (partial match on product name or description)
    if (search && search.trim()) {
      conditions.push('(p.name LIKE ? OR p.description LIKE ?)');
      const term = `%${search.trim()}%`;
      params.push(term, term);
    }

    // Category filter (by ID or Category name)
    if (category) {
      if (!isNaN(Number(category))) {
        conditions.push('p.category_id = ?');
        params.push(Number(category));
      } else {
        conditions.push('LOWER(c.name) = LOWER(?)');
        params.push(category.trim());
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Sorting
    let orderBy = 'p.created_at DESC';
    if (sort === 'price_asc' || sort === 'low_to_high') {
      orderBy = 'p.price ASC';
    } else if (sort === 'price_desc' || sort === 'high_to_low') {
      orderBy = 'p.price DESC';
    } else if (sort === 'name_asc') {
      orderBy = 'p.name ASC';
    } else if (sort === 'newest') {
      orderBy = 'p.created_at DESC';
    }

    // Total count for pagination
    const countSql = `
      SELECT COUNT(*) as total
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereClause}
    `;
    const countResult = await get(countSql, params);
    const total = countResult ? countResult.total : 0;
    const totalPages = Math.ceil(total / limitNum) || 1;

    // Fetch paginated products with category info
    const dataSql = `
      SELECT 
        p.id,
        p.category_id,
        p.name,
        p.description,
        p.price,
        p.stock,
        p.image_url,
        p.is_active,
        p.created_at,
        c.name as category_name,
        COALESCE(AVG(r.rating), 0) as avg_rating,
        COUNT(r.id) as review_count
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN reviews r ON r.product_id = p.id
      ${whereClause}
      GROUP BY p.id
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;

    const queryParams = [...params, limitNum, offset];
    const products = await all(dataSql, queryParams);

    // Format products
    const formatted = products.map((prod) => ({
      ...prod,
      price: Number(prod.price),
      stock: Number(prod.stock),
      avg_rating: Number(Number(prod.avg_rating).toFixed(1)),
      review_count: Number(prod.review_count),
      in_stock: prod.stock > 0,
      is_low_stock: prod.stock > 0 && prod.stock < 5,
    }));

    return res.status(200).json({
      success: true,
      products: formatted,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
      },
    });
  } catch (err) {
    console.error('Get products error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve products.',
    });
  }
}

/**
 * Get product details by ID
 * GET /api/products/:id
 */
async function getProductById(req, res) {
  try {
    const { id } = req.params;

    const sql = `
      SELECT 
        p.id,
        p.category_id,
        p.name,
        p.description,
        p.price,
        p.stock,
        p.image_url,
        p.is_active,
        p.created_at,
        c.name as category_name,
        COALESCE(AVG(r.rating), 0) as avg_rating,
        COUNT(r.id) as review_count
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN reviews r ON r.product_id = p.id
      WHERE p.id = ?
      GROUP BY p.id
    `;

    const product = await get(sql, [id]);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    if (product.is_active !== 1 && req.user?.role !== 'admin') {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    // Fetch recent reviews for this product
    const reviews = await all(
      `SELECT r.id, r.rating, r.comment, r.created_at, u.name as user_name 
       FROM reviews r 
       JOIN users u ON r.user_id = u.id 
       WHERE r.product_id = ? 
       ORDER BY r.created_at DESC LIMIT 10`,
      [id]
    );

    return res.status(200).json({
      success: true,
      product: {
        ...product,
        price: Number(product.price),
        stock: Number(product.stock),
        avg_rating: Number(Number(product.avg_rating).toFixed(1)),
        review_count: Number(product.review_count),
        in_stock: product.stock > 0,
        is_low_stock: product.stock > 0 && product.stock < 5,
        reviews,
      },
    });
  } catch (err) {
    console.error('Get product by ID error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve product details.',
    });
  }
}

/**
 * Create product (Admin)
 * POST /api/products
 */
async function createProduct(req, res) {
  try {
    const { name, category_id, description, price, stock, is_active } = req.body;
    let image_url = req.body.image_url;

    // Check if image file was uploaded via Multer
    if (req.file) {
      image_url = `/uploads/${req.file.filename}`;
    }

    // Verify category exists
    const category = await get('SELECT id FROM categories WHERE id = ?', [category_id]);
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID specified.',
      });
    }

    const result = await run(
      `INSERT INTO products (category_id, name, description, price, stock, image_url, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        category_id,
        name,
        description || null,
        price,
        stock,
        image_url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
        is_active !== undefined ? (is_active ? 1 : 0) : 1,
      ]
    );

    const created = await get('SELECT * FROM products WHERE id = ?', [result.lastID]);

    return res.status(201).json({
      success: true,
      message: 'Product created successfully.',
      product: created,
    });
  } catch (err) {
    console.error('Create product error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to create product.',
    });
  }
}

/**
 * Update product (Admin)
 * PUT /api/products/:id
 */
async function updateProduct(req, res) {
  try {
    const { id } = req.params;
    const { name, category_id, description, price, stock, is_active } = req.body;
    let image_url = req.body.image_url;

    const existing = await get('SELECT * FROM products WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    // Check uploaded file
    if (req.file) {
      image_url = `/uploads/${req.file.filename}`;
    }

    // Category validation
    if (category_id) {
      const cat = await get('SELECT id FROM categories WHERE id = ?', [category_id]);
      if (!cat) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category ID.',
        });
      }
    }

    await run(
      `UPDATE products 
       SET category_id = COALESCE(?, category_id),
           name = COALESCE(?, name),
           description = COALESCE(?, description),
           price = COALESCE(?, price),
           stock = COALESCE(?, stock),
           image_url = COALESCE(?, image_url),
           is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [
        category_id !== undefined ? category_id : null,
        name !== undefined ? name : null,
        description !== undefined ? description : null,
        price !== undefined ? price : null,
        stock !== undefined ? stock : null,
        image_url !== undefined ? image_url : null,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        id,
      ]
    );

    const updated = await get('SELECT * FROM products WHERE id = ?', [id]);

    return res.status(200).json({
      success: true,
      message: 'Product updated successfully.',
      product: updated,
    });
  } catch (err) {
    console.error('Update product error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to update product.',
    });
  }
}

/**
 * Delete product (Admin)
 * DELETE /api/products/:id
 */
async function deleteProduct(req, res) {
  try {
    const { id } = req.params;
    const { permanent } = req.query;

    const existing = await get('SELECT * FROM products WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    if (permanent === 'true') {
      // Check if product is in order_items
      const orderItem = await get('SELECT id FROM order_items WHERE product_id = ? LIMIT 1', [id]);
      if (orderItem) {
        // Soft delete/deactivate instead to preserve historical order records
        await run('UPDATE products SET is_active = 0 WHERE id = ?', [id]);
        return res.status(200).json({
          success: true,
          message: 'Product is linked to previous customer orders. It has been deactivated instead of deleted.',
        });
      }
      await run('DELETE FROM products WHERE id = ?', [id]);
      return res.status(200).json({
        success: true,
        message: 'Product permanently deleted.',
      });
    } else {
      // Default: soft delete / deactivate
      await run('UPDATE products SET is_active = 0 WHERE id = ?', [id]);
      return res.status(200).json({
        success: true,
        message: 'Product deactivated successfully.',
      });
    }
  } catch (err) {
    console.error('Delete product error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete product.',
    });
  }
}

/**
 * Add product review (Bonus)
 * POST /api/products/:id/reviews
 */
async function addProductReview(req, res) {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id;

    const numRating = parseInt(rating, 10);
    if (!numRating || numRating < 1 || numRating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be an integer between 1 and 5.',
      });
    }

    const product = await get('SELECT id FROM products WHERE id = ?', [id]);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    await run(
      'INSERT INTO reviews (user_id, product_id, rating, comment) VALUES (?, ?, ?, ?)',
      [userId, id, numRating, comment ? comment.trim() : null]
    );

    return res.status(201).json({
      success: true,
      message: 'Review submitted successfully!',
    });
  } catch (err) {
    console.error('Review error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to add review.',
    });
  }
}

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  addProductReview,
};
