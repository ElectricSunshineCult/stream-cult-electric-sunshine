const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { authenticateToken, requireRole, verifyNSFW } = require('../middleware/auth');
const { generateStreamerToken, verifyStreamerToken } = require('../services/tokenService');

const router = express.Router();

// Get all live streams
router.get('/live', async (req, res) => {
  try {
    const { 
      region_id, 
      category_id, 
      sort = 'viewer_count', 
      limit = 20, 
      offset = 0,
      nsfw = 'false'
    } = req.query;

    // Build query
    let whereClause = 'WHERE s.is_live = true';
    const params = [];
    let paramIndex = 1;

    // Add region filter
    if (region_id) {
      whereClause += ` AND s.region_id = $${paramIndex}`;
      params.push(region_id);
      paramIndex++;
    }

    // Add category filter
    if (category_id) {
      whereClause += ` AND s.category_id = $${paramIndex}`;
      params.push(category_id);
      paramIndex++;
    }

    // Add NSFW filter
    if (nsfw === 'false') {
      whereClause += ` AND s.is_nsfw = false`;
    }

    // Add sorting
    let orderBy = 's.viewer_count DESC, s.total_tips DESC';
    if (sort === 'recent') {
      orderBy = 's.start_time DESC';
    } else if (sort === 'tips') {
      orderBy = 's.total_tips DESC';
    } else if (sort === 'uptime') {
      orderBy = 's.start_time ASC';
    }

    const streamsResult = await query(`
      SELECT 
        s.id,
        s.title,
        s.description,
        s.viewer_count,
        s.total_tips,
        s.start_time,
        s.thumbnail_url,
        s.language,
        s.is_nsfw,
        u.username as streamer_name,
        u.id as streamer_id,
        c.name as category_name,
        c.id as category_id,
        r.name as region_name,
        r.code as region_code
      FROM streams s
      JOIN users u ON s.streamer_id = u.id
      JOIN categories c ON s.category_id = c.id
      JOIN regions r ON s.region_id = r.id
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limit, offset]);

    res.json({
      streams: streamsResult.rows,
      total: streamsResult.rows.length
    });

  } catch (error) {
    console.error('Get live streams error:', error);
    res.status(500).json({ error: 'Failed to fetch streams' });
  }
});

// Get specific stream
router.get('/:streamId', async (req, res) => {
  try {
    const { streamId } = req.params;

    const streamResult = await query(`
      SELECT 
        s.id,
        s.title,
        s.description,
        s.viewer_count,
        s.total_tips,
        s.start_time,
        s.thumbnail_url,
        s.language,
        s.is_nsfw,
        s.quality_settings,
        u.username as streamer_name,
        u.id as streamer_id,
        u.bio as streamer_bio,
        c.name as category_name,
        c.id as category_id,
        r.name as region_name,
        r.code as region_code
      FROM streams s
      JOIN users u ON s.streamer_id = u.id
      JOIN categories c ON s.category_id = c.id
      JOIN regions r ON s.region_id = r.id
      WHERE s.id = $1
    `, [streamId]);

    if (streamResult.rows.length === 0) {
      return res.status(404).json({ error: 'Stream not found' });
    }

    const stream = streamResult.rows[0];

    // Check NSFW access if needed
    if (stream.is_nsfw && (!req.user || !req.user.age_verified)) {
      return res.status(403).json({ 
        error: 'Age verification required for NSFW content' 
      });
    }

    res.json({ stream });

  } catch (error) {
    console.error('Get stream error:', error);
    res.status(500).json({ error: 'Failed to fetch stream' });
  }
});

// Create new stream (streamers only)
router.post('/', [
  authenticateToken,
  requireRole(['streamer', 'admin']),
  body('title').isLength({ min: 1, max: 500 }).withMessage('Title required (1-500 chars)'),
  body('description').optional().isLength({ max: 2000 }).withMessage('Description too long'),
  body('category_id').isInt({ min: 1 }).withMessage('Valid category required'),
  body('region_id').isInt({ min: 1 }).withMessage('Valid region required'),
  body('is_nsfw').optional().isBoolean().withMessage('NSFW flag must be boolean')
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
      title, 
      description = '', 
      category_id, 
      region_id, 
      is_nsfw = false 
    } = req.body;

    // Create stream
    const streamResult = await query(`
      INSERT INTO streams (streamer_id, title, description, category_id, region_id, is_nsfw)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, title, description, category_id, region_id, is_nsfw, created_at
    `, [req.user.id, title, description, category_id, region_id, is_nsfw]);

    const stream = streamResult.rows[0];

    res.status(201).json({
      message: 'Stream created successfully',
      stream
    });

  } catch (error) {
    console.error('Create stream error:', error);
    res.status(500).json({ error: 'Failed to create stream' });
  }
});

// Start stream
router.post('/:streamId/start', [
  authenticateToken,
  requireRole(['streamer', 'admin'])
], async (req, res) => {
  try {
    const { streamId } = req.params;

    // Verify stream ownership
    const streamResult = await query(
      'SELECT * FROM streams WHERE id = $1 AND streamer_id = $2',
      [streamId, req.user.id]
    );

    if (streamResult.rows.length === 0) {
      return res.status(404).json({ error: 'Stream not found or access denied' });
    }

    // Generate streaming tokens
    const streamKey = require('crypto').randomBytes(32).toString('hex');
    const rtmpUrl = `${process.env.RTMP_BASE_URL || 'rtmp://localhost/live'}/${streamKey}`;
    
    // Generate tokens
    const streamerToken = generateStreamerToken(streamId);
    const obsToken = require('../services/tokenService').generateOBSToken(streamId, req.user.id);

    // Start stream
    await query(`
      UPDATE streams 
      SET is_live = true, 
          start_time = CURRENT_TIMESTAMP, 
          stream_key = $1, 
          rtmp_url = $2 
      WHERE id = $3
    `, [streamKey, rtmpUrl, streamId]);

    res.json({
      message: 'Stream started successfully',
      streamKey,
      rtmpUrl,
      streamerToken,
      obsToken,
      stream: {
        id: streamId,
        streamKey,
        rtmpUrl
      }
    });

  } catch (error) {
    console.error('Start stream error:', error);
    res.status(500).json({ error: 'Failed to start stream' });
  }
});

// Stop stream
router.post('/:streamId/stop', [
  authenticateToken,
  requireRole(['streamer', 'admin'])
], async (req, res) => {
  try {
    const { streamId } = req.params;

    // Verify stream ownership
    const streamResult = await query(
      'SELECT * FROM streams WHERE id = $1 AND streamer_id = $2',
      [streamId, req.user.id]
    );

    if (streamResult.rows.length === 0) {
      return res.status(404).json({ error: 'Stream not found or access denied' });
    }

    // Stop stream
    await query(`
      UPDATE streams 
      SET is_live = false, 
          end_time = CURRENT_TIMESTAMP,
          viewer_count = 0
      WHERE id = $1
    `, [streamId]);

    res.json({ message: 'Stream stopped successfully' });

  } catch (error) {
    console.error('Stop stream error:', error);
    res.status(500).json({ error: 'Failed to stop stream' });
  }
});

// Update stream settings
router.put('/:streamId', [
  authenticateToken,
  requireRole(['streamer', 'admin']),
  body('title').optional().isLength({ min: 1, max: 500 }),
  body('description').optional().isLength({ max: 2000 }),
  body('category_id').optional().isInt({ min: 1 }),
  body('quality_settings').optional().isObject()
], async (req, res) => {
  try {
    const { streamId } = req.params;
    const { title, description, category_id, quality_settings } = req.body;

    // Verify stream ownership
    const streamResult = await query(
      'SELECT * FROM streams WHERE id = $1 AND streamer_id = $2',
      [streamId, req.user.id]
    );

    if (streamResult.rows.length === 0) {
      return res.status(404).json({ error: 'Stream not found or access denied' });
    }

    // Build update query dynamically
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

    if (category_id !== undefined) {
      updates.push(`category_id = $${paramIndex}`);
      params.push(category_id);
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
    params.push(streamId);

    const updateQuery = `
      UPDATE streams 
      SET ${updates.join(', ')} 
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const updatedStreamResult = await query(updateQuery, params);
    const updatedStream = updatedStreamResult.rows[0];

    res.json({
      message: 'Stream updated successfully',
      stream: updatedStream
    });

  } catch (error) {
    console.error('Update stream error:', error);
    res.status(500).json({ error: 'Failed to update stream' });
  }
});

// Get stream goals
router.get('/:streamId/goals', async (req, res) => {
  try {
    const { streamId } = req.params;

    const goalsResult = await query(`
      SELECT 
        id,
        title,
        description,
        target_amount,
        current_amount,
        is_completed,
        created_at,
        completed_at
      FROM stream_goals
      WHERE stream_id = $1
      ORDER BY created_at DESC
    `, [streamId]);

    res.json({ goals: goalsResult.rows });

  } catch (error) {
    console.error('Get stream goals error:', error);
    res.status(500).json({ error: 'Failed to fetch stream goals' });
  }
});

// Create stream goal
router.post('/:streamId/goals', [
  authenticateToken,
  requireRole(['streamer', 'admin']),
  body('title').isLength({ min: 1, max: 255 }).withMessage('Title required'),
  body('description').optional().isLength({ max: 500 }),
  body('target_amount').isInt({ min: 1 }).withMessage('Valid target amount required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { streamId } = req.params;
    const { title, description = '', target_amount } = req.body;

    // Verify stream ownership
    const streamResult = await query(
      'SELECT * FROM streams WHERE id = $1 AND streamer_id = $2',
      [streamId, req.user.id]
    );

    if (streamResult.rows.length === 0) {
      return res.status(404).json({ error: 'Stream not found or access denied' });
    }

    const goalResult = await query(`
      INSERT INTO stream_goals (streamer_id, stream_id, title, description, target_amount)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [req.user.id, streamId, title, description, target_amount]);

    res.status(201).json({
      message: 'Stream goal created successfully',
      goal: goalResult.rows[0]
    });

  } catch (error) {
    console.error('Create stream goal error:', error);
    res.status(500).json({ error: 'Failed to create stream goal' });
  }
});

module.exports = router;