/**
 * STREAM CULT - Electric Sunshine Cult Clips API
 * 
 * Copyright (c) 2025 Corey Setzer
 * Unknown Artist Developer & Director Of Electric Sunshine Cult
 * 
 * This software is proprietary and confidential. Unauthorized reproduction,
 * distribution, or use of this software is strictly prohibited.
 * 
 * Electric Sunshine Cult reserves all rights to this intellectual property.
 * 
 * WATERMARK: ELECTRIC SUNSHINE CULT - Corey Setzer
 * This API is part of the proprietary Stream Cult platform
 * Unauthorized use will result in legal action by Electric Sunshine Cult
 * Contact: unknown@electricsunshinecult.com
 * © 2025 Electric Sunshine Cult - All rights reserved
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { authenticateToken } = require('../middleware/auth');
const { errorHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, '..', 'uploads', 'clips');
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error, null);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `clip-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp4|webm|avi|mov/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only video files are allowed!'));
    }
  }
});

// Create a new clip
router.post('/', authenticateToken, upload.single('video'), async (req, res, next) => {
  try {
    const { streamId, title, description, startTime, endTime, quality = '1080p', isPublic = false, tags } = req.body;
    const streamerId = req.user.id;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Video file is required' });
    }
    
    if (!title || !startTime || !endTime) {
      return res.status(400).json({ error: 'Title, start time, and end time are required' });
    }
    
    // Calculate file size
    const fileSize = req.file.size;
    const filePath = req.file.path;
    
    // Generate thumbnail path (placeholder for now)
    const thumbnailPath = filePath.replace(/\.[^/.]+$/, '.jpg');
    
    // Parse tags if it's a string
    const tagArray = tags ? (typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags) : [];
    
    // Insert clip into database
    const query = `
      INSERT INTO stream_clips (
        streamer_id, stream_id, title, description, start_time, end_time,
        file_path, file_size, thumbnail_path, quality, is_public, tags
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
    
    const values = [
      streamerId,
      streamId || null,
      title,
      description || null,
      parseInt(startTime),
      parseInt(endTime),
      filePath,
      fileSize,
      thumbnailPath,
      quality,
      isPublic,
      tagArray
    ];
    
    const result = await req.db.query(query, values);
    const clip = result.rows[0];
    
    res.status(201).json({
      message: 'Clip created successfully',
      clip
    });
    
  } catch (error) {
    next(error);
  }
});

// Get clips for a streamer's profile
router.get('/profile/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, sort = 'created_at', order = 'desc' } = req.query;
    
    const offset = (page - 1) * limit;
    const validSortFields = ['created_at', 'view_count', 'title', 'duration'];
    const validOrder = ['asc', 'desc'];
    
    const sortField = validSortFields.includes(sort) ? sort : 'created_at';
    const orderDirection = validOrder.includes(order.toLowerCase()) ? order.toLowerCase() : 'desc';
    
    const query = `
      SELECT 
        sc.*,
        u.username,
        u.display_name,
        s.title as stream_title,
        COUNT(DISTINCT cr.id) as reaction_count,
        COUNT(DISTINCT cc.id) as comment_count
      FROM stream_clips sc
      LEFT JOIN users u ON sc.streamer_id = u.id
      LEFT JOIN streams s ON sc.stream_id = s.id
      LEFT JOIN clip_reactions cr ON sc.id = cr.clip_id
      LEFT JOIN clip_comments cc ON sc.id = cc.clip_id
      WHERE sc.streamer_id = $1 AND sc.is_public = true
      GROUP BY sc.id, u.username, u.display_name, s.title
      ORDER BY sc.${sortField} ${orderDirection}
      LIMIT $2 OFFSET $3
    `;
    
    const result = await req.db.query(query, [userId, limit, offset]);
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM stream_clips sc
      WHERE sc.streamer_id = $1 AND sc.is_public = true
    `;
    const countResult = await req.db.query(countQuery, [userId]);
    const total = parseInt(countResult.rows[0].total);
    
    res.json({
      clips: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    next(error);
  }
});

// Get public clips feed
router.get('/feed', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, sort = 'created_at', order = 'desc' } = req.query;
    
    const offset = (page - 1) * limit;
    const validSortFields = ['created_at', 'view_count', 'title'];
    const validOrder = ['asc', 'desc'];
    
    const sortField = validSortFields.includes(sort) ? sort : 'created_at';
    const orderDirection = validOrder.includes(order.toLowerCase()) ? order.toLowerCase() : 'desc';
    
    const query = `
      SELECT 
        sc.*,
        u.username,
        u.display_name,
        s.title as stream_title,
        COUNT(DISTINCT cr.id) as reaction_count,
        COUNT(DISTINCT cc.id) as comment_count
      FROM stream_clips sc
      LEFT JOIN users u ON sc.streamer_id = u.id
      LEFT JOIN streams s ON sc.stream_id = s.id
      LEFT JOIN clip_reactions cr ON sc.id = cr.clip_id
      LEFT JOIN clip_comments cc ON sc.id = cc.clip_id
      WHERE sc.is_public = true
      GROUP BY sc.id, u.username, u.display_name, s.title
      ORDER BY sc.${sortField} ${orderDirection}
      LIMIT $1 OFFSET $2
    `;
    
    const result = await req.db.query(query, [limit, offset]);
    
    res.json({
      clips: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.rows.length
      }
    });
    
  } catch (error) {
    next(error);
  }
});

// Get a specific clip
router.get('/:clipId', async (req, res, next) => {
  try {
    const { clipId } = req.params;
    
    const query = `
      SELECT 
        sc.*,
        u.username,
        u.display_name,
        s.title as stream_title
      FROM stream_clips sc
      LEFT JOIN users u ON sc.streamer_id = u.id
      LEFT JOIN streams s ON sc.stream_id = s.id
      WHERE sc.id = $1
    `;
    
    const result = await req.db.query(query, [clipId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Clip not found' });
    }
    
    const clip = result.rows[0];
    
    // Track view if not the streamer
    if (req.user && req.user.id !== clip.streamer_id) {
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');
      const referrer = req.get('Referer');
      
      await req.db.query(`
        INSERT INTO clip_analytics (clip_id, user_id, ip_address, user_agent, referrer)
        VALUES ($1, $2, $3, $4, $5)
      `, [clipId, req.user.id, ipAddress, userAgent, referrer]);
      
      // Update view count
      await req.db.query(`
        UPDATE stream_clips 
        SET view_count = view_count + 1 
        WHERE id = $1
      `, [clipId]);
    }
    
    res.json({ clip });
    
  } catch (error) {
    next(error);
  }
});

// Update a clip
router.put('/:clipId', authenticateToken, async (req, res, next) => {
  try {
    const { clipId } = req.params;
    const { title, description, isPublic, tags } = req.body;
    const userId = req.user.id;
    
    // Check if user owns the clip
    const checkQuery = 'SELECT * FROM stream_clips WHERE id = $1 AND streamer_id = $2';
    const checkResult = await req.db.query(checkQuery, [clipId, userId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Clip not found or access denied' });
    }
    
    // Update clip
    const updateQuery = `
      UPDATE stream_clips 
      SET 
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        is_public = COALESCE($3, is_public),
        tags = COALESCE($4, tags),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5 AND streamer_id = $6
      RETURNING *
    `;
    
    const tagArray = tags ? (typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags) : null;
    
    const result = await req.db.query(updateQuery, [
      title,
      description,
      isPublic,
      tagArray,
      clipId,
      userId
    ]);
    
    res.json({
      message: 'Clip updated successfully',
      clip: result.rows[0]
    });
    
  } catch (error) {
    next(error);
  }
});

// Delete a clip
router.delete('/:clipId', authenticateToken, async (req, res, next) => {
  try {
    const { clipId } = req.params;
    const userId = req.user.id;
    
    // Check if user owns the clip
    const checkQuery = 'SELECT file_path, thumbnail_path FROM stream_clips WHERE id = $1 AND streamer_id = $2';
    const checkResult = await req.db.query(checkQuery, [clipId, userId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Clip not found or access denied' });
    }
    
    // Delete files from disk
    const clip = checkResult.rows[0];
    try {
      if (clip.file_path) {
        await fs.unlink(clip.file_path);
      }
      if (clip.thumbnail_path) {
        await fs.unlink(clip.thumbnail_path);
      }
    } catch (fileError) {
      console.error('Error deleting files:', fileError);
      // Continue with database deletion even if file deletion fails
    }
    
    // Delete from database
    await req.db.query('DELETE FROM stream_clips WHERE id = $1 AND streamer_id = $2', [clipId, userId]);
    
    res.json({ message: 'Clip deleted successfully' });
    
  } catch (error) {
    next(error);
  }
});

// Add reaction to a clip
router.post('/:clipId/react', authenticateToken, async (req, res, next) => {
  try {
    const { clipId } = req.params;
    const { reactionType } = req.body;
    const userId = req.user.id;
    
    if (!['like', 'dislike', 'love', 'laugh', 'wow'].includes(reactionType)) {
      return res.status(400).json({ error: 'Invalid reaction type' });
    }
    
    // Upsert reaction
    const query = `
      INSERT INTO clip_reactions (clip_id, user_id, reaction_type)
      VALUES ($1, $2, $3)
      ON CONFLICT (clip_id, user_id) 
      DO UPDATE SET reaction_type = EXCLUDED.reaction_type
      RETURNING *
    `;
    
    const result = await req.db.query(query, [clipId, userId, reactionType]);
    
    res.json({
      message: 'Reaction updated successfully',
      reaction: result.rows[0]
    });
    
  } catch (error) {
    next(error);
  }
});

// Get clip reactions
router.get('/:clipId/reactions', async (req, res, next) => {
  try {
    const { clipId } = req.params;
    
    const query = `
      SELECT reaction_type, COUNT(*) as count
      FROM clip_reactions
      WHERE clip_id = $1
      GROUP BY reaction_type
    `;
    
    const result = await req.db.query(query, [clipId]);
    
    // Format as object with reaction type as key
    const reactions = {};
    result.rows.forEach(row => {
      reactions[row.reaction_type] = parseInt(row.count);
    });
    
    res.json({ reactions });
    
  } catch (error) {
    next(error);
  }
});

// Get comments for a clip
router.get('/:clipId/comments', async (req, res, next) => {
  try {
    const { clipId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT 
        cc.*,
        u.username,
        u.display_name,
        u.avatar_url
      FROM clip_comments cc
      LEFT JOIN users u ON cc.user_id = u.id
      WHERE cc.clip_id = $1
      ORDER BY cc.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await req.db.query(query, [clipId, limit, offset]);
    
    res.json({
      comments: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.rows.length
      }
    });
    
  } catch (error) {
    next(error);
  }
});

// Add comment to a clip
router.post('/:clipId/comments', authenticateToken, async (req, res, next) => {
  try {
    const { clipId } = req.params;
    const { content, parentId = null } = req.body;
    const userId = req.user.id;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' });
    }
    
    const query = `
      INSERT INTO clip_comments (clip_id, user_id, content, parent_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const result = await req.db.query(query, [clipId, userId, content.trim(), parentId]);
    
    res.status(201).json({
      message: 'Comment added successfully',
      comment: result.rows[0]
    });
    
  } catch (error) {
    next(error);
  }
});

// Track clip download
router.post('/:clipId/download', async (req, res, next) => {
  try {
    const { clipId } = req.params;
    
    // Update download count
    await req.db.query(`
      UPDATE stream_clips 
      SET download_count = download_count + 1 
      WHERE id = $1
    `, [clipId]);
    
    // Get clip info
    const query = 'SELECT file_path FROM stream_clips WHERE id = $1';
    const result = await req.db.query(query, [clipId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Clip not found' });
    }
    
    const clip = result.rows[0];
    
    res.json({
      message: 'Download recorded',
      filePath: clip.file_path
    });
    
  } catch (error) {
    next(error);
  }
});

// Search clips
router.get('/search', async (req, res, next) => {
  try {
    const { q, tags, userId, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        sc.*,
        u.username,
        u.display_name,
        s.title as stream_title
      FROM stream_clips sc
      LEFT JOIN users u ON sc.streamer_id = u.id
      LEFT JOIN streams s ON sc.stream_id = s.id
      WHERE sc.is_public = true
    `;
    
    const values = [];
    let paramCount = 0;
    
    // Add search conditions
    if (q) {
      paramCount++;
      query += ` AND (sc.title ILIKE $${paramCount} OR sc.description ILIKE $${paramCount})`;
      values.push(`%${q}%`);
    }
    
    if (userId) {
      paramCount++;
      query += ` AND sc.streamer_id = $${paramCount}`;
      values.push(userId);
    }
    
    if (tags) {
      const tagArray = typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags;
      if (tagArray.length > 0) {
        paramCount++;
        query += ` AND sc.tags && $${paramCount}`;
        values.push(tagArray);
      }
    }
    
    query += ` ORDER BY sc.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    values.push(limit, offset);
    
    const result = await req.db.query(query, values);
    
    res.json({
      clips: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.rows.length
      }
    });
    
  } catch (error) {
    next(error);
  }
});

module.exports = router;