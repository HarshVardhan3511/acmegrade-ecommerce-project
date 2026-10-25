const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { authenticate, optionalAuth } = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');
const upload = require('../middleware/upload');
const { validateProduct } = require('../middleware/validate');

// Public routes
router.get('/', optionalAuth, productController.getProducts);
router.get('/:id', optionalAuth, productController.getProductById);

// Authenticated reviews (Bonus)
router.post('/:id/reviews', authenticate, productController.addProductReview);

// Admin-only routes (with optional multer upload)
router.post(
  '/',
  authenticate,
  adminOnly,
  upload.single('image'),
  validateProduct,
  productController.createProduct
);

router.put(
  '/:id',
  authenticate,
  adminOnly,
  upload.single('image'),
  productController.updateProduct
);

router.delete('/:id', authenticate, adminOnly, productController.deleteProduct);

module.exports = router;
