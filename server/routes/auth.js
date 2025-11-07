const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { generateTokens, verifyRefreshToken } = require('../services/tokenService');

const router = express.Router();

// Register new user
router.post('/register', [
  body('username')
    .isLength({ min: 3, max: 20 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username must be 3-20 characters and contain only letters, numbers, and underscores'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').optional().isIn(['viewer', 'streamer']).withMessage('Invalid role'),
  body('region_id').isInt({ min: 1 }).withMessage('Valid region required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { username, email, password, role = 'viewer', region_id } = req.body;

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Username or email already exists' 
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate referral code
    const referralCode = username.toUpperCase() + Math.random().toString(36).substr(2, 6).toUpperCase();

    // Create user
    const newUserResult = await query(`
      INSERT INTO users (username, email, password_hash, role, region_id, referral_code)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, username, email, role, tokens_balance, created_at
    `, [username, email, passwordHash, role, region_id, referralCode]);

    const user = newUserResult.rows[0];

    // Generate tokens
    const tokens = generateTokens(user.id);

    // Log session
    await query(`
      INSERT INTO user_sessions (user_id, token_hash, ip_address, user_agent, expires_at)
      VALUES ($1, $2, $3, $4, $5)
    `, [user.id, tokens.refreshToken, req.ip, req.get('User-Agent'), 
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)]); // 30 days

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        tokens_balance: user.tokens_balance,
        created_at: user.created_at
      },
      tokens
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login user
router.post('/login', [
  body('username').notEmpty().withMessage('Username or email required'),
  body('password').notEmpty().withMessage('Password required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { username, password } = req.body;

    // Find user by username or email
    const userResult = await query(`
      SELECT id, username, email, password_hash, role, is_banned, ban_reason, age_verified
      FROM users 
      WHERE username = $1 OR email = $1
    `, [username]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userResult.rows[0];

    // Check if user is banned
    if (user.is_banned) {
      return res.status(403).json({ 
        error: 'Account banned',
        reason: user.ban_reason || 'Violation of terms of service'
      });
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens
    const tokens = generateTokens(user.id);

    // Log session
    await query(`
      INSERT INTO user_sessions (user_id, token_hash, ip_address, user_agent, expires_at)
      VALUES ($1, $2, $3, $4, $5)
    `, [user.id, tokens.refreshToken, req.ip, req.get('User-Agent'), 
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)]); // 30 days

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        age_verified: user.age_verified
      },
      tokens
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Refresh access token
router.post('/refresh', [
  body('refreshToken').notEmpty().withMessage('Refresh token required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { refreshToken } = req.body;

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Check if session exists and is active
    const sessionResult = await query(
      'SELECT id, user_id FROM user_sessions WHERE token_hash = $1 AND is_active = true',
      [refreshToken]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({ error: 'Session not found or expired' });
    }

    // Check if user still exists and is not banned
    const userResult = await query(
      'SELECT id, username, email, role, is_banned FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0 || userResult.rows[0].is_banned) {
      return res.status(401).json({ error: 'User not found or banned' });
    }

    // Generate new tokens
    const newTokens = generateTokens(decoded.userId);

    // Deactivate old session
    await query(
      'UPDATE user_sessions SET is_active = false WHERE token_hash = $1',
      [refreshToken]
    );

    // Create new session
    await query(`
      INSERT INTO user_sessions (user_id, token_hash, ip_address, user_agent, expires_at)
      VALUES ($1, $2, $3, $4, $5)
    `, [decoded.userId, newTokens.refreshToken, req.ip, req.get('User-Agent'), 
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)]);

    res.json({
      message: 'Token refreshed successfully',
      tokens: newTokens
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({ error: 'Token refresh failed' });
  }
});

// Logout
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      // Deactivate session
      await query(
        'UPDATE user_sessions SET is_active = false WHERE token_hash = $1',
        [token]
      );
    }

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Verify token
router.post('/verify', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    
    // Get user data
    const userResult = await query(`
      SELECT id, username, email, role, tokens_balance, age_verified, is_banned
      FROM users WHERE id = $1
    `, [decoded.userId]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    if (user.is_banned) {
      return res.status(403).json({ error: 'Account banned' });
    }

    res.json({
      valid: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        tokens_balance: user.tokens_balance,
        age_verified: user.age_verified
      }
    });

  } catch (error) {
    console.error('Verify token error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Age verification
router.post('/age-verify', [
  body('birth_date').isISO8601().withMessage('Valid birth date required')
], async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    const { birth_date } = req.body;

    // Check if user is 18+
    const birthDate = new Date(birth_date);
    const today = new Date();
    const age = Math.floor((today - birthDate) / (365.25 * 24 * 60 * 60 * 1000));

    if (age < 18) {
      return res.status(400).json({ error: 'You must be 18 or older to verify age' });
    }

    // Mark user as age verified
    await query(
      'UPDATE users SET age_verified = true WHERE id = $1',
      [decoded.userId]
    );

    res.json({ message: 'Age verification successful' });

  } catch (error) {
    console.error('Age verification error:', error);
    res.status(500).json({ error: 'Age verification failed' });
  }
});

module.exports = router;