const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get quality presets
router.get('/quality-presets', async (req, res) => {
  try {
    const presetsResult = await query(`
      SELECT id, name, resolution, framerate, bitrate, is_default
      FROM screen_share_quality_presets
      ORDER BY is_default DESC, name ASC
    `);

    res.json({
      presets: presetsResult.rows
    });

  } catch (error) {
    console.error('Get quality presets error:', error);
    res.status(500).json({ error: 'Failed to fetch quality presets' });
  }
});

// Get active screen share session for a stream
router.get('/active/:streamId', async (req, res) => {
  try {
    const { streamId } = req.params;

    const sessionResult = await query(`
      SELECT 
        s.id,
        s.stream_id,
        s.streamer_id,
        s.session_type,
        s.title,
        s.description,
        s.is_active,
        s.quality_settings,
        s.started_at,
        u.username as streamer_name
      FROM screen_sharing_sessions s
      JOIN users u ON s.streamer_id = u.id
      WHERE s.stream_id = $1 AND s.is_active = true
      ORDER BY s.started_at DESC
      LIMIT 1
    `, [streamId]);

    if (sessionResult.rows.length === 0) {
      return res.json({ session: null });
    }

    const session = sessionResult.rows[0];

    // Get viewer count
    const viewersResult = await query(`
      SELECT COUNT(*) as viewer_count
      FROM screen_share_viewers
      WHERE session_id = $1 AND left_at IS NULL
    `, [session.id]);

    session.viewer_count = parseInt(viewersResult.rows[0].viewer_count);

    res.json({ session });

  } catch (error) {
    console.error('Get active session error:', error);
    res.status(500).json({ error: 'Failed to fetch active session' });
  }
});

// Start screen share session
router.post('/start', [
  authenticateToken,
  requireRole(['streamer', 'admin']),
  body('stream_id').isInt({ min: 1 }).withMessage('Valid stream ID required'),
  body('session_type').isIn(['screen', 'application', 'tab', 'window']).withMessage('Invalid session type'),
  body('title').isLength({ min: 1, max: 255 }).withMessage('Title required (1-255 chars)'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description too long'),
  body('quality_settings').isObject().withMessage('Quality settings required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { 
      stream_id, 
      session_type, 
      title, 
      description = '', 
      quality_settings 
    } = req.body;

    // Verify stream ownership
    const streamResult = await query(
      'SELECT * FROM streams WHERE id = $1 AND streamer_id = $2',
      [stream_id, req.user.id]
    );

    if (streamResult.rows.length === 0) {
      return res.status(404).json({ error: 'Stream not found or access denied' });
    }

    // Check if stream is live
    if (!streamResult.rows[0].is_live) {
      return res.status(400).json({ error: 'Stream must be live to start screen sharing' });
    }

    // Check for existing active session and stop it
    await query(
      'UPDATE screen_sharing_sessions SET is_active = false, ended_at = CURRENT_TIMESTAMP WHERE stream_id = $1 AND is_active = true',
      [stream_id]
    );

    // Start new screen share session
    const sessionResult = await query(`
      INSERT INTO screen_sharing_sessions (
        stream_id, 
        streamer_id, 
        session_type, 
        title, 
        description, 
        quality_settings
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, stream_id, streamer_id, session_type, title, description, quality_settings, started_at
    `, [stream_id, req.user.id, session_type, title, description, JSON.stringify(quality_settings)]);

    const session = sessionResult.rows[0];

    res.status(201).json({
      message: 'Screen share session started successfully',
      session
    });

  } catch (error) {
    console.error('Start screen share error:', error);
    res.status(500).json({ error: 'Failed to start screen share session' });
  }
});

// Stop screen share session
router.post('/stop/:sessionId', [
  authenticateToken,
  requireRole(['streamer', 'admin'])
], async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Verify session ownership
    const sessionResult = await query(
      'SELECT * FROM screen_sharing_sessions WHERE id = $1 AND streamer_id = $2',
      [sessionId, req.user.id]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Screen share session not found or access denied' });
    }

    // Stop the session
    await query(
      'UPDATE screen_sharing_sessions SET is_active = false, ended_at = CURRENT_TIMESTAMP WHERE id = $1',
      [sessionId]
    );

    // Mark all viewers as left
    await query(
      'UPDATE screen_share_viewers SET left_at = CURRENT_TIMESTAMP WHERE session_id = $1 AND left_at IS NULL',
      [sessionId]
    );

    res.json({ message: 'Screen share session stopped successfully' });

  } catch (error) {
    console.error('Stop screen share error:', error);
    res.status(500).json({ error: 'Failed to stop screen share session' });
  }
});

// Get screen share session details
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const sessionResult = await query(`
      SELECT 
        s.id,
        s.stream_id,
        s.streamer_id,
        s.session_type,
        s.title,
        s.description,
        s.is_active,
        s.quality_settings,
        s.started_at,
        s.ended_at,
        u.username as streamer_name,
        st.title as stream_title
      FROM screen_sharing_sessions s
      JOIN users u ON s.streamer_id = u.id
      JOIN streams st ON s.stream_id = st.id
      WHERE s.id = $1
    `, [sessionId]);

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Screen share session not found' });
    }

    const session = sessionResult.rows[0];

    // Get viewer statistics
    const viewersResult = await query(`
      SELECT 
        COUNT(*) as total_viewers,
        COUNT(CASE WHEN left_at IS NULL THEN 1 END) as active_viewers
      FROM screen_share_viewers
      WHERE session_id = $1
    `, [sessionId]);

    session.viewer_stats = viewersResult.rows[0];

    res.json({ session });

  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Failed to fetch screen share session' });
  }
});

// Join screen share session
router.post('/join/:sessionId', [
  authenticateToken
], async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Check if session exists and is active
    const sessionResult = await query(`
      SELECT s.*, st.is_live
      FROM screen_sharing_sessions s
      JOIN streams st ON s.stream_id = st.id
      WHERE s.id = $1 AND s.is_active = true
    `, [sessionId]);

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Screen share session not found or inactive' });
    }

    const session = sessionResult.rows[0];

    if (!session.is_live) {
      return res.status(400).json({ error: 'Stream is not live' });
    }

    // Check if user is already viewing
    const existingViewer = await query(
      'SELECT id FROM screen_share_viewers WHERE session_id = $1 AND user_id = $2',
      [sessionId, req.user.id]
    );

    if (existingViewer.rows.length === 0) {
      // Add viewer
      await query(
        'INSERT INTO screen_share_viewers (session_id, user_id) VALUES ($1, $2)',
        [sessionId, req.user.id]
      );
    } else {
      // Update left_at to null if they were previously viewing
      await query(
        'UPDATE screen_share_viewers SET left_at = NULL WHERE session_id = $1 AND user_id = $2',
        [sessionId, req.user.id]
      );
    }

    res.json({ message: 'Joined screen share session' });

  } catch (error) {
    console.error('Join screen share error:', error);
    res.status(500).json({ error: 'Failed to join screen share session' });
  }
});

// Leave screen share session
router.post('/leave/:sessionId', [
  authenticateToken
], async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Mark viewer as left
    await query(
      'UPDATE screen_share_viewers SET left_at = CURRENT_TIMESTAMP WHERE session_id = $1 AND user_id = $2 AND left_at IS NULL',
      [sessionId, req.user.id]
    );

    res.json({ message: 'Left screen share session' });

  } catch (error) {
    console.error('Leave screen share error:', error);
    res.status(500).json({ error: 'Failed to leave screen share session' });
  }
});

// Get screen share sessions for a streamer
router.get('/streamer/:streamerId/sessions', [
  authenticateToken,
  requireRole(['streamer', 'admin'])
], async (req, res) => {
  try {
    const { streamerId } = req.params;

    // Verify ownership
    if (req.user.role !== 'admin' && req.user.id !== parseInt(streamerId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const sessionsResult = await query(`
      SELECT 
        s.id,
        s.stream_id,
        s.session_type,
        s.title,
        s.description,
        s.is_active,
        s.started_at,
        s.ended_at,
        st.title as stream_title,
        (SELECT COUNT(*) FROM screen_share_viewers WHERE session_id = s.id) as total_viewers,
        (SELECT COUNT(*) FROM screen_share_viewers WHERE session_id = s.id AND left_at IS NULL) as active_viewers
      FROM screen_sharing_sessions s
      JOIN streams st ON s.stream_id = st.id
      WHERE s.streamer_id = $1
      ORDER BY s.started_at DESC
      LIMIT 50
    `, [streamerId]);

    res.json({ 
      sessions: sessionsResult.rows,
      total: sessionsResult.rows.length
    });

  } catch (error) {
    console.error('Get streamer sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch screen share sessions' });
  }
});

// Update screen share session settings
router.put('/session/:sessionId', [
  authenticateToken,
  requireRole(['streamer', 'admin']),
  body('title').optional().isLength({ min: 1, max: 255 }),
  body('description').optional().isLength({ max: 500 }),
  body('quality_settings').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { sessionId } = req.params;
    const { title, description, quality_settings } = req.body;

    // Verify session ownership
    const sessionResult = await query(
      'SELECT * FROM screen_sharing_sessions WHERE id = $1 AND streamer_id = $2',
      [sessionId, req.user.id]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Screen share session not found or access denied' });
    }

    // Build update query
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex}`);
      params.push(title);
      paramIndex++;
    }

    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      params.push(description);
      paramIndex++;
    }

    if (quality_settings !== undefined) {
      updates.push(`quality_settings = $${paramIndex}`);
      params.push(JSON.stringify(quality_settings));
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(sessionId);

    const updateQuery = `
      UPDATE screen_sharing_sessions 
      SET ${updates.join(', ')} 
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const updatedSessionResult = await query(updateQuery, params);
    const updatedSession = updatedSessionResult.rows[0];

    res.json({
      message: 'Screen share session updated successfully',
      session: updatedSession
    });

  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({ error: 'Failed to update screen share session' });
  }
});

// Get screen share analytics
router.get('/analytics/:streamerId', [
  authenticateToken,
  requireRole(['streamer', 'admin'])
], async (req, res) => {
  try {
    const { streamerId } = req.params;

    // Verify ownership
    if (req.user.role !== 'admin' && req.user.id !== parseInt(streamerId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get overall statistics
    const statsResult = await query(`
      SELECT 
        COUNT(*) as total_sessions,
        COUNT(CASE WHEN is_active THEN 1 END) as active_sessions,
        AVG(EXTRACT(EPOCH FROM (COALESCE(ended_at, CURRENT_TIMESTAMP) - started_at))/60) as avg_duration_minutes,
        MAX(viewer_count) as peak_viewers
      FROM screen_sharing_sessions
      WHERE streamer_id = $1
    `, [streamerId]);

    // Get session type breakdown
    const typeBreakdownResult = await query(`
      SELECT 
        session_type,
        COUNT(*) as session_count,
        AVG(EXTRACT(EPOCH FROM (COALESCE(ended_at, CURRENT_TIMESTAMP) - started_at))/60) as avg_duration_minutes
      FROM screen_sharing_sessions
      WHERE streamer_id = $1
      GROUP BY session_type
      ORDER BY session_count DESC
    `, [streamerId]);

    // Get recent sessions
    const recentSessionsResult = await query(`
      SELECT 
        s.id,
        s.title,
        s.session_type,
        s.started_at,
        s.ended_at,
        s.quality_settings,
        st.title as stream_title,
        (SELECT COUNT(*) FROM screen_share_viewers WHERE session_id = s.id AND left_at IS NULL) as active_viewers
      FROM screen_sharing_sessions s
      JOIN streams st ON s.stream_id = st.id
      WHERE s.streamer_id = $1
      ORDER BY s.started_at DESC
      LIMIT 10
    `, [streamerId]);

    res.json({
      overview: statsResult.rows[0],
      type_breakdown: typeBreakdownResult.rows,
      recent_sessions: recentSessionsResult.rows
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch screen share analytics' });
  }
});

module.exports = router;