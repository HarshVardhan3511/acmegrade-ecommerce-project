const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const couponController = require('../controllers/coupon.controller');
const { authenticate } = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');

// All admin routes require authentication and admin role
router.use(authenticate, adminOnly);

router.get('/stats', adminController.getDashboardStats);
router.get('/orders', adminController.getAllOrders);
router.patch('/orders/:id/status', adminController.updateOrderStatus);
router.get('/low-stock', adminController.getLowStockProducts);

// Coupon management routes
router.get('/coupons', couponController.getAllCoupons);
router.post('/coupons', couponController.createCoupon);
router.patch('/coupons/:id/toggle', couponController.toggleCoupon);
router.delete('/coupons/:id', couponController.deleteCoupon);

// Notification logs
router.get('/notifications', adminController.getNotificationLogs);

module.exports = router;
