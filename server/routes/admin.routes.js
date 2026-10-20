const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate } = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');

// All admin routes require authentication and admin role
router.use(authenticate, adminOnly);

router.get('/stats', adminController.getDashboardStats);
router.get('/orders', adminController.getAllOrders);
router.patch('/orders/:id/status', adminController.updateOrderStatus);
router.get('/low-stock', adminController.getLowStockProducts);

module.exports = router;
