const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get user profile
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const userResult = await query(`
      SELECT 
        u.id,
        u.username,
        u.bio,
        u.avatar_url,
        u.role,
        u.tokens_balance,
        u.total_tips_earned,
        u.total_tips_sent,
        u.created_at,
        u.is_streaming,
        r.name as region_name,
        r.code as region_code
      FROM users u
      JOIN regions r ON u.region_id = r.id
      WHERE u.id = $1
    `, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Get user's current stream if live
    const streamResult = await query(`
      SELECT 
        s.id,
        s.title,
        s.viewer_count,
        s.start_time,
        c.name as category_name
      FROM streams s
      JOIN categories c ON s.category_id = c.id
      WHERE s.streamer_id = $1 AND s.is_live = true
      LIMIT 1
    `, [userId]);

    user.current_stream = streamResult.rows.length > 0 ? streamResult.rows[0] : null;

    res.json({ user });

  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Update user profile
router.put('/profile', [
  authenticateToken,
  body('bio').optional().isLength({ max: 500 }).withMessage('Bio too long (max 500 chars)'),
  body('region_id').optional().isInt({ min: 1 }).withMessage('Valid region required'),
  body('avatar_url').optional().isURL().withMessage('Valid avatar URL required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { bio, region_id, avatar_url } = req.body;
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (bio !== undefined) {
      updates.push(`bio = $${paramIndex}`);
      params.push(bio);
      paramIndex++;
    }

    if (region_id !== undefined) {
      updates.push(`region_id = $${paramIndex}`);
      params.push(region_id);
      paramIndex++;
    }

    if (avatar_url !== undefined) {
      updates.push(`avatar_url = $${paramIndex}`);
      params.push(avatar_url);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(req.user.id);

    const updateQuery = `
      UPDATE users 
      SET ${updates.join(', ')} 
      WHERE id = $${paramIndex}
      RETURNING id, username, bio, avatar_url, region_id, updated_at
    `;

    const updatedUserResult = await query(updateQuery, params);
    const updatedUser = updatedUserResult.rows[0];

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get user's streams
router.get('/:userId/streams', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const streamsResult = await query(`
      SELECT 
        s.id,
        s.title,
        s.description,
        s.viewer_count,
        s.total_tips,
        s.start_time,
        s.end_time,
        s.thumbnail_url,
        s.is_live,
        s.is_nsfw,
        c.name as category_name
      FROM streams s
      JOIN categories c ON s.category_id = c.id
      WHERE s.streamer_id = $1
      ORDER BY s.start_time DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

    res.json({
      streams: streamsResult.rows,
      total: streamsResult.rows.length
    });

  } catch (error) {
    console.error('Get user streams error:', error);
    res.status(500).json({ error: 'Failed to fetch user streams' });
  }
});

// Get user's followers
router.get('/:userId/followers', [
  body('limit').optional().isInt({ min: 1, max: 100 }),
  body('offset').optional().isInt({ min: 0 })
], async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const followersResult = await query(`
      SELECT 
        u.id,
        u.username,
        u.avatar_url,
        u.created_at
      FROM user_follows f
      JOIN users u ON f.follower_id = u.id
      WHERE f.streamer_id = $1
      ORDER BY f.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

    res.json({
      followers: followersResult.rows,
      total: followersResult.rows.length
    });

  } catch (error) {
    console.error('Get user followers error:', error);
    res.status(500).json({ error: 'Failed to fetch followers' });
  }
});

// Follow user
router.post('/:userId/follow', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    if (parseInt(userId) === req.user.id) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    // Check if user exists and is a streamer
    const userResult = await query(
      'SELECT username, role FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (userResult.rows[0].role !== 'streamer') {
      return res.status(400).json({ error: 'Can only follow streamers' });
    }

    // Check if already following
    const existingFollow = await query(
      'SELECT id FROM user_follows WHERE follower_id = $1 AND streamer_id = $2',
      [req.user.id, userId]
    );

    if (existingFollow.rows.length > 0) {
      return res.status(409).json({ error: 'Already following this user' });
    }

    // Follow user
    await query(`
      INSERT INTO user_follows (follower_id, streamer_id)
      VALUES ($1, $2)
    `, [req.user.id, userId]);

    res.json({ message: 'Successfully followed user' });

  } catch (error) {
    console.error('Follow user error:', error);
    res.status(500).json({ error: 'Failed to follow user' });
  }
});

// Unfollow user
router.delete('/:userId/follow', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await query(`
      DELETE FROM user_follows 
      WHERE follower_id = $1 AND streamer_id = $2
    `, [req.user.id, userId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Not following this user' });
    }

    res.json({ message: 'Successfully unfollowed user' });

  } catch (error) {
    console.error('Unfollow user error:', error);
    res.status(500).json({ error: 'Failed to unfollow user' });
  }
});

// Get user's following list
router.get('/:userId/following', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const followingResult = await query(`
      SELECT 
        u.id,
        u.username,
        u.avatar_url,
        u.created_at
      FROM user_follows f
      JOIN users u ON f.streamer_id = u.id
      WHERE f.follower_id = $1
      ORDER BY f.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

    res.json({
      following: followingResult.rows,
      total: followingResult.rows.length
    });

  } catch (error) {
    console.error('Get user following error:', error);
    res.status(500).json({ error: 'Failed to fetch following' });
  }
});

// Get user statistics
router.get('/:userId/stats', async (req, res) => {
  try {
    const { userId } = req.params;

    const statsResult = await query(`
      SELECT 
        u.tokens_balance,
        u.total_tips_earned,
        u.total_tips_sent,
        u.created_at,
        COUNT(DISTINCT s.id) as total_streams,
        COUNT(DISTINCT CASE WHEN s.is_live = true THEN s.id END) as live_streams,
        COUNT(DISTINCT f.follower_id) as follower_count,
        COUNT(DISTINCT f2.streamer_id) as following_count
      FROM users u
      LEFT JOIN streams s ON u.id = s.streamer_id
      LEFT JOIN user_follows f ON u.id = f.streamer_id
      LEFT JOIN user_follows f2 ON u.id = f2.follower_id
      WHERE u.id = $1
      GROUP BY u.id
    `, [userId]);

    if (statsResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ stats: statsResult.rows[0] });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
});

// Search users
router.get('/search/:query', [
  body('limit').optional().isInt({ min: 1, max: 50 }),
  body('offset').optional().isInt({ min: 0 })
], async (req, res) => {
  try {
    const { query: searchQuery } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const usersResult = await query(`
      SELECT 
        u.id,
        u.username,
        u.bio,
        u.avatar_url,
        u.role,
        u.is_streaming,
        r.name as region_name
      FROM users u
      JOIN regions r ON u.region_id = r.id
      WHERE 
        u.username ILIKE $1 
        OR u.bio ILIKE $1
      ORDER BY 
        CASE WHEN u.username ILIKE $2 THEN 1 ELSE 2 END,
        u.username
      LIMIT $3 OFFSET $4
    `, [`%${searchQuery}%`, `${searchQuery}%`, limit, offset]);

    res.json({
      users: usersResult.rows,
      total: usersResult.rows.length
    });

  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get trending streamers
router.get('/trending/streamers', [
  body('region_id').optional().isInt({ min: 1 }),
  body('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const { region_id, limit = 20 } = req.query;

    let whereClause = 'WHERE u.role = \'streamer\' AND s.is_live = true';
    const params = [];
    let paramIndex = 1;

    if (region_id) {
      whereClause += ` AND s.region_id = $${paramIndex}`;
      params.push(region_id);
      paramIndex++;
    }

    params.push(limit);

    const streamersResult = await query(`
      SELECT 
        u.id,
        u.username,
        u.bio,
        u.avatar_url,
        s.viewer_count,
        s.total_tips,
        s.title as stream_title,
        c.name as category_name
      FROM users u
      JOIN streams s ON u.id = s.streamer_id
      JOIN categories c ON s.category_id = c.id
      ${whereClause}
      ORDER BY s.viewer_count DESC, s.total_tips DESC
      LIMIT $${paramIndex}
    `, params);

    res.json({ trending_streamers: streamersResult.rows });

  } catch (error) {
    console.error('Get trending streamers error:', error);
    res.status(500).json({ error: 'Failed to fetch trending streamers' });
  }
});

module.exports = router;