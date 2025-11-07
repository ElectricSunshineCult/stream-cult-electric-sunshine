const express = require('express');
const { body, validationResult } = require('express-validator');
const Stripe = require('stripe');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const LevelService = require('../services/levelService');
const crypto = require('crypto');

/**
 * Stream Cult - Enhanced Payment Processing System
 * Copyright (C) 2025 Corey Setzer (Unknown Artist) / Electric Sunshine Cult
 * 
 * This proprietary system includes advanced revenue sharing, token payouts,
 * and comprehensive payment processing capabilities developed exclusively
 * for the Stream Cult platform.
 * 
 * Unauthorized use, copying, modification, or distribution is strictly prohibited
 * without written permission from Electric Sunshine Cult.
 * 
 * Contact: info@electricsunshinecult.com
 */

const router = express.Router();

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// Payment configuration
const PAYMENT_CONFIG = {
  // Token exchange rates (1 USD = X tokens for buy, X tokens = 1 USD for sell)
  tokenRates: {
    buy: 25.0,  // 1 USD = 25 tokens
    sell: 0.04  // 1 token = 0.04 USD (25 tokens = 1 USD)
  },
  // Minimum payout amounts
  minPayoutUSD: 10.00,
  // Processing time (in hours)
  payoutProcessingTime: {
    paypal: 1,
    bank_transfer: 3,
    crypto: 2,
    check: 7
  }
};

// Platform fee structure (percentages)
const PLATFORM_FEES = {
  token_purchase: { platform: 5.0, admin: 2.0, moderator: 1.0, creator: 2.0 },
  tip: { platform: 3.0, admin: 1.5, moderator: 0.5, creator: 5.0 },
  subscription: { platform: 10.0, admin: 3.0, moderator: 2.0, creator: 0.0 },
  payout: { platform: 2.0, admin: 0.5, moderator: 0.0, creator: 0.0 }
};

// Get token packages with enhanced information
router.get('/token-packages', async (req, res) => {
  try {
    // Get user's subscription tier for bonus calculation
    let userSubscription = null;
    if (req.headers.authorization) {
      const userId = req.user?.id;
      if (userId) {
        const subResult = await query(
          'SELECT st.token_bonus_percentage, st.name as tier_name FROM user_subscriptions us JOIN subscription_tiers st ON us.tier_id = st.id WHERE us.user_id = $1 AND us.status = $2',
          [userId, 'active']
        );
        userSubscription = subResult.rows[0] || null;
      }
    }

    const packages = [
      {
        id: 'small',
        name: 'Small Pack',
        tokens: 100,
        price: 4.99,
        bonus: userSubscription ? Math.floor(100 * userSubscription.token_bonus_percentage / 100) : 0,
        popular: false,
        per_token: (4.99 / 100).toFixed(4),
        effective_rate: userSubscription ? (4.99 / (100 + (100 * userSubscription.token_bonus_percentage / 100))).toFixed(4) : (4.99 / 100).toFixed(4)
      },
      {
        id: 'medium',
        name: 'Medium Pack',
        tokens: 250,
        price: 9.99,
        bonus: userSubscription ? Math.floor(250 * userSubscription.token_bonus_percentage / 100) : 25,
        popular: true,
        per_token: (9.99 / 250).toFixed(4),
        effective_rate: userSubscription ? (9.99 / (250 + (250 * userSubscription.token_bonus_percentage / 100))).toFixed(4) : (9.99 / 250).toFixed(4)
      },
      {
        id: 'large',
        name: 'Large Pack',
        tokens: 500,
        price: 19.99,
        bonus: userSubscription ? Math.floor(500 * userSubscription.token_bonus_percentage / 100) : 75,
        popular: false,
        per_token: (19.99 / 500).toFixed(4),
        effective_rate: userSubscription ? (19.99 / (500 + (500 * userSubscription.token_bonus_percentage / 100))).toFixed(4) : (19.99 / 500).toFixed(4)
      },
      {
        id: 'mega',
        name: 'Mega Pack',
        tokens: 1000,
        price: 39.99,
        bonus: userSubscription ? Math.floor(1000 * userSubscription.token_bonus_percentage / 100) : 200,
        popular: false,
        per_token: (39.99 / 1000).toFixed(4),
        effective_rate: userSubscription ? (39.99 / (1000 + (1000 * userSubscription.token_bonus_percentage / 100))).toFixed(4) : (39.99 / 1000).toFixed(4)
      },
      {
        id: 'ultimate',
        name: 'Ultimate Pack',
        tokens: 2500,
        price: 99.99,
        bonus: userSubscription ? Math.floor(2500 * userSubscription.token_bonus_percentage / 100) : 500,
        popular: false,
        per_token: (99.99 / 2500).toFixed(4),
        effective_rate: userSubscription ? (99.99 / (2500 + (2500 * userSubscription.token_bonus_percentage / 100))).toFixed(4) : (99.99 / 2500).toFixed(4)
      }
    ];

    // Add subscription information if user is logged in
    const response = { packages };
    if (userSubscription) {
      response.subscription = {
        tier: userSubscription.tier_name,
        bonus_percentage: userSubscription.token_bonus_percentage
      };
    }

    res.json(response);

  } catch (error) {
    console.error('Get token packages error:', error);
    res.status(500).json({ error: 'Failed to fetch token packages' });
  }
});

// Get current token exchange rates
router.get('/exchange-rates', async (req, res) => {
  try {
    // Get the latest active rates from database
    const buyRateResult = await query(
      'SELECT rate FROM token_rates WHERE rate_type = $1 AND is_active = true ORDER BY effective_date DESC LIMIT 1',
      ['buy']
    );
    const sellRateResult = await query(
      'SELECT rate FROM token_rates WHERE rate_type = $1 AND is_active = true ORDER BY effective_date DESC LIMIT 1',
      ['sell']
    );

    const exchangeRates = {
      buy_rate: buyRateResult.rows[0]?.rate || PAYMENT_CONFIG.tokenRates.buy,
      sell_rate: sellRateResult.rows[0]?.rate || PAYMENT_CONFIG.tokenRates.sell,
      last_updated: buyRateResult.rows[0]?.effective_date || new Date().toISOString()
    };

    res.json(exchangeRates);

  } catch (error) {
    console.error('Get exchange rates error:', error);
    res.status(500).json({ error: 'Failed to fetch exchange rates' });
  }
});

// Create Stripe payment intent for token purchase
router.post('/create-payment-intent', [
  authenticateToken,
  body('package_id').isIn(['small', 'medium', 'large', 'mega', 'ultimate']).withMessage('Invalid package'),
  body('currency').optional().isLength({ min: 3, max: 3 }).withMessage('Valid currency code required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    if (!stripe) {
      return res.status(503).json({ 
        error: 'Payment system not configured' 
      });
    }

    const { package_id, currency = 'usd' } = req.body;

    const packages = {
      small: { tokens: 100, price: 4.99, name: 'Small Pack' },
      medium: { tokens: 250, price: 9.99, name: 'Medium Pack', bonus: 25 },
      large: { tokens: 500, price: 19.99, name: 'Large Pack', bonus: 75 },
      mega: { tokens: 1000, price: 39.99, name: 'Mega Pack', bonus: 200 },
      ultimate: { tokens: 2500, price: 99.99, name: 'Ultimate Pack', bonus: 500 }
    };

    const selectedPackage = packages[package_id];
    const totalTokens = selectedPackage.tokens + (selectedPackage.bonus || 0);

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(selectedPackage.price * 100), // Convert to cents
      currency: currency,
      metadata: {
        user_id: req.user.id.toString(),
        package_id: package_id,
        tokens: totalTokens.toString(),
        package_name: selectedPackage.name
      }
    });

    res.json({
      client_secret: paymentIntent.client_secret,
      amount: selectedPackage.price,
      currency: currency,
      tokens: totalTokens,
      package: selectedPackage.name
    });

  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

// Confirm payment and add tokens
router.post('/confirm-payment', [
  authenticateToken,
  body('payment_intent_id').notEmpty().withMessage('Payment intent ID required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    if (!stripe) {
      return res.status(503).json({ 
        error: 'Payment system not configured' 
      });
    }

    const { payment_intent_id } = req.body;

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ 
        error: 'Payment not completed' 
      });
    }

    // Check if payment was already processed
    const existingTransaction = await query(
      'SELECT id FROM transactions WHERE external_id = $1',
      [payment_intent_id]
    );

    if (existingTransaction.rows.length > 0) {
      return res.status(409).json({ error: 'Payment already processed' });
    }

    const { user_id, package_id, tokens, package_name } = paymentIntent.metadata;

    // Verify the user matches
    if (parseInt(user_id) !== req.user.id) {
      return res.status(403).json({ error: 'User mismatch' });
    }

    // Get user current balance
    const userResult = await query(
      'SELECT tokens_balance FROM users WHERE id = $1',
      [req.user.id]
    );

    const currentBalance = userResult.rows[0].tokens_balance;
    const newBalance = currentBalance + parseInt(tokens);

    // Start transaction
    await query('BEGIN');

    try {
      // Add tokens to user account
      await query(
        'UPDATE users SET tokens_balance = $1, total_spent = total_spent + $2 WHERE id = $3',
        [newBalance, parseInt(tokens), req.user.id]
      );

      // Record transaction
      await query(`
        INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, external_id, metadata)
        VALUES ($1, 'purchase', $2, $3, $4, $5, $6)
      `, [
        req.user.id,
        parseInt(tokens),
        currentBalance,
        newBalance,
        payment_intent_id,
        JSON.stringify({
          package_id,
          package_name,
          payment_intent_id: payment_intent_id
        })
      ]);

      await query('COMMIT');

      // Award experience points for token purchase
      try {
        await LevelService.awardTokenPurchaseExperience(req.user.id, parseInt(tokens), payment_intent_id);
      } catch (levelError) {
        console.error('Error awarding experience for token purchase:', levelError);
        // Don't fail the payment if experience award fails
      }

      res.json({
        message: 'Tokens added successfully',
        tokens_added: parseInt(tokens),
        new_balance: newBalance
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

// Get user's transaction history
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const { 
      type, 
      limit = 20, 
      offset = 0 
    } = req.query;

    let whereClause = 'WHERE user_id = $1';
    const params = [req.user.id];
    let paramIndex = 2;

    if (type) {
      whereClause += ` AND type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    params.push(limit, offset);

    const transactionsResult = await query(`
      SELECT 
        id,
        type,
        amount,
        balance_before,
        balance_after,
        status,
        metadata,
        created_at
      FROM transactions
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, params);

    res.json({
      transactions: transactionsResult.rows,
      total: transactionsResult.rows.length
    });

  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Withdraw tokens (for streamers)
router.post('/withdraw', [
  authenticateToken,
  body('amount').isInt({ min: 100, max: 1000000 }).withMessage('Invalid withdrawal amount (min 100, max 1,000,000)'),
  body('method').isIn(['paypal', 'bank_transfer', 'crypto']).withMessage('Valid withdrawal method required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // Only streamers and above can withdraw
    if (!['streamer', 'moderator', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Streamer role required for withdrawals' });
    }

    const { amount, method } = req.body;

    // Get user current balance
    const userResult = await query(
      'SELECT tokens_balance FROM users WHERE id = $1',
      [req.user.id]
    );

    const currentBalance = userResult.rows[0].tokens_balance;

    if (currentBalance < amount) {
      return res.status(400).json({ 
        error: 'Insufficient balance',
        required: amount,
        available: currentBalance
      });
    }

    // Start transaction
    await query('BEGIN');

    try {
      // Deduct tokens
      await query(
        'UPDATE users SET tokens_balance = tokens_balance - $1 WHERE id = $2',
        [amount, req.user.id]
      );

      // Record transaction
      await query(`
        INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, metadata)
        VALUES ($1, 'withdraw', $2, $3, $4, $5)
      `, [
        req.user.id,
        -amount,
        currentBalance,
        currentBalance - amount,
        JSON.stringify({
          method,
          status: 'pending'
        })
      ]);

      await query('COMMIT');

      res.json({
        message: 'Withdrawal request submitted',
        amount: amount,
        method: method,
        status: 'pending'
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Withdraw error:', error);
    res.status(500).json({ error: 'Failed to process withdrawal' });
  }
});

// Stripe webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(400).send('Webhook not configured');
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      
      // Process successful payment
      const { user_id, package_id, tokens, package_name } = paymentIntent.metadata;
      
      try {
        const userResult = await query(
          'SELECT tokens_balance FROM users WHERE id = $1',
          [user_id]
        );

        if (userResult.rows.length > 0) {
          const currentBalance = userResult.rows[0].tokens_balance;
          const newBalance = currentBalance + parseInt(tokens);

          // Add tokens to user
          await query(
            'UPDATE users SET tokens_balance = $1 WHERE id = $2',
            [newBalance, user_id]
          );

          // Record transaction
          await query(`
            INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, external_id, metadata)
            VALUES ($1, 'purchase', $2, $3, $4, $5, $6)
          `, [
            user_id,
            parseInt(tokens),
            currentBalance,
            newBalance,
            paymentIntent.id,
            JSON.stringify({
              package_id,
              package_name,
              payment_intent_id: paymentIntent.id,
              processed_via: 'webhook'
            })
          ]);

          console.log(`✅ Token purchase processed: User ${user_id}, ${tokens} tokens`);
        }
      } catch (error) {
        console.error('Error processing token purchase:', error);
      }
      break;

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      console.log('Payment failed:', failedPayment.id);
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

// ===============================
// TOKEN PAYOUT / CASHOUT SYSTEM
// ===============================

// Request token payout (cashout)
router.post('/request-payout', [
  authenticateToken,
  body('amount_tokens').isInt({ min: 100, max: 1000000 }).withMessage('Invalid token amount (min 100, max 1,000,000)'),
  body('payout_method').isIn(['paypal', 'bank_transfer', 'crypto', 'check']).withMessage('Valid payout method required'),
  body('payout_details').notEmpty().withMessage('Payout details required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // Only verified users with sufficient tokens can request payout
    if (req.user.payment_verification_status !== 'verified') {
      return res.status(403).json({ 
        error: 'Payment verification required before requesting payout' 
      });
    }

    const { amount_tokens, payout_method, payout_details } = req.body;

    // Get user current balance
    const userResult = await query(
      'SELECT tokens_balance, total_earned FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentBalance = userResult.rows[0].tokens_balance;

    if (currentBalance < amount_tokens) {
      return res.status(400).json({ 
        error: 'Insufficient token balance',
        required: amount_tokens,
        available: currentBalance
      });
    }

    // Calculate USD amount and fees
    const exchangeRate = PAYMENT_CONFIG.tokenRates.sell; // tokens to USD
    const grossAmount = amount_tokens * exchangeRate;
    const payoutFee = PLATFORM_FEES.payout;
    const platformFee = grossAmount * (payoutFee.platform / 100);
    const adminFee = grossAmount * (payoutFee.admin / 100);
    const netAmount = grossAmount - platformFee - adminFee;

    if (netAmount < PAYMENT_CONFIG.minPayoutUSD) {
      return res.status(400).json({ 
        error: `Minimum payout amount is $${PAYMENT_CONFIG.minPayoutUSD USD}`,
        calculated_net: netAmount.toFixed(2)
      });
    }

    // Start transaction
    await query('BEGIN');

    try {
      // Deduct tokens from user account
      await query(
        'UPDATE users SET tokens_balance = tokens_balance - $1 WHERE id = $2',
        [amount_tokens, req.user.id]
      );

      // Create payout request record
      const payoutResult = await query(`
        INSERT INTO token_payouts (
          user_id, amount_tokens, amount_usd, payout_method, payout_details,
          conversion_rate, platform_fee_percentage, platform_fee_amount, net_amount, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [
        req.user.id,
        amount_tokens,
        grossAmount,
        payout_method,
        JSON.stringify(payout_details),
        exchangeRate,
        payoutFee.platform,
        platformFee,
        netAmount,
        'pending'
      ]);

      const payout = payoutResult.rows[0];

      // Record transaction
      await query(`
        INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, metadata)
        VALUES ($1, 'payout_request', $2, $3, $4, $5)
      `, [
        req.user.id,
        -amount_tokens,
        currentBalance,
        currentBalance - amount_tokens,
        JSON.stringify({
          payout_id: payout.id,
          payout_method,
          gross_amount: grossAmount,
          platform_fee: platformFee,
          admin_fee: adminFee,
          net_amount: netAmount,
          status: 'pending'
        })
      ]);

      // Update user's pending payout amount
      await query(
        'UPDATE users SET pending_payout_amount = pending_payout_amount + $1 WHERE id = $2',
        [netAmount, req.user.id]
      );

      await query('COMMIT');

      res.json({
        message: 'Payout request submitted successfully',
        payout: {
          id: payout.id,
          amount_tokens: amount_tokens,
          gross_amount: grossAmount.toFixed(2),
          platform_fee: platformFee.toFixed(2),
          admin_fee: adminFee.toFixed(2),
          net_amount: netAmount.toFixed(2),
          processing_time_hours: PAYMENT_CONFIG.payoutProcessingTime[payout_method],
          status: 'pending',
          estimated_completion: new Date(Date.now() + PAYMENT_CONFIG.payoutProcessingTime[payout_method] * 60 * 60 * 1000).toISOString()
        }
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Request payout error:', error);
    res.status(500).json({ error: 'Failed to process payout request' });
  }
});

// Get user's payout history
router.get('/payout-history', authenticateToken, async (req, res) => {
  try {
    const { 
      status,
      limit = 20, 
      offset = 0 
    } = req.query;

    let whereClause = 'WHERE user_id = $1';
    const params = [req.user.id];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    params.push(limit, offset);

    const payoutsResult = await query(`
      SELECT 
        id,
        amount_tokens,
        amount_usd,
        platform_fee_amount,
        net_amount,
        payout_method,
        status,
        admin_notes,
        requested_at,
        processed_at,
        completed_at,
        rejected_at,
        rejection_reason
      FROM token_payouts
      ${whereClause}
      ORDER BY requested_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, params);

    res.json({
      payouts: payoutsResult.rows,
      total: payoutsResult.rows.length
    });

  } catch (error) {
    console.error('Get payout history error:', error);
    res.status(500).json({ error: 'Failed to fetch payout history' });
  }
});

// Get user's payment methods
router.get('/payment-methods', authenticateToken, async (req, res) => {
  try {
    const methodsResult = await query(`
      SELECT 
        id,
        method_type,
        method_name,
        is_default,
        is_verified,
        verification_date,
        created_at
      FROM user_payment_methods
      WHERE user_id = $1
      ORDER BY is_default DESC, created_at DESC
    `, [req.user.id]);

    res.json({
      methods: methodsResult.rows
    });

  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({ error: 'Failed to fetch payment methods' });
  }
});

// Add/Update payment method
router.post('/payment-methods', [
  authenticateToken,
  body('method_type').isIn(['paypal', 'bank_account', 'crypto_wallet', 'check']).withMessage('Invalid method type'),
  body('method_name').isLength({ min: 1, max: 100 }).withMessage('Method name required'),
  body('method_details').notEmpty().withMessage('Method details required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { method_type, method_name, method_details } = req.body;

    // Validate and encrypt sensitive data based on method type
    let encryptedDetails;
    try {
      const cipher = crypto.createCipher('aes-256-cbc', process.env.ENCRYPTION_KEY || 'fallback-key');
      let encrypted = cipher.update(JSON.stringify(method_details), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      encryptedDetails = encrypted;
    } catch (encryptError) {
      return res.status(500).json({ error: 'Failed to encrypt payment details' });
    }

    // If this is set as default, unset other defaults
    if (req.body.is_default) {
      await query(
        'UPDATE user_payment_methods SET is_default = false WHERE user_id = $1',
        [req.user.id]
      );
    }

    // Insert new payment method
    const result = await query(`
      INSERT INTO user_payment_methods (
        user_id, method_type, method_name, method_details, is_default
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING id, method_type, method_name, is_default, created_at
    `, [
      req.user.id,
      method_type,
      method_name,
      encryptedDetails,
      req.body.is_default || false
    ]);

    res.json({
      message: 'Payment method added successfully',
      method: result.rows[0]
    });

  } catch (error) {
    console.error('Add payment method error:', error);
    res.status(500).json({ error: 'Failed to add payment method' });
  }
});

// ===============================
// ADMIN PAYMENT MANAGEMENT
// ===============================

// Get payment analytics
router.get('/admin/analytics', authenticateToken, async (req, res) => {
  try {
    // Check admin access
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { period = '30d' } = req.query;
    let dateFilter = '';
    
    switch (period) {
      case '7d':
        dateFilter = "AND created_at >= NOW() - INTERVAL '7 days'";
        break;
      case '30d':
        dateFilter = "AND created_at >= NOW() - INTERVAL '30 days'";
        break;
      case '90d':
        dateFilter = "AND created_at >= NOW() - INTERVAL '90 days'";
        break;
      default:
        dateFilter = '';
    }

    // Get payment summary
    const summaryResult = await query(`
      SELECT 
        COUNT(*) as total_transactions,
        SUM(CASE WHEN type = 'purchase' THEN amount ELSE 0 END) as total_revenue,
        SUM(CASE WHEN type = 'tip' THEN amount ELSE 0 END) as total_tips,
        SUM(platform_fee) as total_platform_fees,
        SUM(admin_fee) as total_admin_fees
      FROM transactions
      WHERE created_at >= NOW() - INTERVAL '1 year' ${dateFilter}
    `);

    // Get payout summary
    const payoutSummaryResult = await query(`
      SELECT 
        COUNT(*) as total_payouts,
        SUM(net_amount) as total_payout_amount,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_payouts,
        SUM(CASE WHEN status = 'completed' THEN net_amount ELSE 0 END) as completed_amount
      FROM token_payouts
      WHERE requested_at >= NOW() - INTERVAL '1 year' ${dateFilter}
    `);

    // Get top earners
    const topEarnersResult = await query(`
      SELECT 
        u.username,
        u.total_earned,
        u.total_paid_out,
        COUNT(tp.id) as payout_count
      FROM users u
      LEFT JOIN token_payouts tp ON u.id = tp.user_id
      WHERE u.total_earned > 0
      GROUP BY u.id, u.username, u.total_earned, u.total_paid_out
      ORDER BY u.total_earned DESC
      LIMIT 10
    `);

    const analytics = {
      period,
      payments: {
        total_transactions: parseInt(summaryResult.rows[0].total_transactions) || 0,
        total_revenue: parseFloat(summaryResult.rows[0].total_revenue) || 0,
        total_tips: parseFloat(summaryResult.rows[0].total_tips) || 0,
        platform_fees: parseFloat(summaryResult.rows[0].total_platform_fees) || 0,
        admin_fees: parseFloat(summaryResult.rows[0].total_admin_fees) || 0
      },
      payouts: {
        total_payouts: parseInt(payoutSummaryResult.rows[0].total_payouts) || 0,
        total_payout_amount: parseFloat(payoutSummaryResult.rows[0].total_payout_amount) || 0,
        completed_payouts: parseInt(payoutSummaryResult.rows[0].completed_payouts) || 0,
        completed_amount: parseFloat(payoutSummaryResult.rows[0].completed_amount) || 0
      },
      top_earners: topEarnersResult.rows
    };

    res.json(analytics);

  } catch (error) {
    console.error('Get payment analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch payment analytics' });
  }
});

// Process payout (Admin only)
router.post('/admin/process-payout/:payoutId', authenticateToken, async (req, res) => {
  try {
    // Check admin access
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { payoutId } = req.params;
    const { action, admin_notes, external_transaction_id, processor_response } = req.body;

    if (!['approve', 'reject', 'process'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    // Get payout details
    const payoutResult = await query(
      'SELECT * FROM token_payouts WHERE id = $1',
      [payoutId]
    );

    if (payoutResult.rows.length === 0) {
      return res.status(404).json({ error: 'Payout not found' });
    }

    const payout = payoutResult.rows[0];

    if (action === 'approve' && payout.status !== 'pending') {
      return res.status(400).json({ error: 'Payout is not in pending status' });
    }

    if (action === 'reject' && !rejection_reason) {
      return res.status(400).json({ error: 'Rejection reason required' });
    }

    let newStatus;
    let completedAt = null;

    switch (action) {
      case 'approve':
        newStatus = 'processing';
        break;
      case 'reject':
        newStatus = 'rejected';
        break;
      case 'process':
        if (payout.status !== 'processing') {
          return res.status(400).json({ error: 'Payout must be in processing status' });
        }
        newStatus = 'completed';
        completedAt = new Date().toISOString();
        break;
    }

    // Update payout status
    const updateFields = ['status = $1'];
    const updateParams = [newStatus];
    let paramIndex = 2;

    if (admin_notes !== undefined) {
      updateFields.push(`admin_notes = $${paramIndex}`);
      updateParams.push(admin_notes);
      paramIndex++;
    }

    if (completedAt) {
      updateFields.push(`completed_at = $${paramIndex}`);
      updateParams.push(completedAt);
      paramIndex++;
    }

    if (action === 'reject') {
      updateFields.push(`rejection_reason = $${paramIndex}`);
      updateParams.push(rejection_reason);
      updateFields.push(`rejected_at = NOW()`);
      paramIndex++;
    } else if (action === 'process') {
      updateFields.push(`processed_at = NOW()`);
    }

    updateParams.push(payoutId);

    await query(`
      UPDATE token_payouts 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
    `, updateParams);

    // If payout is rejected, return tokens to user and update their balance
    if (action === 'reject') {
      await query('BEGIN');
      try {
        // Return tokens to user
        await query(
          'UPDATE users SET tokens_balance = tokens_balance + $1, pending_payout_amount = pending_payout_amount - $2 WHERE id = $3',
          [payout.amount_tokens, payout.net_amount, payout.user_id]
        );

        // Record refund transaction
        await query(`
          INSERT INTO transactions (user_id, type, amount, metadata)
          VALUES ($1, 'payout_refund', $2, $3)
        `, [
          payout.user_id,
          payout.amount_tokens,
          JSON.stringify({
            payout_id: payout.id,
            reason: rejection_reason,
            refunded_at: new Date().toISOString()
          })
        ]);

        await query('COMMIT');
      } catch (refundError) {
        await query('ROLLBACK');
        throw refundError;
      }
    }

    res.json({
      message: `Payout ${action}ed successfully`,
      payout: {
        id: payoutId,
        status: newStatus,
        updated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Process payout error:', error);
    res.status(500).json({ error: 'Failed to process payout' });
  }
});

// Get payment history for admin
router.get('/admin/payment-history', authenticateToken, async (req, res) => {
  try {
    // Check admin access
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { 
      type,
      limit = 50, 
      offset = 0 
    } = req.query;

    let whereClause = '1=1';
    const params = [];
    let paramIndex = 1;

    if (type) {
      whereClause += ` AND type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    params.push(limit, offset);

    const paymentsResult = await query(`
      SELECT 
        t.id,
        t.user_id,
        t.amount,
        t.platform_fee,
        t.admin_fee,
        t.status,
        t.external_id,
        t.metadata,
        t.created_at,
        u.username
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      WHERE ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, params);

    res.json({
      payments: paymentsResult.rows,
      total: paymentsResult.rows.length
    });

  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

module.exports = router;