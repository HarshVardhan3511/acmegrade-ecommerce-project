# ShopEasy – E-Commerce Web Application (MVP)

A complete, working full-stack e-commerce web application built using **Node.js**, **Express.js**, **SQLite**, and **Vanilla JavaScript (HTML5/CSS3)**.

---

## 📌 Project Overview

**ShopEasy** is designed as an end-to-end e-commerce store with role-based access for customers and administrators.

- **Customers** can browse products with search, category filtering, price sorting, pagination, manage their shopping cart, checkout using Cash on Delivery (COD), view past orders, and cancel orders while in "Placed" status.
- **Store Managers (Admins)** have access to a secured administrative portal to track real-time revenue and sales stats, manage products (CRUD + image upload + low-stock warnings), manage categories, and update order fulfillment statuses.
- **Bonus features** include coupons and discounts, printable invoices, wishlists, product reviews, and configurable email/SMS order notifications.

---

## 🛠️ Technology Stack

| Layer | Technology | Details |
|---|---|---|
| **Frontend** | HTML5, CSS3, Vanilla JS (ES6+) | Flexbox/CSS Grid, Fetch API, DOM manipulation, responsive down to 360px mobile |
| **Backend** | Node.js, Express.js | Modular REST API architecture, controllers, validation & auth middleware |
| **Database** | SQLite (`sqlite3`) | Normalized relational schema, foreign key enforcement, ACID transactions |
| **Security** | `bcryptjs`, `jsonwebtoken` (JWT) | Password hashing (10 salt rounds), Bearer token auth, role-based protection |
| **Image Uploads** | `multer` | Multipart product image uploads; persistent volume in the Render setup |
| **Visualization**| `Chart.js` | Interactive sales distribution chart on Admin Dashboard |
| **Notifications** | `nodemailer`, Twilio REST API | SMTP email and Twilio SMS, with simulated logging when credentials are absent |

---

## 🚀 Quick Start & Setup Instructions

### 1. Prerequisites
- **Node.js** (v18 or higher recommended; tested on Node v24)
- **npm** (v9 or higher)

### 2. Installation
Clone the repository and install all dependencies:
```bash
git clone <repository-url>
cd ecommerce-project
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env` (then replace the JWT placeholder with a random secret):
```bash
cp .env.example .env
```

`.env` configuration keys (the SMTP and Twilio settings are optional):
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d
DB_FILE=./shopeasy.db
UPLOAD_DIR=./public/uploads
SMTP_HOST=
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
```

Set SMTP credentials to deliver email. Set all three Twilio values and save customer phone numbers in international E.164 format to deliver SMS. Without provider credentials, notifications are logged as simulated messages.

### 4. Database Setup & Seeding
Initialize the SQLite database with schemas, 5 categories, 16 products, sample orders, and demo accounts:
```bash
npm run seed
```

### 5. Running the Application
Start the production server:
```bash
npm start
```
Or start in live-reload development mode:
```bash
npm run dev
```

Visit the application in your browser:
- **Storefront (Customer/Guest):** [http://localhost:5000](http://localhost:5000)
- **Admin Dashboard:** [http://localhost:5000/admin/dashboard.html](http://localhost:5000/admin/dashboard.html)

### Cloud deployment on Render

The included `render.yaml` configures a public Node web service, a generated JWT secret, a health check, and a persistent volume for the SQLite database and uploaded images. In Render, create a new Blueprint from this repository and apply the `render.yaml` configuration. Render assigns the service an `onrender.com` URL after the first successful deploy; check `/api/health` on that URL to confirm it is online.

This configuration uses a paid Starter web service because Render does not provide persistent disks to free web services. Keep the disk mounted at `/var/data`; changing the mount or database path can make the deployed app appear to lose its data. Add SMTP/Twilio variables in the Render service settings if you want real email and SMS delivery. Keep credentials out of Git.

---

## 🔑 Demo Login Credentials

For quick evaluation and grading viva, use the pre-configured credentials (or click the quick-fill buttons on the login page):

| Role | Email Address | Password | Permissions |
|---|---|---|---|
| **Administrator** | `admin@shopeasy.com` | `admin123` | Full admin panel access, product CRUD, category CRUD, orders update, dashboard stats |
| **Customer** | `customer@shopeasy.com` | `customer123` | Cart management, order placement, order tracking, profile updates |

*Note: You can also register a new customer account anytime from `/register.html`.*

---

## 🧪 Running Automated Tests

A comprehensive 11-phase automated test suite verifies all functional requirements, role checks, stock constraints, and ACID transactions:
```bash
npm test
```

### Verified Test Cases:
1. Health check endpoint status
2. Product catalog listing & pagination (PRD-1, PRD-4, PRD-5)
3. Partial search & category filtering (PRD-2, PRD-3)
4. Password hashing verification & JWT token generation (AUTH-2, AUTH-3)
5. Auth guards & role-based 403 access control (AUTH-4, AUTH-5)
6. Customer registration & duplicate email check (AUTH-1)
7. Cart stock limits & rejection of out-of-stock items (CRT-1, CRT-3, PRD-7)
8. Multi-statement DB transaction during order placement (ORD-1, ORD-2, ORD-3, ORD-4)
9. Stock restoration upon customer order cancellation (ORD-6)
10. Admin product CRUD & low-stock highlight (ADM-2, ADM-6)
11. Admin order fulfillment status updates (ADM-4, ADM-5)

---

## 📁 Project Folder Structure

```
ecommerce-project/
├── server/
│   ├── app.js               # Express setup, middleware, static files, routes mounting
│   ├── db.js                # SQLite connection, Promise wrappers, transactions
│   ├── schema.sql           # Database tables with integrity constraints
│   ├── seed.sql             # Initial categories, products, orders, demo users
│   ├── seed.js              # Standalone seeding script (npm run seed)
│   ├── test_api.js          # Automated end-to-end API test suite (npm test)
│   ├── middleware/
│   │   ├── auth.js          # JWT authentication middleware (authenticate, optionalAuth)
│   │   ├── adminOnly.js     # Admin role authorization (returns 403 for customers)
│   │   ├── validate.js      # Input validation helpers (client & server side)
│   │   └── upload.js        # Multer image upload configuration
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── category.routes.js
│   │   ├── product.routes.js
│   │   ├── cart.routes.js
│   │   ├── order.routes.js
│   │   ├── admin.routes.js
│   │   ├── wishlist.routes.js
│   │   └── coupon.routes.js
│   ├── controllers/
│       ├── auth.controller.js
│       ├── category.controller.js
│       ├── product.controller.js
│       ├── cart.controller.js
│       ├── order.controller.js
│       ├── admin.controller.js
│       ├── coupon.controller.js
│       ├── invoice.controller.js
│       └── wishlist.controller.js
│   └── services/
│       └── notification.service.js
├── public/
│   ├── css/
│   │   └── style.css        # Custom responsive CSS design system (flexbox/grid)
│   ├── js/
│   │   ├── api.js           # Fetch wrapper, JWT helpers, toast alerts, XSS sanitizer
│   │   ├── auth.js          # Login & registration logic
│   │   ├── products.js      # Catalog search, category filter, sort, pagination, cart
│   │   ├── product-detail.js# Single product view, quantity picker, reviews
│   │   ├── cart.js          # Cart page, +/- quantity controls with stock check
│   │   ├── checkout.js      # Checkout form validation & COD placement
│   │   ├── orders.js        # Customer order history & order cancellation
│   │   ├── wishlist.js      # Saved products and add-to-cart actions
│   │   └── profile.js       # Customer profile management
│   ├── admin/
│   │   ├── dashboard.html   # Admin stats cards & Chart.js sales chart
│   │   ├── dashboard.js
│   │   ├── products.html    # Product CRUD table & Add/Edit modal
│   │   ├── products.js
│   │   ├── categories.html  # Category CRUD
│   │   ├── categories.js
│   │   ├── orders.html      # Admin orders table & status dropdown
│   │   └── orders.js
│   ├── uploads/             # Directory for uploaded product images
│   ├── index.html           # Storefront catalog
│   ├── product.html         # Product detail page
│   ├── login.html           # Login screen
│   ├── register.html        # Registration screen
│   ├── cart.html            # Cart view
│   ├── checkout.html        # Checkout screen
│   ├── success.html         # Order confirmation screen
│   ├── orders.html          # My Orders screen
│   ├── wishlist.html        # Saved products
│   └── profile.html         # Profile screen
├── er_diagram.md            # Detailed Mermaid ER Diagram & schema docs
├── postman_collection.json  # Complete Postman Collection v2.1
├── .env.example
├── render.yaml              # Render web service and persistent data volume
├── .gitignore
└── package.json
```

---

## 🌐 REST API Endpoints Specification

### 1. Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register new customer with name, email, password |
| `POST` | `/api/auth/login` | Public | Authenticate user and receive JWT token |
| `GET` | `/api/auth/me` | Authenticated | Retrieve current authenticated user profile |
| `PUT` | `/api/auth/profile` | Authenticated | Update user name, phone, and address |

### 2. Categories (`/api/categories`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/categories` | Public | List categories with active product counts |
| `GET` | `/api/categories/:id` | Public | Get single category details |
| `POST` | `/api/categories` | Admin Only | Create a new category |
| `PUT` | `/api/categories/:id` | Admin Only | Update an existing category |
| `DELETE` | `/api/categories/:id` | Admin Only | Delete category (checks for linked products) |

### 3. Products (`/api/products`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/products` | Public | List products (query: `search`, `category`, `page`, `limit`, `sort`) |
| `GET` | `/api/products/:id` | Public | Product details with reviews |
| `POST` | `/api/products` | Admin Only | Create product (supports image upload / URL) |
| `PUT` | `/api/products/:id` | Admin Only | Update product details and stock |
| `DELETE` | `/api/products/:id` | Admin Only | Delete or deactivate product |
| `POST` | `/api/products/:id/reviews` | Authenticated | Submit product star rating & review |

### 4. Shopping Cart (`/api/cart`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/cart` | Customer | Fetch current cart with items, line totals, and grand total |
| `POST` | `/api/cart` | Customer | Add product to cart (validates available stock) |
| `PUT` | `/api/cart/:itemId` | Customer | Update item quantity (cannot exceed stock) |
| `DELETE` | `/api/cart/:itemId` | Customer | Remove specific item from cart |
| `DELETE` | `/api/cart` | Customer | Clear entire cart |

### 5. Orders & Checkout (`/api/orders`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/orders` | Customer | Place order with COD within an atomic DB transaction |
| `GET` | `/api/orders` | Customer | View customer order history |
| `GET` | `/api/orders/:id` | Customer / Admin | View full order detail and line items |
| `POST` | `/api/orders/:id/cancel`| Customer | Cancel order if "Placed" (restores product stock) |
| `GET` | `/api/orders/:id/invoice` | Customer / Admin | View and print an order invoice |

### 6. Wishlist and coupons

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/wishlist` | Authenticated | List saved products |
| `POST` | `/api/wishlist/:productId` | Authenticated | Add or remove a saved product |
| `POST` | `/api/coupons/validate` | Authenticated | Check a coupon against the current cart |
| `GET/POST` | `/api/admin/coupons` | Admin Only | List or create discount coupons |
| `PATCH` | `/api/admin/coupons/:id/toggle` | Admin Only | Enable or disable a coupon |
| `DELETE` | `/api/admin/coupons/:id` | Admin Only | Delete a coupon |

### 7. Admin Panel (`/api/admin`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/admin/stats` | Admin Only | Dashboard KPI counts, category sales, recent orders |
| `GET` | `/api/admin/orders` | Admin Only | View all orders with search & status filters |
| `PATCH` | `/api/admin/orders/:id/status`| Admin Only | Update status (`Placed`, `Shipped`, `Delivered`, `Cancelled`) |
| `GET` | `/api/admin/low-stock`| Admin Only | Products with low stock levels (`stock < 5`) |

---

## 🛡️ Security & Non-Functional Features

- **SQL Injection Prevention:** 100% parameterized SQL queries via `sqlite3` prepared statements.
- **Cross-Site Scripting (XSS) Prevention:** Frontend escapes all rendered dynamic text using DOM text nodes / `escapeHtml()`.
- **Role-Based Authorization:** Endpoints strictly verify `req.user.role === 'admin'` before allowing administrative actions; customer tokens receive HTTP `403 Forbidden`.
- **Atomic Database Transactions:** Order checkout (`POST /api/orders`) executes `BEGIN IMMEDIATE TRANSACTION` ensuring stock deduction, order row creation, order items insertion, and cart clearing either completely succeed or completely roll back without inventory leaks.
- **Responsive Layout:** Handcrafted CSS with CSS Grid and Flexbox, fully responsive from mobile (min 360px) to widescreen desktop.

---

## 🏆 Checklist of Functional Requirements

- [x] **AUTH-1:** User registration with name, unique email, min 6-char password (P1)
- [x] **AUTH-2:** Passwords hashed with bcrypt (P1)
- [x] **AUTH-3:** JWT token returned upon valid login (P1)
- [x] **AUTH-4:** Protected APIs reject unauthenticated requests with 401 (P1)
- [x] **AUTH-5:** Admin-only APIs return 403 for customer tokens (P1)
- [x] **AUTH-6:** Logout clears token from localStorage (P1)
- [x] **AUTH-7:** Profile page to view and update name, phone, address (P3)
- [x] **PRD-1:** Home page displays responsive product catalog with Add to Cart (P1)
- [x] **PRD-2:** Search products by name/description with partial matching (P1)
- [x] **PRD-3:** Filter products by category (P1)
- [x] **PRD-4:** Pagination (8 items per page) (P2)
- [x] **PRD-5:** Sort by price (low-to-high, high-to-low) and newest (P2)
- [x] **PRD-6:** Product detail page with description, stock status, reviews (P1)
- [x] **PRD-7:** Out-of-stock products cannot be added to cart (P1)
- [x] **CRT-1:** Logged-in customer can add items to cart (P1)
- [x] **CRT-2:** Cart page with quantity, unit price, line total, grand total (P1)
- [x] **CRT-3:** Increase/decrease quantity without exceeding stock (P1)
- [x] **CRT-4:** Remove items from cart (P1)
- [x] **CRT-5:** Dynamic cart badge in navigation bar (P2)
- [x] **ORD-1:** Checkout form collecting validated address, phone, PIN code (P1)
- [x] **ORD-2:** Cash on Delivery (COD) payment method (P1)
- [x] **ORD-3:** Order placement within database transaction (reduces stock, clears cart) (P1)
- [x] **ORD-4:** Order confirmation page showing Order ID and summary (P1)
- [x] **ORD-5:** My Orders page with status badges (Placed, Shipped, Delivered, Cancelled) (P1)
- [x] **ORD-6:** Customer order cancellation while in "Placed" status (restores stock) (P3)
- [x] **ADM-1:** Admin dashboard with total revenue, orders, products, customers (P2)
- [x] **ADM-2:** Add, edit, delete (deactivate) products (P1)
- [x] **ADM-3:** Add, edit, delete categories (P1)
- [x] **ADM-4:** View all orders with customer details (P1)
- [x] **ADM-5:** Update order status dropdown (P1)
- [x] **ADM-6:** Low stock highlight (`stock < 5`) (P3)
- [x] **Bonus:** Product image file uploads via Multer
- [x] **Bonus:** Sales chart on Admin Dashboard using Chart.js
- [x] **Bonus:** Wishlist item toggle and product reviews/ratings
- [x] **Bonus:** Wishlist page to view and manage saved products
- [x] **Bonus:** Order invoices, coupons, and discount codes
- [x] **Bonus:** Configurable SMTP email and Twilio SMS notifications
- [x] **Bonus:** Render deployment configuration with persistent storage
- [x] **Bonus:** Complete Postman collection (`postman_collection.json`)
- [x] **Bonus:** Entity-Relationship diagram (`er_diagram.md`)
