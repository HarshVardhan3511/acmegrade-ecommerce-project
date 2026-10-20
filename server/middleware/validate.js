/**
 * Input validation helpers for API endpoints
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PINCODE_REGEX = /^[0-9]{5,6}$/;
const PHONE_REGEX = /^[0-9+() -]{10,15}$/;

function validateRegister(req, res, next) {
  const { name, email, password } = req.body;
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push('Name is required and must be at least 2 characters.');
  }

  if (!email || !EMAIL_REGEX.test(email.trim())) {
    errors.push('A valid email address is required.');
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    errors.push('Password must be at least 6 characters long.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errors,
    });
  }

  req.body.name = name.trim();
  req.body.email = email.trim().toLowerCase();
  next();
}

function validateLogin(req, res, next) {
  const { email, password } = req.body;
  const errors = [];

  if (!email || !EMAIL_REGEX.test(email.trim())) {
    errors.push('A valid email address is required.');
  }

  if (!password || typeof password !== 'string') {
    errors.push('Password is required.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errors,
    });
  }

  req.body.email = email.trim().toLowerCase();
  next();
}

function validateProduct(req, res, next) {
  const { name, category_id, price, stock } = req.body;
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push('Product name is required.');
  }

  if (!category_id || isNaN(Number(category_id))) {
    errors.push('A valid category ID is required.');
  }

  const numPrice = Number(price);
  if (price === undefined || isNaN(numPrice) || numPrice < 0) {
    errors.push('Product price must be a non-negative number.');
  }

  const numStock = Number(stock);
  if (stock === undefined || isNaN(numStock) || !Number.isInteger(numStock) || numStock < 0) {
    errors.push('Product stock must be a non-negative integer.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errors,
    });
  }

  req.body.name = name.trim();
  req.body.category_id = Number(category_id);
  req.body.price = parseFloat(numPrice.toFixed(2));
  req.body.stock = parseInt(numStock, 10);
  next();
}

function validateCheckout(req, res, next) {
  const { shipping_name, shipping_phone, shipping_address, shipping_city, shipping_pincode } = req.body;
  const errors = [];

  if (!shipping_name || typeof shipping_name !== 'string' || shipping_name.trim().length < 2) {
    errors.push('Full recipient name is required.');
  }

  if (!shipping_phone || !PHONE_REGEX.test(shipping_phone.trim())) {
    errors.push('A valid 10-digit phone number is required.');
  }

  if (!shipping_address || typeof shipping_address !== 'string' || shipping_address.trim().length < 5) {
    errors.push('Complete delivery address is required (at least 5 characters).');
  }

  if (!shipping_city || typeof shipping_city !== 'string' || shipping_city.trim().length < 2) {
    errors.push('City is required.');
  }

  if (!shipping_pincode || !PINCODE_REGEX.test(shipping_pincode.trim())) {
    errors.push('A valid PIN code (5 to 6 digits) is required.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Checkout validation failed.',
      errors,
    });
  }

  req.body.shipping_name = shipping_name.trim();
  req.body.shipping_phone = shipping_phone.trim();
  req.body.shipping_address = shipping_address.trim();
  req.body.shipping_city = shipping_city.trim();
  req.body.shipping_pincode = shipping_pincode.trim();
  next();
}

module.exports = {
  validateRegister,
  validateLogin,
  validateProduct,
  validateCheckout,
};
