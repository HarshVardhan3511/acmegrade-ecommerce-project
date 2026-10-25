# ShopEasy — E-Commerce Web Application

ShopEasy is a full-stack e-commerce demo built with Node.js, Express, SQLite, and a browser-based storefront. It includes customer shopping flows and an admin area for managing products, orders, coupons, and sales.

## Project status

- The project runs locally and includes sample data and demo accounts.
- Cloud deployment has **not** been completed; there is no public live URL.
- A Render configuration file is included as a starting point, but this project has not been deployed or verified on Render/Railway.
- This is a learning/demo project. Read the security note before exposing it publicly.

## Features

### Customer storefront

- Browse, search, filter, sort, and paginate products; view product details and stock.
- Register, log in, edit profile details, and log out.
- Add products to a cart, change quantities, and remove items.
- Place cash-on-delivery orders with an 18% GST calculation.
- Apply discount coupons at checkout.
- View order history and order details; cancel eligible placed orders.
- Cancellation restores product stock and coupon usage.
- View and print an order invoice.
- Save products to a wishlist.
- Submit a product rating and review.
- Receive order-related email/SMS notifications when delivery credentials are configured.

### Admin area

- Manage products and categories.
- Upload product images using Multer. Supported formats: JPEG, JPG, PNG, WEBP, and GIF; maximum file size: 5 MB.
- View orders and update their status through the allowed order workflow.
- See dashboard figures, low-stock products, and category sales chart.
- Create, activate/deactivate, and remove coupons.
- View notification logs.

### Notifications and coupons

- Email delivery uses SMTP through Nodemailer.
- SMS delivery uses Twilio.
- SMTP and Twilio settings are optional. Without credentials, notification events are recorded/simulated rather than sent to real inboxes or phones.
- Sample coupons are initialized with the database; coupon rules and availability are checked at checkout.

## Technology stack

| Area | Technology |
| --- | --- |
| Server | Node.js, Express 5 |
| Database | SQLite with sqlite3 |
| Frontend | HTML5, CSS3, vanilla JavaScript |
| Authentication | JSON Web Tokens (JWT) |
| Password hashing | bcryptjs |
| Product image uploads | Multer |
| Email | Nodemailer with SMTP |
| SMS | Twilio REST API |
| Admin chart | Chart.js |
| Configuration | dotenv |

## Project structure

    ecommerce-project/
    ├── public/                 Storefront pages, CSS, browser JavaScript, uploads
    │   └── admin/              Admin dashboard and management pages
    ├── server/
    │   ├── app.js              Express app and HTTP server
    │   ├── db.js               SQLite connection, initialization, and helpers
    │   ├── schema.sql          Database schema
    │   ├── seed.sql            Demo users, products, and categories
    │   ├── routes/             REST API routes
    │   ├── controllers/        Request handlers and business logic
    │   ├── middleware/         Authentication, validation, and upload handling
    │   ├── services/           Email/SMS notification service
    │   └── test_api.js         API test suite
    ├── .env.example            Example local configuration
    ├── postman_collection.json API request collection
    ├── er_diagram.md           Database relationship notes
    └── render.yaml             Unused deployment blueprint configuration

## Requirements

- Node.js and npm installed. Node.js 20 or newer is recommended.
- Windows, macOS, or Linux terminal.

## Run locally on Windows

Open PowerShell in the project folder, then run:

    npm install

Create a local environment file if you do not already have one:

    if (!(Test-Path .env)) { Copy-Item .env.example .env }

Open .env and set a private random JWT_SECRET. SMTP/Twilio values may stay blank for local use. Then start the app:

    npm start

Open the storefront at [http://localhost:5000](http://localhost:5000).

Useful pages:

- Storefront: [http://localhost:5000](http://localhost:5000)
- Admin dashboard: [http://localhost:5000/admin/dashboard.html](http://localhost:5000/admin/dashboard.html)
- Health check: [http://localhost:5000/api/health](http://localhost:5000/api/health)

For auto-restarting during development, use:

    npm run dev

Stop the server with Ctrl+C in the terminal.

## Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@shopeasy.com | admin123 |
| Customer | customer@shopeasy.com | customer123 |

These are development-only credentials. Change or remove them before any public deployment.

## Configuration

The server reads settings from .env. The repository's .env.example provides the available variables:

| Variable | Purpose | Local default |
| --- | --- | --- |
| PORT | HTTP server port | 5000 |
| NODE_ENV | Runtime mode | development |
| JWT_SECRET | Secret used to sign login tokens | Set your own value |
| JWT_EXPIRES_IN | Token lifetime | 7d |
| DB_FILE | SQLite database file path | ./shopeasy.db |
| UPLOAD_DIR | Product image storage directory | ./public/uploads |
| SMTP_HOST, SMTP_PORT, SMTP_SECURE | SMTP connection | Blank host; port 465; secure true |
| SMTP_USER, SMTP_PASS, SMTP_FROM | SMTP credentials and sender | Blank |
| TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN | Twilio credentials | Blank |
| TWILIO_FROM_NUMBER | Twilio sender phone number | Blank |

The local database and uploaded product images are created/kept in the configured locations. .env, SQLite database files, and node_modules are excluded from Git.

## Database and sample data

On startup, the app creates the SQLite schema, applies supported schema migrations, initializes default coupons, and loads the sample data when the products table is empty. You normally do not need to run the seed command manually.

Optional seed command:

    npm run seed

The seed script uses insert-if-missing behavior for seeded records. To start completely fresh, stop the server and deliberately remove or change the configured local database file; be aware that this deletes its users, orders, and other saved data.

## API overview

All endpoints use the /api prefix. Protected endpoints require a bearer JWT in the Authorization header; admin endpoints also require an admin role.

| Route group | What it covers |
| --- | --- |
| /api/auth | Registration, login, current user, and profile |
| /api/categories | Read categories; admin category management |
| /api/products | Product list/details; admin product management and image uploads; authenticated reviews |
| /api/cart | Customer cart operations |
| /api/orders | Place/list/view orders, cancellation, and invoice |
| /api/wishlist | Customer wishlist |
| /api/coupons | Validate coupon at checkout |
| /api/admin | Dashboard stats, orders/status, low stock, coupon management, notification logs |
| /api/health | Server health check |

The full endpoint collection is in postman_collection.json.

## Testing

Run the API suite with:

    npm test

The test suite exercises health, product search/filtering, authentication, authorization, registration, cart, checkout/order, and related API behavior. It writes test data and changes order state in the database it uses. Run it against a disposable/test database if you need to preserve your normal local data.

## Security note

This is a demo app, not a production-hardened service. In the current code, the authenticated POST /api/auth/make-admin endpoint promotes the signed-in user to admin. Remove or restrict this endpoint before making the app publicly accessible. Also replace the demo credentials and set a strong JWT_SECRET. Do not use real customer or payment data.

## Deployment note

Deployment was explicitly left out of this project run. The included render.yaml is only a configuration starting point; it does not mean a service has been created. No cloud instance, production database, or public URL is currently available.
