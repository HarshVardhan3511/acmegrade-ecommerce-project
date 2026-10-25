const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initDatabase } = require('./db');
const upload = require('./middleware/upload');

// Route imports
const authRoutes = require('./routes/auth.routes');
const categoryRoutes = require('./routes/category.routes');
const productRoutes = require('./routes/product.routes');
const cartRoutes = require('./routes/cart.routes');
const orderRoutes = require('./routes/order.routes');
const adminRoutes = require('./routes/admin.routes');
const wishlistRoutes = require('./routes/wishlist.routes');
const couponRoutes = require('./routes/coupon.routes');

const app = express();
const PORT = process.env.PORT || 5000;

// Core Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files from 'public' directory
app.use(express.static(path.join(__dirname, '../public')));
// Product uploads can live on a mounted persistent volume in cloud deployments.
app.use('/uploads', express.static(upload.uploadDir, { maxAge: '30d', immutable: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/coupons', couponRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    appName: 'ShopEasy E-Commerce API',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler for unmatched API routes
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint ${req.method} ${req.originalUrl} not found.`,
  });
});

// Fallback to index.html for unknown web page routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);

  // Handle Multer upload errors
  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`,
    });
  }

  // Handle custom validation or syntax errors
  if (err.status === 400 || err.statusCode === 400) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Bad request.',
    });
  }

  return res.status(500).json({
    success: false,
    message: err.message || 'Internal server error.',
  });
});

// Start server
async function startServer() {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`===============================================`);
      console.log(`  ShopEasy E-Commerce Server is running!       `);
      console.log(`  Port:      ${PORT}                            `);
      console.log(`  URL:       http://localhost:${PORT}          `);
      console.log(`  API Base:  http://localhost:${PORT}/api      `);
      console.log(`  Admin UI:  http://localhost:${PORT}/admin/dashboard.html `);
      console.log(`===============================================`);
    });
  } catch (err) {
    console.error('Failed to initialize server:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
