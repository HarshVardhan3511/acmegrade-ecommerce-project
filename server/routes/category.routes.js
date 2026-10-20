const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const { authenticate } = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');

// Public endpoints
router.get('/', categoryController.getAllCategories);
router.get('/:id', categoryController.getCategoryById);

// Admin-protected endpoints
router.post('/', authenticate, adminOnly, categoryController.createCategory);
router.put('/:id', authenticate, adminOnly, categoryController.updateCategory);
router.delete('/:id', authenticate, adminOnly, categoryController.deleteCategory);

module.exports = router;
