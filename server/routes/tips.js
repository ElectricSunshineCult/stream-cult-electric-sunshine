const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const LevelService = require('../services/levelService');

const router = express.Router();

// Get user's tip history (sent)
router.get('/sent', authenticateToken, async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    const tipsResult = await query(`
      SELECT 
        t.id,
        t.amount,
        t.message,
        t.action_type,
        t.action_data,
        t.status,
        t.created_at,
        s.title as stream_title,
        s.id as stream_id,
        u.username as streamer_name
      FROM tips t
      JOIN users u ON t.to_streamer_id = u.id
      JOIN streams s ON t.stream_id = s.id
      WHERE t.from_user_id = $1
      ORDER BY t.created_at DESC
      LIMIT $2 OFFSET $3
    `, [req.user.id, limit, offset]);

    res.json({
      tips: tipsResult.rows,
      total: tipsResult.rows.length
    });

  } catch (error) {
    console.error('Get sent tips error:', error);
    res.status(500).json({ error: 'Failed to fetch sent tips' });
  }
});

// Get user's tip history (received)
router.get('/received', authenticateToken, async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    const tipsResult = await query(`
      SELECT 
        t.id,
        t.amount,
        t.message,
        t.action_type,
        t.action_data,
        t.status,
        t.created_at,
        s.title as stream_title,
        s.id as stream_id,
        u.username as from_user_name
      FROM tips t
      JOIN users u ON t.from_user_id = u.id
      JOIN streams s ON t.stream_id = s.id
      WHERE t.to_streamer_id = $1
      ORDER BY t.created_at DESC
      LIMIT $2 OFFSET $3
    `, [req.user.id, limit, offset]);

    res.json({
      tips: tipsResult.rows,
      total: tipsResult.rows.length
    });

  } catch (error) {
    console.error('Get received tips error:', error);
    res.status(500).json({ error: 'Failed to fetch received tips' });
  }
});

// Get stream tip history
router.get('/stream/:streamId', async (req, res) => {
  try {
    const { streamId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const tipsResult = await query(`
      SELECT 
        t.id,
        t.amount,
        t.message,
        t.action_type,
        t.action_data,
        t.created_at,
        u.username as from_user_name,
        t.from_user_id
      FROM tips t
      JOIN users u ON t.from_user_id = u.id
      WHERE t.stream_id = $1
      ORDER BY t.created_at DESC
      LIMIT $2 OFFSET $3
    `, [streamId, limit, offset]);

    res.json({
      tips: tipsResult.rows,
      total: tipsResult.rows.length
    });

  } catch (error) {
    console.error('Get stream tips error:', error);
    res.status(500).json({ error: 'Failed to fetch stream tips' });
  }
});

// Send tip
router.post('/send', [
  authenticateToken,
  body('stream_id').isInt({ min: 1 }).withMessage('Valid stream ID required'),
  body('streamer_id').isInt({ min: 1 }).withMessage('Valid streamer ID required'),
  body('amount').isInt({ min: 1, max: 1000000 }).withMessage('Valid amount required (1-1000000)'),
  body('message').optional().isLength({ max: 200 }).withMessage('Message too long'),
  body('action_type').optional().isIn(['review', 'challenge', 'request', 'custom']).withMessage('Invalid action type'),
  body('action_data').optional().isObject().withMessage('Action data must be object')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { stream_id, streamer_id, amount, message = '', action_type, action_data } = req.body;

    // Check if stream exists and is live
    const streamResult = await query(
      'SELECT * FROM streams WHERE id = $1 AND is_live = true',
      [stream_id]
    );

    if (streamResult.rows.length === 0) {
      return res.status(404).json({ error: 'Stream not found or not live' });
    }

    // Check if streamer exists
    const streamerResult = await query(
      'SELECT id, username, role FROM users WHERE id = $1',
      [streamer_id]
    );

    if (streamerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Streamer not found' });
    }

    // Check if user has enough tokens
    const userResult = await query(
      'SELECT tokens_balance FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows[0].tokens_balance < amount) {
      return res.status(400).json({ 
        error: 'Insufficient tokens',
        required: amount,
        available: userResult.rows[0].tokens_balance
      });
    }

    // Start transaction
    await query('BEGIN');

    try {
      // Create tip record
      const tipResult = await query(`
        INSERT INTO tips (from_user_id, to_streamer_id, stream_id, amount, message, action_type, action_data)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [req.user.id, streamer_id, stream_id, amount, message, action_type, JSON.stringify(action_data || {})]);

      const tip = tipResult.rows[0];

      // Deduct tokens from sender
      await query(`
        UPDATE users 
        SET tokens_balance = tokens_balance - $1, 
            total_tips_sent = total_tips_sent + $1,
            total_spent = total_spent + $1
        WHERE id = $2
      `, [amount, req.user.id]);

      // Add tokens to streamer
      await query(`
        UPDATE users 
        SET tokens_balance = tokens_balance + $1, 
            total_tips_earned = total_tips_earned + $1,
            total_earned = total_earned + $1
        WHERE id = $2
      `, [amount, streamer_id]);

      // Update stream total tips
      await query(`
        UPDATE streams 
        SET total_tips = total_tips + $1 
        WHERE id = $2
      `, [amount, stream_id]);

      // Record transaction
      await query(`
        INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, metadata)
        VALUES ($1, 'tip_send', $2, $3, $4, $5)
      `, [
        req.user.id,
        -amount,
        userResult.rows[0].tokens_balance,
        userResult.rows[0].tokens_balance - amount,
        JSON.stringify({ tip_id: tip.id, streamer_id, stream_id, message, action_type })
      ]);

      const newBalance = userResult.rows[0].tokens_balance - amount;
      await query(`
        INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, metadata)
        VALUES ($1, 'tip_receive', $2, $3, $4, $5)
      `, [
        streamer_id,
        amount,
        null, // We'll fetch current balance
        null,
        JSON.stringify({ tip_id: tip.id, from_user_id: req.user.id, stream_id, message, action_type })
      ]);

      await query('COMMIT');

      // Award experience points for tipping
      try {
        await LevelService.awardTipExperience(req.user.id, streamer_id, amount, tip.id);
      } catch (levelError) {
        console.error('Error awarding experience for tip:', levelError);
        // Don't fail the tip if experience award fails
      }

      res.status(201).json({
        message: 'Tip sent successfully',
        tip: {
          id: tip.id,
          amount: tip.amount,
          message: tip.message,
          action_type: tip.action_type,
          action_data: tip.action_data,
          created_at: tip.created_at
        }
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Send tip error:', error);
    res.status(500).json({ error: 'Failed to send tip' });
  }
});

// Get tip analytics for streamer
router.get('/analytics/streamer', authenticateToken, async (req, res) => {
  try {
    const { period = '30d' } = req.query;

    let dateFilter = '';
    if (period === '7d') {
      dateFilter = "AND t.created_at >= NOW() - INTERVAL '7 days'";
    } else if (period === '30d') {
      dateFilter = "AND t.created_at >= NOW() - INTERVAL '30 days'";
    } else if (period === '90d') {
      dateFilter = "AND t.created_at >= NOW() - INTERVAL '90 days'";
    }

    const analyticsResult = await query(`
      SELECT 
        COUNT(*) as total_tips,
        COALESCE(SUM(t.amount), 0) as total_amount,
        COALESCE(AVG(t.amount), 0) as average_amount,
        COALESCE(MAX(t.amount), 0) as max_tip,
        COUNT(DISTINCT t.from_user_id) as unique_tippers
      FROM tips t
      WHERE t.to_streamer_id = $1 ${dateFilter}
    `, [req.user.id]);

    const hourlyResult = await query(`
      SELECT 
        EXTRACT(HOUR FROM t.created_at) as hour,
        COUNT(*) as count,
        SUM(t.amount) as total_amount
      FROM tips t
      WHERE t.to_streamer_id = $1 ${dateFilter}
      GROUP BY EXTRACT(HOUR FROM t.created_at)
      ORDER BY hour
    `, [req.user.id]);

    const dailyResult = await query(`
      SELECT 
        DATE(t.created_at) as date,
        COUNT(*) as count,
        SUM(t.amount) as total_amount
      FROM tips t
      WHERE t.to_streamer_id = $1 ${dateFilter}
      GROUP BY DATE(t.created_at)
      ORDER BY date DESC
      LIMIT 30
    `, [req.user.id]);

    res.json({
      summary: analyticsResult.rows[0],
      hourly: hourlyResult.rows,
      daily: dailyResult.rows
    });

  } catch (error) {
    console.error('Get tip analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch tip analytics' });
  }
});

// Get top tippers for stream
router.get('/stream/:streamId/tippers', async (req, res) => {
  try {
    const { streamId } = req.params;
    const { limit = 10 } = req.query;

    const tippersResult = await query(`
      SELECT 
        u.id,
        u.username,
        SUM(t.amount) as total_amount,
        COUNT(t.id) as tip_count,
        MAX(t.created_at) as last_tip
      FROM tips t
      JOIN users u ON t.from_user_id = u.id
      WHERE t.stream_id = $1
      GROUP BY u.id, u.username
      ORDER BY total_amount DESC
      LIMIT $2
    `, [streamId, limit]);

    res.json({ top_tippers: tippersResult.rows });

  } catch (error) {
    console.error('Get top tippers error:', error);
    res.status(500).json({ error: 'Failed to fetch top tippers' });
  }
});

// Tip action fulfillment (streamer fulfills tip request)
router.post('/fulfill/:tipId', [
  authenticateToken,
  body('status').isIn(['completed', 'failed', 'cancelled']).withMessage('Valid status required'),
  body('notes').optional().isLength({ max: 500 }).withMessage('Notes too long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { tipId } = req.params;
    const { status, notes = '' } = req.body;

    // Verify tip exists and user is the streamer
    const tipResult = await query(`
      SELECT t.*, s.streamer_id 
      FROM tips t
      JOIN streams s ON t.stream_id = s.id
      WHERE t.id = $1
    `, [tipId]);

    if (tipResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tip not found' });
    }

    if (tipResult.rows[0].streamer_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to fulfill this tip' });
    }

    // Update tip status
    await query(`
      UPDATE tips 
      SET status = $1, 
          notes = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [status, notes, tipId]);

    res.json({
      message: 'Tip fulfillment updated successfully',
      tip_id: tipId,
      status
    });

  } catch (error) {
    console.error('Fulfill tip error:', error);
    res.status(500).json({ error: 'Failed to update tip fulfillment' });
  }
});

module.exports = router;