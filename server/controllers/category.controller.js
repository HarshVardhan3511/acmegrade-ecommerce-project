const { all, get, run } = require('../db');

/**
 * List all categories with product counts
 * GET /api/categories
 */
async function getAllCategories(req, res) {
  try {
    const categories = await all(`
      SELECT 
        c.id, 
        c.name, 
        c.description, 
        c.created_at,
        COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
      GROUP BY c.id
      ORDER BY c.name ASC
    `);

    return res.status(200).json({
      success: true,
      categories,
    });
  } catch (err) {
    console.error('Get categories error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve categories.',
    });
  }
}

/**
 * Get category by ID
 * GET /api/categories/:id
 */
async function getCategoryById(req, res) {
  try {
    const { id } = req.params;
    const category = await get('SELECT * FROM categories WHERE id = ?', [id]);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found.',
      });
    }

    return res.status(200).json({
      success: true,
      category,
    });
  } catch (err) {
    console.error('Get category error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve category.',
    });
  }
}

/**
 * Create new category (Admin)
 * POST /api/categories
 */
async function createCategory(req, res) {
  try {
    const { name, description } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required.',
      });
    }

    const existing = await get('SELECT id FROM categories WHERE LOWER(name) = LOWER(?)', [name.trim()]);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A category with this name already exists.',
      });
    }

    const result = await run(
      'INSERT INTO categories (name, description) VALUES (?, ?)',
      [name.trim(), description ? description.trim() : null]
    );

    const category = await get('SELECT * FROM categories WHERE id = ?', [result.lastID]);

    return res.status(201).json({
      success: true,
      message: 'Category created successfully.',
      category,
    });
  } catch (err) {
    console.error('Create category error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to create category.',
    });
  }
}

/**
 * Update category (Admin)
 * PUT /api/categories/:id
 */
async function updateCategory(req, res) {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const existing = await get('SELECT * FROM categories WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Category not found.',
      });
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required.',
      });
    }

    // Check duplicate name
    const duplicate = await get(
      'SELECT id FROM categories WHERE LOWER(name) = LOWER(?) AND id != ?',
      [name.trim(), id]
    );
    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: 'Another category with this name already exists.',
      });
    }

    await run(
      'UPDATE categories SET name = ?, description = ? WHERE id = ?',
      [name.trim(), description !== undefined ? (description ? description.trim() : null) : existing.description, id]
    );

    const updated = await get('SELECT * FROM categories WHERE id = ?', [id]);

    return res.status(200).json({
      success: true,
      message: 'Category updated successfully.',
      category: updated,
    });
  } catch (err) {
    console.error('Update category error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to update category.',
    });
  }
}

/**
 * Delete category (Admin)
 * DELETE /api/categories/:id
 */
async function deleteCategory(req, res) {
  try {
    const { id } = req.params;

    const existing = await get('SELECT * FROM categories WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Category not found.',
      });
    }

    // Check if category has products
    const prodCount = await get('SELECT COUNT(*) as count FROM products WHERE category_id = ?', [id]);
    if (prodCount && prodCount.count > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category because it contains ${prodCount.count} products. Move or delete them first.`,
      });
    }

    await run('DELETE FROM categories WHERE id = ?', [id]);

    return res.status(200).json({
      success: true,
      message: 'Category deleted successfully.',
    });
  } catch (err) {
    console.error('Delete category error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete category.',
    });
  }
}

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
