const express = require('express');
const router = express.Router();
const couponController = require('../controllers/coupon.controller');
const { authenticate } = require('../middleware/auth');

// Public: validate a coupon (must be logged in)
router.post('/validate', authenticate, couponController.validateCoupon);

module.exports = router;
