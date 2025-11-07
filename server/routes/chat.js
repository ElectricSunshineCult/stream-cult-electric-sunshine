const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { authenticateToken, optionalAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get chat messages for a stream
router.get('/stream/:streamId', [
  optionalAuth,
  body('limit').optional().isInt({ min: 1, max: 100 }),
  body('offset').optional().isInt({ min: 0 })
], async (req, res) => {
  try {
    const { streamId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Verify stream exists
    const streamResult = await query(
      'SELECT is_nsfw FROM streams WHERE id = $1',
      [streamId]
    );

    if (streamResult.rows.length === 0) {
      return res.status(404).json({ error: 'Stream not found' });
    }

    // Check NSFW access if needed
    if (streamResult.rows[0].is_nsfw && (!req.user || !req.user.age_verified)) {
      return res.status(403).json({ 
        error: 'Age verification required for NSFW content' 
      });
    }

    const messagesResult = await query(`
      SELECT 
        m.id,
        m.content,
        m.message_type,
        m.created_at,
        m.is_deleted,
        m.is_moderated,
        u.username as user_name,
        u.role as user_role,
        u.avatar_url as user_avatar,
        m.user_id
      FROM messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.stream_id = $1 AND m.is_deleted = false
      ORDER BY m.created_at DESC
      LIMIT $2 OFFSET $3
    `, [streamId, limit, offset]);

    // Reverse to show oldest first
    const messages = messagesResult.rows.reverse();

    res.json({
      messages,
      total: messages.length
    });

  } catch (error) {
    console.error('Get chat messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Get user's private messages
router.get('/private', authenticateToken, async (req, res) => {
  try {
    const { 
      stream_id, 
      target_user_id, 
      limit = 50, 
      offset = 0 
    } = req.query;

    let whereClause = 'WHERE m.message_type = \'whisper\'';
    const params = [];
    let paramIndex = 1;

    if (stream_id) {
      whereClause += ` AND m.stream_id = $${paramIndex}`;
      params.push(stream_id);
      paramIndex++;
    }

    if (target_user_id) {
      whereClause += ` AND (m.user_id = $${paramIndex} OR m.content LIKE '%to:${target_user_id}:%')`;
      params.push(target_user_id);
      paramIndex++;
    }

    params.push(limit, offset);

    const messagesResult = await query(`
      SELECT 
        m.id,
        m.content,
        m.created_at,
        u.username as user_name,
        u.role as user_role,
        m.user_id
      FROM messages m
      JOIN users u ON m.user_id = u.id
      ${whereClause}
      ORDER BY m.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, params);

    const messages = messagesResult.rows.reverse();

    res.json({
      messages,
      total: messages.length
    });

  } catch (error) {
    console.error('Get private messages error:', error);
    res.status(500).json({ error: 'Failed to fetch private messages' });
  }
});

// Report message (for moderation)
router.post('/report/:messageId', [
  authenticateToken,
  body('reason').isLength({ min: 1, max: 200 }).withMessage('Reason required (max 200 chars)')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { messageId } = req.params;
    const { reason } = req.body;

    // Verify message exists
    const messageResult = await query(`
      SELECT id, stream_id, user_id, content 
      FROM messages 
      WHERE id = $1
    `, [messageId]);

    if (messageResult.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const message = messageResult.rows[0];

    // Create moderation log entry
    await query(`
      INSERT INTO moderation_logs (moderator_id, target_user_id, target_message_id, action, reason)
      VALUES ($1, $2, $3, 'message_reported', $4)
    `, [req.user.id, message.user_id, messageId, reason]);

    res.json({
      message: 'Message reported successfully',
      message_id: messageId
    });

  } catch (error) {
    console.error('Report message error:', error);
    res.status(500).json({ error: 'Failed to report message' });
  }
});

// Get message analytics for streamer
router.get('/analytics/streamer', authenticateToken, async (req, res) => {
  try {
    const { period = '7d' } = req.query;

    let dateFilter = '';
    if (period === '7d') {
      dateFilter = "AND m.created_at >= NOW() - INTERVAL '7 days'";
    } else if (period === '30d') {
      dateFilter = "AND m.created_at >= NOW() - INTERVAL '30 days'";
    } else if (period === '90d') {
      dateFilter = "AND m.created_at >= NOW() - INTERVAL '90 days'";
    }

    // Get message stats
    const messageStatsResult = await query(`
      SELECT 
        COUNT(*) as total_messages,
        COUNT(DISTINCT m.user_id) as unique_chatters,
        COUNT(CASE WHEN m.message_type = 'tip' THEN 1 END) as tip_messages,
        COUNT(CASE WHEN m.message_type = 'whisper' THEN 1 END) as private_messages
      FROM messages m
      JOIN streams s ON m.stream_id = s.id
      WHERE s.streamer_id = $1 ${dateFilter}
    `, [req.user.id]);

    // Get hourly activity
    const hourlyResult = await query(`
      SELECT 
        EXTRACT(HOUR FROM m.created_at) as hour,
        COUNT(*) as message_count
      FROM messages m
      JOIN streams s ON m.stream_id = s.id
      WHERE s.streamer_id = $1 ${dateFilter}
      GROUP BY EXTRACT(HOUR FROM m.created_at)
      ORDER BY hour
    `, [req.user.id]);

    // Get most active chatters
    const topChattersResult = await query(`
      SELECT 
        u.username,
        COUNT(m.id) as message_count
      FROM messages m
      JOIN users u ON m.user_id = u.id
      JOIN streams s ON m.stream_id = s.id
      WHERE s.streamer_id = $1 ${dateFilter}
      GROUP BY u.username
      ORDER BY message_count DESC
      LIMIT 10
    `, [req.user.id]);

    res.json({
      summary: messageStatsResult.rows[0],
      hourly: hourlyResult.rows,
      top_chatters: topChattersResult.rows
    });

  } catch (error) {
    console.error('Get chat analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch chat analytics' });
  }
});

// Moderator actions
router.post('/moderate/:messageId', [
  authenticateToken,
  requireRole(['moderator', 'admin']),
  body('action').isIn(['delete', 'warn', 'ban']).withMessage('Valid action required'),
  body('reason').optional().isLength({ max: 500 }).withMessage('Reason too long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { messageId } = req.params;
    const { action, reason = '' } = req.body;

    // Get message details
    const messageResult = await query(`
      SELECT m.*, s.streamer_id, s.id as stream_id
      FROM messages m
      JOIN streams s ON m.stream_id = s.id
      WHERE m.id = $1
    `, [messageId]);

    if (messageResult.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const message = messageResult.rows[0];

    // Create moderation log
    await query(`
      INSERT INTO moderation_logs (moderator_id, target_user_id, target_message_id, target_stream_id, action, reason)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [req.user.id, message.user_id, messageId, message.stream_id, action, reason]);

    if (action === 'delete') {
      // Mark message as deleted
      await query(
        'UPDATE messages SET is_deleted = true, is_moderated = true WHERE id = $1',
        [messageId]
      );
    } else if (action === 'warn') {
      // Mark message as moderated (user was warned)
      await query(
        'UPDATE messages SET is_moderated = true WHERE id = $1',
        [messageId]
      );
    } else if (action === 'ban') {
      // Ban user
      await query(
        'UPDATE users SET is_banned = true, ban_reason = $1 WHERE id = $2',
        [reason, message.user_id]
      );

      // Delete all user's messages
      await query(
        'UPDATE messages SET is_deleted = true WHERE user_id = $1',
        [message.user_id]
      );
    }

    res.json({
      message: `Message ${action} successful`,
      message_id: messageId,
      action,
      target_user: message.user_id
    });

  } catch (error) {
    console.error('Moderate message error:', error);
    res.status(500).json({ error: 'Failed to moderate message' });
  }
});

// Get moderation logs
router.get('/moderation/logs', [
  authenticateToken,
  requireRole(['moderator', 'admin']),
  body('limit').optional().isInt({ min: 1, max: 100 }),
  body('offset').optional().isInt({ min: 0 })
], async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const logsResult = await query(`
      SELECT 
        ml.id,
        ml.action,
        ml.reason,
        ml.duration_minutes,
        ml.created_at,
        m.username as moderator_name,
        tu.username as target_user_name,
        ts.title as target_stream_title
      FROM moderation_logs ml
      JOIN users m ON ml.moderator_id = m.id
      LEFT JOIN users tu ON ml.target_user_id = tu.id
      LEFT JOIN streams ts ON ml.target_stream_id = ts.id
      ORDER BY ml.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    res.json({
      logs: logsResult.rows,
      total: logsResult.rows.length
    });

  } catch (error) {
    console.error('Get moderation logs error:', error);
    res.status(500).json({ error: 'Failed to fetch moderation logs' });
  }
});

module.exports = router;