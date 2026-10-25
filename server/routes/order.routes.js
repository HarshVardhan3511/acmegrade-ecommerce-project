const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const invoiceController = require('../controllers/invoice.controller');
const { authenticate } = require('../middleware/auth');
const { validateCheckout } = require('../middleware/validate');

// Authenticated customer/admin order routes
router.use(authenticate);

router.post('/', validateCheckout, orderController.placeOrder);
router.get('/', orderController.getMyOrders);
router.get('/:id', orderController.getOrderById);
router.get('/:id/invoice', invoiceController.getInvoice);
router.post('/:id/cancel', orderController.cancelOrder);

module.exports = router;
