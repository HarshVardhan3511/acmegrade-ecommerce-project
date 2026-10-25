-- ShopEasy E-Commerce Schema (SQLite)
PRAGMA foreign_keys = ON;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'customer' CHECK(role IN ('customer', 'admin')),
    phone TEXT,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Products Table
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL CHECK(price >= 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0),
    image_url TEXT,
    is_active INTEGER DEFAULT 1 CHECK(is_active IN (0, 1)),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Cart Items Table
CREATE TABLE IF NOT EXISTS cart_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK(quantity > 0),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id)
);

-- 5. Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subtotal REAL NOT NULL DEFAULT 0 CHECK(subtotal >= 0),
    discount_amount REAL NOT NULL DEFAULT 0 CHECK(discount_amount >= 0),
    coupon_code TEXT DEFAULT NULL,
    total_amount REAL NOT NULL CHECK(total_amount >= 0),
    status TEXT DEFAULT 'Placed' CHECK(status IN ('Placed', 'Shipped', 'Delivered', 'Cancelled')),
    shipping_name TEXT NOT NULL,
    shipping_phone TEXT NOT NULL,
    shipping_address TEXT NOT NULL,
    shipping_city TEXT NOT NULL,
    shipping_pincode TEXT NOT NULL,
    payment_method TEXT DEFAULT 'Cash on Delivery',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL CHECK(quantity > 0),
    unit_price REAL NOT NULL CHECK(unit_price >= 0)
);

-- 7. Wishlist Table (Bonus Feature)
CREATE TABLE IF NOT EXISTS wishlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id)
);

-- 8. Reviews Table (Bonus Feature)
CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 9. Coupons Table
CREATE TABLE IF NOT EXISTS coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL COLLATE NOCASE,
    discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK(discount_type IN ('percentage', 'flat')),
    discount_value REAL NOT NULL CHECK(discount_value > 0),
    min_order_amount REAL NOT NULL DEFAULT 0,
    max_uses INTEGER DEFAULT NULL,
    used_count INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
    expires_at DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 10. Notifications Table (simulated email/SMS log)
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK(type IN ('email', 'sms')),
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_cart_user ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_order ON notifications(order_id);
