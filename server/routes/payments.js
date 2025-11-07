const express = require('express');
const { body, validationResult } = require('express-validator');
const Stripe = require('stripe');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const LevelService = require('../services/levelService');

const router = express.Router();

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// Get token packages
router.get('/token-packages', async (req, res) => {
  try {
    const packages = [
      {
        id: 'small',
        name: 'Small Pack',
        tokens: 100,
        price: 4.99,
        bonus: 0,
        popular: false
      },
      {
        id: 'medium',
        name: 'Medium Pack',
        tokens: 250,
        price: 9.99,
        bonus: 25,
        popular: true
      },
      {
        id: 'large',
        name: 'Large Pack',
        tokens: 500,
        price: 19.99,
        bonus: 75,
        popular: false
      },
      {
        id: 'mega',
        name: 'Mega Pack',
        tokens: 1000,
        price: 39.99,
        bonus: 200,
        popular: false
      },
      {
        id: 'ultimate',
        name: 'Ultimate Pack',
        tokens: 2500,
        price: 99.99,
        bonus: 500,
        popular: false
      }
    ];

    res.json({ packages });

  } catch (error) {
    console.error('Get token packages error:', error);
    res.status(500).json({ error: 'Failed to fetch token packages' });
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

// Get payment history for admin
router.get('/admin/payment-history', [
  authenticateToken,
  // requireRole(['admin']) // Uncomment when admin middleware is properly set up
], async (req, res) => {
  try {
    const { 
      limit = 50, 
      offset = 0 
    } = req.query;

    const paymentsResult = await query(`
      SELECT 
        t.id,
        t.user_id,
        t.amount,
        t.balance_before,
        t.balance_after,
        t.status,
        t.external_id,
        t.metadata,
        t.created_at,
        u.username
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      WHERE t.type = 'purchase'
      ORDER BY t.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

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