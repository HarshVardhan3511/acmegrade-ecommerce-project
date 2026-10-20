const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlist.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', wishlistController.getWishlist);
router.post('/:productId', wishlistController.toggleWishlist);

module.exports = router;
