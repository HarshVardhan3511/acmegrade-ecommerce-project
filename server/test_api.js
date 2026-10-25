/**
 * Automated End-to-End API Test Suite
 * Tests all requirements, edge cases, auth guards, transactions, and status codes.
 */

const http = require('http');
const app = require('./app');

let server;
const PORT = 5099;
const BASE_URL = `http://localhost:${PORT}/api`;

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path.startsWith('http') ? path : `${BASE_URL}${path}`);
    const headers = options.headers || {};

    let bodyData = null;
    if (options.body) {
      bodyData = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(bodyData);
    }

    const req = http.request(
      url,
      {
        method: options.method || 'GET',
        headers,
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(rawData);
          } catch (e) {
            json = rawData;
          }
          resolve({ status: res.statusCode, headers: res.headers, data: json });
        });
      }
    );

    req.on('error', (err) => reject(err));
    if (bodyData) req.write(bodyData);
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runTests() {
  console.log('====================================================');
  console.log(' Starting ShopEasy Comprehensive API Verification  ');
  console.log('====================================================\n');

  let adminToken = '';
  let customerToken = '';
  let createdProductId = null;
  let createdOrderId = null;

  try {
    // 1. Health check
    console.log('Test 1: Health Check');
    const health = await request('/health');
    assert(health.status === 200, 'Health endpoint responds with 200 OK');
    assert(health.data.status === 'online', 'Health status is online');

    // 2. Public Product Catalog
    console.log('\nTest 2: Public Product Catalog & Pagination (PRD-1, PRD-4, PRD-5)');
    const productsRes = await request('/products?limit=8&page=1');
    assert(productsRes.status === 200, 'GET /api/products returns 200');
    assert(productsRes.data.products.length <= 8, 'Pagination limits products to 8');
    assert(productsRes.data.pagination.totalPages >= 1, 'Pagination metadata included');

    // 3. Search & Category Filter (PRD-2, PRD-3)
    console.log('\nTest 3: Search and Category Filtering (PRD-2, PRD-3)');
    const searchRes = await request('/products?search=Keyboard');
    assert(searchRes.data.products.length > 0, 'Search for "Keyboard" returns matching products');

    const catFilterRes = await request('/products?category=1');
    assert(catFilterRes.data.products.every(p => p.category_id === 1), 'Category filter only returns category 1 products');

    // 4. Authentication: Login Admin & Customer (AUTH-2, AUTH-3)
    console.log('\nTest 4: Authentication & JWT Tokens (AUTH-2, AUTH-3)');
    const adminLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: 'admin@shopeasy.com', password: 'admin123' },
    });
    assert(adminLogin.status === 200, 'Admin login successful with 200');
    assert(adminLogin.data.token && adminLogin.data.user.role === 'admin', 'Admin token and role received');
    adminToken = adminLogin.data.token;

    const custLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: 'customer@shopeasy.com', password: 'customer123' },
    });
    assert(custLogin.status === 200, 'Customer login successful with 200');
    assert(custLogin.data.token && custLogin.data.user.role === 'customer', 'Customer token and role received');
    customerToken = custLogin.data.token;

    // 5. Auth Guards & Role-Based Access Control (AUTH-4, AUTH-5)
    console.log('\nTest 5: Auth Guards & Role-Based Access (AUTH-4, AUTH-5)');
    const unauthCart = await request('/cart');
    assert(unauthCart.status === 401, 'Unauthenticated request to /api/cart rejected with 401 (AUTH-4)');

    const customerAccessAdmin = await request('/admin/stats', {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(customerAccessAdmin.status === 403, 'Customer accessing /api/admin/stats rejected with 403 (AUTH-5)');

    const adminAccessAdmin = await request('/admin/stats', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminAccessAdmin.status === 200, 'Admin access to /api/admin/stats succeeds with 200');

    // 6. User Registration (AUTH-1)
    console.log('\nTest 6: User Registration & Validation (AUTH-1)');
    const testEmail = `testuser_${Date.now()}@example.com`;
    const regRes = await request('/auth/register', {
      method: 'POST',
      body: { name: 'Test Runner', email: testEmail, password: 'password123' },
    });
    assert(regRes.status === 201, 'New user registered successfully with 201 (AUTH-1)');
    const testUserToken = regRes.data.token;

    // Duplicate registration check
    const dupRes = await request('/auth/register', {
      method: 'POST',
      body: { name: 'Duplicate User', email: testEmail, password: 'password123' },
    });
    assert(dupRes.status === 400, 'Duplicate email registration rejected with 400');

    // 7. Cart Operations & Out-of-stock validation (CRT-1, CRT-3, PRD-7)
    console.log('\nTest 7: Cart Operations & Stock Restrictions (CRT-1, CRT-3, PRD-7)');
    // Try adding out of stock item (Product #8 was seeded with stock 0)
    const outOfStockAdd = await request('/cart', {
      method: 'POST',
      headers: { Authorization: `Bearer ${testUserToken}` },
      body: { productId: 8, quantity: 1 },
    });
    assert(outOfStockAdd.status === 400, 'Out-of-stock product addition rejected with 400 (PRD-7)');

    // Add valid in-stock product (Product #1, stock 25)
    const validAdd = await request('/cart', {
      method: 'POST',
      headers: { Authorization: `Bearer ${testUserToken}` },
      body: { productId: 1, quantity: 2 },
    });
    assert(validAdd.status === 200, 'In-stock product added to cart successfully (CRT-1)');

    // Add item exceeding available stock
    const excessAdd = await request('/cart', {
      method: 'POST',
      headers: { Authorization: `Bearer ${testUserToken}` },
      body: { productId: 1, quantity: 100 },
    });
    assert(excessAdd.status === 400, 'Adding quantity exceeding available stock rejected with 400 (CRT-3)');

    // Get Cart (CRT-2)
    const getCartRes = await request('/cart', {
      headers: { Authorization: `Bearer ${testUserToken}` },
    });
    assert(getCartRes.status === 200, 'GET /api/cart returns 200 (CRT-2)');
    assert(getCartRes.data.cart.items.length === 1, 'Cart contains exactly 1 item');
    assert(getCartRes.data.cart.total_items === 2, 'Total quantity is 2');
    const cartItemId = getCartRes.data.cart.items[0].cart_item_id;

    // 8. Order Placement & Stock Deduction Transaction (ORD-1, ORD-2, ORD-3, ORD-4)
    console.log('\nTest 8: Order Placement & DB Transaction (ORD-1, ORD-2, ORD-3, ORD-4)');
    const initialProd = await request('/products/1');
    const stockBeforeOrder = initialProd.data.product.stock;

    const orderRes = await request('/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${testUserToken}` },
      body: {
        shipping_name: 'Test Runner',
        shipping_phone: '9876543210',
        shipping_address: '123 Test Street, Cyber City',
        shipping_city: 'Bangalore',
        shipping_pincode: '560001',
      },
    });
    assert(orderRes.status === 201, 'Order created with 201 (ORD-3)');
    assert(orderRes.data.order.payment_method === 'Cash on Delivery', 'Payment is Cash on Delivery (ORD-2)');
    createdOrderId = orderRes.data.order.id;

    // Verify stock was reduced
    const afterProd = await request('/products/1');
    assert(afterProd.data.product.stock === stockBeforeOrder - 2, 'Product stock was accurately deducted by 2 in DB transaction');

    // Verify cart was emptied
    const emptyCartRes = await request('/cart', {
      headers: { Authorization: `Bearer ${testUserToken}` },
    });
    assert(emptyCartRes.data.cart.items.length === 0, 'Cart was emptied after order placement (ORD-3)');

    // 9. Order Cancellation & Stock Restore (ORD-6)
    console.log('\nTest 9: Order Cancellation & Stock Restoration (ORD-6)');
    const cancelRes = await request(`/orders/${createdOrderId}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${testUserToken}` },
    });
    assert(cancelRes.status === 200, 'Customer order cancellation succeeded with 200 (ORD-6)');

    const restoredProd = await request('/products/1');
    assert(restoredProd.data.product.stock === stockBeforeOrder, 'Stock restored to original amount after cancellation');

    // 10. Admin Product Management (ADM-2, ADM-6)
    console.log('\nTest 10: Admin Product Management CRUD (ADM-2)');
    const newProdRes = await request('/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'Automated Test Gadget',
        category_id: 1,
        price: 999.00,
        stock: 3, // Low stock test (<5)
        description: 'A cutting edge testing gadget',
        image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e',
      },
    });
    assert(newProdRes.status === 201, 'Admin created product with 201 (ADM-2)');
    createdProductId = newProdRes.data.product.id;

    // Check low stock count (ADM-6)
    const lowStockCheck = await request('/admin/low-stock', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(lowStockCheck.data.products.some(p => p.id === createdProductId), 'New low-stock product is detected in low-stock query (ADM-6)');

    // Clean up created test product
    const delProd = await request(`/products/${createdProductId}?permanent=true`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(delProd.status === 200, 'Admin deleted product successfully (ADM-2)');

    // 11. Admin Orders Status Update (ADM-4, ADM-5)
    console.log('\nTest 11: Admin Order Status Transition (ADM-4, ADM-5)');
    const adminOrders = await request('/admin/orders', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminOrders.status === 200, 'Admin retrieved all orders (ADM-4)');

    const placedOrder = adminOrders.data.orders.find(order => order.status === 'Placed');
    assert(placedOrder, 'A placed order is available for fulfillment');
    const sampleOrderId = placedOrder.id;
    const statusUpdate = await request(`/admin/orders/${sampleOrderId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'Shipped' },
    });
    assert(statusUpdate.status === 200, 'Admin updated order status to Shipped (ADM-5)');

    console.log('\n====================================================');
    console.log(' ALL 11 TEST PHASES PASSED WITH ZERO ERRORS!       ');
    console.log(' Full compliance with requirements verified.        ');
    console.log('====================================================\n');
  } catch (err) {
    console.error('\n❌ Test Suite Failed:', err.message);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
  }
}

server = app.listen(PORT, async () => {
  await runTests();
  server.close(() => {
    process.exit(process.exitCode || 0);
  });
});
