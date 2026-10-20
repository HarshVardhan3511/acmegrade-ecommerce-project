const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { get, run } = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Register a new user
 * POST /api/auth/register
 */
async function register(req, res) {
  try {
    const { name, email, password, phone, address } = req.body;

    // Check if email already registered
    const existing = await get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Insert user (default role is customer)
    const result = await run(
      'INSERT INTO users (name, email, password_hash, role, phone, address) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, password_hash, 'customer', phone || null, address || null]
    );

    const newUser = await get(
      'SELECT id, name, email, role, phone, address, created_at FROM users WHERE id = ?',
      [result.lastID]
    );

    // Generate JWT token
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.status(201).json({
      success: true,
      message: 'Registration successful! Welcome to ShopEasy.',
      token,
      user: newUser,
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to register user. Please try again.',
    });
  }
}

/**
 * Login user
 * POST /api/auth/login
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    const user = await get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Compare password hash
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      address: user.address,
      created_at: user.created_at,
    };

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: safeUser,
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({
      success: false,
      message: 'Login failed due to a server error.',
    });
  }
}

/**
 * Get currently authenticated user details
 * GET /api/auth/me
 */
async function getMe(req, res) {
  return res.status(200).json({
    success: true,
    user: req.user,
  });
}

/**
 * Update current user profile
 * PUT /api/auth/profile
 */
async function updateProfile(req, res) {
  try {
    const { name, phone, address } = req.body;
    const userId = req.user.id;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Name is required and must be at least 2 characters.',
      });
    }

    await run(
      'UPDATE users SET name = ?, phone = ?, address = ? WHERE id = ?',
      [name.trim(), phone ? phone.trim() : null, address ? address.trim() : null, userId]
    );

    const updatedUser = await get(
      'SELECT id, name, email, role, phone, address, created_at FROM users WHERE id = ?',
      [userId]
    );

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: updatedUser,
    });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to update profile.',
    });
  }
}

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
};
