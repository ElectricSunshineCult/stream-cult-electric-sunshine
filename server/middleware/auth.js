const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    
    // Check if user still exists and is not banned
    const userResult = await query(
      'SELECT id, username, email, role, is_banned, ban_reason FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    
    if (user.is_banned) {
      return res.status(403).json({ 
        error: 'Account banned', 
        reason: user.ban_reason || 'Violation of terms of service' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
      const userResult = await query(
        'SELECT id, username, email, role, is_banned FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (userResult.rows.length > 0 && !userResult.rows[0].is_banned) {
        req.user = userResult.rows[0];
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

const verifyNSFW = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required for NSFW content' });
  }

  if (!req.user.age_verified) {
    return res.status(403).json({ 
      error: 'Age verification required to access NSFW content' 
    });
  }

  next();
};

module.exports = {
  authenticateToken,
  requireRole,
  optionalAuth,
  verifyNSFW
};