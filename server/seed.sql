-- ShopEasy Seed Data
-- Users
-- Passwords:
-- Admin: admin@shopeasy.com / admin123
-- Customer: customer@shopeasy.com / customer123
INSERT OR IGNORE INTO users (id, name, email, password_hash, role, phone, address) VALUES
(1, 'Admin Manager', 'admin@shopeasy.com', '$2b$10$764RC/ceenLUlXNO35WZFOfnIoXTV1nuZhReS7p/hNsGTJHrLnTXm', 'admin', '9876543210', '100 Tech Park, Suite 4B, Bangalore'),
(2, 'John Doe', 'customer@shopeasy.com', '$2b$10$FoTez23e9nzdE0XVeiodpuSFYFMqsHxhdycA9y0wCB1wBMpYXdq5G', 'customer', '9812345678', '42 Palm Grove Avenue, Indiranagar, Bangalore');

-- Categories (5 categories)
INSERT OR IGNORE INTO categories (id, name, description) VALUES
(1, 'Electronics', 'Smartphones, laptops, accessories, and modern gadgets'),
(2, 'Fashion & Apparel', 'Trendy clothing, stylish footwear, and lifestyle wear'),
(3, 'Home & Kitchen', 'Modern cookware, home decor, and essential appliances'),
(4, 'Books & Stationery', 'Bestsellers, self-improvement, notebooks, and pens'),
(5, 'Fitness & Sports', 'Workout gear, dumbbells, yoga mats, and activewear');

-- Products (16 products, covering in-stock, low-stock <5, and out-of-stock = 0)
INSERT OR IGNORE INTO products (id, category_id, name, description, price, stock, image_url, is_active) VALUES
(1, 1, 'Wireless Noise-Canceling Headphones', 'Premium over-ear Bluetooth headphones with active noise cancellation, 30h battery life, and crystal-clear acoustic fidelity.', 2499.00, 25, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80', 1),
(2, 1, 'Mechanical RGB Gaming Keyboard', 'Tactile blue mechanical switches with per-key customizable RGB backlighting, aircraft-grade aluminum frame, and detachable braided USB-C cable.', 1899.00, 15, 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80', 1),
(3, 1, 'Ultra-Slim Smartwatch Pro', 'Vibrant AMOLED touchscreen display, 24/7 heart-rate and SpO2 tracking, 5ATM water resistance, and 7-day battery life.', 3299.00, 4, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80', 1), -- Low stock (<5)
(4, 1, 'Portable Bluetooth Speaker', 'Compact waterproof outdoor speaker with deep bass, 360-degree surround sound, and 12-hour continuous playtime.', 1199.00, 30, 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&auto=format&fit=crop&q=80', 1),
(5, 2, 'Classic Denim Jacket', 'Timeless indigo denim trucker jacket crafted from 100% durable cotton with tailored regular fit and buttoned flap pockets.', 1499.00, 18, 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=600&auto=format&fit=crop&q=80', 1),
(6, 2, 'Minimalist Leather Sneakers', 'Handcrafted white leather low-top sneakers featuring cushioned memory foam insoles and vulcanized rubber outsoles.', 2199.00, 10, 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&auto=format&fit=crop&q=80', 1),
(7, 2, 'Vintage Aviator Sunglasses', 'Polarized UV400 protective lenses with lightweight metallic frames, offering optimal clarity and signature style.', 799.00, 2, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600&auto=format&fit=crop&q=80', 1), -- Low stock (<5)
(8, 2, 'Thermal Fleece Hoodie', 'Ultra-soft fleece pullover hoodie with kangaroo pocket, double-lined hood, and ribbed cuffs for maximum warmth.', 999.00, 0, 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&auto=format&fit=crop&q=80', 1), -- Out of stock (0)
(9, 3, 'Cast Iron Dutch Oven 5.5Qt', 'Enameled heavy-duty cast iron pot ideal for slow cooking, baking artisan sourdough bread, braising, and hearty stews.', 2799.00, 8, 'https://images.unsplash.com/photo-1584990347449-39908cfdfdbf?w=600&auto=format&fit=crop&q=80', 1),
(10, 3, 'Ceramic Pour-Over Coffee Dripper', 'Handcrafted matte ceramic coffee maker set including glass carafe and measuring spoon for barista-style drip brews.', 649.00, 22, 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80', 1),
(11, 3, 'Aroma Ultrasonic Diffuser', 'Sleek wood-grain ultrasonic essential oil diffuser with 7 ambient color lights and whisper-quiet mist modes.', 899.00, 14, 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=600&auto=format&fit=crop&q=80', 1),
(12, 4, 'Hardcover Dot Grid Journal', 'Thick 160gsm bleed-proof bamboo paper notebook with elastic closure, pen loop, ribbon bookmarks, and inner pocket.', 449.00, 35, 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80', 1),
(13, 4, 'Executive Brass Rollerball Pen', 'Weighted balanced brass pen body with smooth 0.5mm gel ink refill and textured grip for effortless writing.', 349.00, 3, 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=600&auto=format&fit=crop&q=80', 1), -- Low stock (<5)
(14, 4, 'Atomic Habits & Mindset Masterclass', 'Inspiring collection of modern productivity literature and practical systems for continuous self-improvement.', 599.00, 40, 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop&q=80', 1),
(15, 5, 'Adjustable Neoprene Dumbbell Set', 'Ergonomic non-slip hex dumbbells set (2kg to 10kg) with durable cast iron core for home resistance workouts.', 1799.00, 12, 'https://images.unsplash.com/photo-1586401100295-7a8096fd231a?w=600&auto=format&fit=crop&q=80', 1),
(16, 5, 'Eco-Friendly Non-Slip Yoga Mat', 'Extra-thick 6mm TPE dual-layer exercise mat with alignment guides, moisture resistance, and carrying strap.', 849.00, 16, 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=600&auto=format&fit=crop&q=80', 1);

-- Sample Initial Orders for Customer (to demonstrate order history & dashboard stats)
INSERT OR IGNORE INTO orders (id, user_id, total_amount, status, shipping_name, shipping_phone, shipping_address, shipping_city, shipping_pincode, payment_method, created_at) VALUES
(1001, 2, 2499.00, 'Delivered', 'John Doe', '9812345678', '42 Palm Grove Avenue, Indiranagar', 'Bangalore', '560038', 'Cash on Delivery', datetime('now', '-7 days')),
(1002, 2, 1948.00, 'Shipped', 'John Doe', '9812345678', '42 Palm Grove Avenue, Indiranagar', 'Bangalore', '560038', 'Cash on Delivery', datetime('now', '-2 days')),
(1003, 2, 849.00, 'Placed', 'John Doe', '9812345678', '42 Palm Grove Avenue, Indiranagar', 'Bangalore', '560038', 'Cash on Delivery', datetime('now', '-1 hours'));

-- Order items for sample orders
INSERT OR IGNORE INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES
(1, 1001, 1, 1, 2499.00),
(2, 1002, 5, 1, 1499.00),
(3, 1002, 12, 1, 449.00),
(4, 1003, 16, 1, 849.00);

-- Sample customer cart item
INSERT OR IGNORE INTO cart_items (id, user_id, product_id, quantity) VALUES
(1, 2, 4, 1);
