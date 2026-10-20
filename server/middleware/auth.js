const jwt = require('jsonwebtoken');
const { get } = require('../db');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'shopeasy_secret_fallback_key';

/**
 * Required authentication middleware
 * Verifies JWT token and attaches req.user
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No authentication token provided.',
      });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtErr) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token. Please log in again.',
      });
    }

    const user = await get(
      'SELECT id, name, email, role, phone, address, created_at FROM users WHERE id = ?',
      [decoded.id]
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User belonging to this token no longer exists.',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication.',
    });
  }
}

/**
 * Optional authentication middleware
 * Attaches req.user if a valid token is provided, but continues if not.
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await get(
          'SELECT id, name, email, role, phone, address, created_at FROM users WHERE id = ?',
          [decoded.id]
        );
        if (user) {
          req.user = user;
        }
      } catch (err) {
        // Token invalid or expired, ignore and treat as guest
      }
    }
    next();
  } catch (err) {
    next();
  }
}

module.exports = {
  authenticate,
  optionalAuth,
  JWT_SECRET,
};
