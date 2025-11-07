const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// Get admin dashboard stats
router.get('/dashboard', [
  requireRole(['admin'])
], async (req, res) => {
  try {
    const statsResult = await query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE role = 'streamer') as total_streamers,
        (SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE) as users_today,
        (SELECT COUNT(*) FROM streams WHERE is_live = true) as live_streams,
        (SELECT COUNT(*) FROM tips WHERE created_at >= CURRENT_DATE) as tips_today,
        (SELECT COALESCE(SUM(amount), 0) FROM tips WHERE created_at >= CURRENT_DATE) as tokens_tipped_today,
        (SELECT COALESCE(SUM(amount), 0) FROM tips) as total_tokens_tipped,
        (SELECT COUNT(*) FROM messages WHERE created_at >= CURRENT_DATE) as messages_today
    `);

    const dailyStats = statsResult.rows[0];

    // Get user growth over last 7 days
    const userGrowthResult = await query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as new_users
      FROM users
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `);

    // Get top streamers by earnings
    const topStreamersResult = await query(`
      SELECT 
        u.id,
        u.username,
        u.tokens_balance,
        u.total_tips_earned,
        u.is_streaming
      FROM users u
      WHERE u.role = 'streamer'
      ORDER BY u.total_tips_earned DESC
      LIMIT 10
    `);

    // Get most active streams today
    const activeStreamsResult = await query(`
      SELECT 
        s.id,
        s.title,
        s.viewer_count,
        s.total_tips,
        u.username as streamer_name
      FROM streams s
      JOIN users u ON s.streamer_id = u.id
      WHERE s.start_time >= CURRENT_DATE
      ORDER BY s.viewer_count DESC
      LIMIT 10
    `);

    res.json({
      daily_stats: dailyStats,
      user_growth: userGrowthResult.rows,
      top_streamers: topStreamersResult.rows,
      active_streams: activeStreamsResult.rows
    });

  } catch (error) {
    console.error('Get admin dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Get all users with pagination and filters
router.get('/users', [
  requireRole(['admin'])
], async (req, res) => {
  try {
    const { 
      role, 
      search, 
      banned, 
      sort = 'created_at', 
      order = 'desc',
      limit = 50, 
      offset = 0 
    } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (role) {
      whereClause += ` AND u.role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }

    if (search) {
      whereClause += ` AND (u.username ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (banned !== undefined) {
      whereClause += ` AND u.is_banned = $${paramIndex}`;
      params.push(banned === 'true');
      paramIndex++;
    }

    // Add sorting
    const validSorts = ['username', 'email', 'role', 'created_at', 'tokens_balance', 'total_tips_earned'];
    const sortField = validSorts.includes(sort) ? sort : 'created_at';
    const sortOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    params.push(limit, offset);

    const usersResult = await query(`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.role,
        u.tokens_balance,
        u.total_tips_earned,
        u.total_tips_sent,
        u.is_banned,
        u.ban_reason,
        u.age_verified,
        u.created_at,
        r.name as region_name
      FROM users u
      LEFT JOIN regions r ON u.region_id = r.id
      ${whereClause}
      ORDER BY u.${sortField} ${sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, params);

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM users u
      ${whereClause}
    `, params.slice(0, -2)); // Remove limit and offset

    res.json({
      users: usersResult.rows,
      total: parseInt(countResult.rows[0].total),
      page: Math.floor(offset / limit) + 1,
      pages: Math.ceil(countResult.rows[0].total / limit)
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Ban/unban user
router.post('/users/:userId/ban', [
  requireRole(['admin']),
  body('reason').isLength({ min: 1, max: 500 }).withMessage('Ban reason required'),
  body('duration_minutes').optional().isInt({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { userId } = req.params;
    const { reason, duration_minutes } = req.body;

    // Cannot ban other admins
    const targetUserResult = await query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );

    if (targetUserResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUserResult.rows[0].role === 'admin') {
      return res.status(403).json({ error: 'Cannot ban admin users' });
    }

    // Ban user
    await query(`
      UPDATE users 
      SET is_banned = true, ban_reason = $1 
      WHERE id = $2
    `, [reason, userId]);

    // Log moderation action
    await query(`
      INSERT INTO moderation_logs (moderator_id, target_user_id, action, reason, duration_minutes)
      VALUES ($1, $2, 'user_banned', $3, $4)
    `, [req.user.id, userId, reason, duration_minutes]);

    // Optional: Deactivate user sessions
    if (duration_minutes && duration_minutes > 0) {
      // In a real implementation, you might want to deactivate sessions
      // and schedule an unban task
    }

    res.json({
      message: 'User banned successfully',
      user_id: userId,
      reason
    });

  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ error: 'Failed to ban user' });
  }
});

router.post('/users/:userId/unban', [
  requireRole(['admin'])
], async (req, res) => {
  try {
    const { userId } = req.params;

    // Unban user
    await query(`
      UPDATE users 
      SET is_banned = false, ban_reason = NULL 
      WHERE id = $1
    `, [userId]);

    // Log moderation action
    await query(`
      INSERT INTO moderation_logs (moderator_id, target_user_id, action, reason)
      VALUES ($1, $2, 'user_unbanned', 'Manual unban by admin')
    `, [req.user.id, userId]);

    res.json({
      message: 'User unbanned successfully',
      user_id: userId
    });

  } catch (error) {
    console.error('Unban user error:', error);
    res.status(500).json({ error: 'Failed to unban user' });
  }
});

// Promote/demote user role
router.post('/users/:userId/role', [
  requireRole(['admin']),
  body('role').isIn(['viewer', 'streamer', 'moderator']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { userId } = req.params;
    const { role } = req.body;

    // Cannot change admin roles
    const targetUserResult = await query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );

    if (targetUserResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const oldRole = targetUserResult.rows[0].role;

    if (oldRole === 'admin') {
      return res.status(403).json({ error: 'Cannot change admin roles' });
    }

    // Update role
    await query(
      'UPDATE users SET role = $1 WHERE id = $2',
      [role, userId]
    );

    res.json({
      message: 'User role updated successfully',
      user_id: userId,
      old_role: oldRole,
      new_role: role
    });

  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Get all streams with moderation options
router.get('/streams', [
  requireRole(['admin'])
], async (req, res) => {
  try {
    const { 
      is_live, 
      is_nsfw, 
      category_id, 
      sort = 'start_time', 
      order = 'desc',
      limit = 50, 
      offset = 0 
    } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (is_live !== undefined) {
      whereClause += ` AND s.is_live = $${paramIndex}`;
      params.push(is_live === 'true');
      paramIndex++;
    }

    if (is_nsfw !== undefined) {
      whereClause += ` AND s.is_nsfw = $${paramIndex}`;
      params.push(is_nsfw === 'true');
      paramIndex++;
    }

    if (category_id) {
      whereClause += ` AND s.category_id = $${paramIndex}`;
      params.push(category_id);
      paramIndex++;
    }

    // Add sorting
    const validSorts = ['start_time', 'viewer_count', 'total_tips', 'title'];
    const sortField = validSorts.includes(sort) ? sort : 'start_time';
    const sortOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    params.push(limit, offset);

    const streamsResult = await query(`
      SELECT 
        s.id,
        s.title,
        s.description,
        s.viewer_count,
        s.total_tips,
        s.start_time,
        s.end_time,
        s.is_live,
        s.is_nsfw,
        s.language,
        u.username as streamer_name,
        u.id as streamer_id,
        c.name as category_name
      FROM streams s
      JOIN users u ON s.streamer_id = u.id
      JOIN categories c ON s.category_id = c.id
      ${whereClause}
      ORDER BY s.${sortField} ${sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, params);

    res.json({
      streams: streamsResult.rows,
      total: streamsResult.rows.length
    });

  } catch (error) {
    console.error('Get streams error:', error);
    res.status(500).json({ error: 'Failed to fetch streams' });
  }
});

// Get system statistics
router.get('/stats', [
  requireRole(['admin'])
], async (req, res) => {
  try {
    const { period = '30d' } = req.query;

    let dateFilter = '';
    if (period === '7d') {
      dateFilter = "WHERE created_at >= NOW() - INTERVAL '7 days'";
    } else if (period === '30d') {
      dateFilter = "WHERE created_at >= NOW() - INTERVAL '30 days'";
    } else if (period === '90d') {
      dateFilter = "WHERE created_at >= NOW() - INTERVAL '90 days'";
    }

    // Platform statistics
    const platformStatsResult = await query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users ${dateFilter}) as new_users,
        (SELECT COUNT(*) FROM users WHERE role = 'streamer') as total_streamers,
        (SELECT COUNT(*) FROM streams WHERE is_live = true) as live_streams,
        (SELECT COUNT(*) FROM tips ${dateFilter}) as total_tips,
        (SELECT COALESCE(SUM(amount), 0) FROM tips ${dateFilter}) as tokens_transferred,
        (SELECT COUNT(*) FROM messages ${dateFilter}) as messages_sent
    `);

    // Revenue statistics
    const revenueStatsResult = await query(`
      SELECT 
        DATE(t.created_at) as date,
        COUNT(t.id) as tip_count,
        SUM(t.amount) as tokens_tipped
      FROM tips t
      WHERE t.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(t.created_at)
      ORDER BY date
    `);

    // Category popularity
    const categoryStatsResult = await query(`
      SELECT 
        c.name,
        COUNT(s.id) as stream_count,
        SUM(s.viewer_count) as total_viewers,
        SUM(s.total_tips) as total_tips
      FROM categories c
      LEFT JOIN streams s ON c.id = s.category_id
      GROUP BY c.id, c.name
      ORDER BY stream_count DESC
    `);

    // Region statistics
    const regionStatsResult = await query(`
      SELECT 
        r.name,
        COUNT(u.id) as user_count,
        COUNT(s.id) as stream_count
      FROM regions r
      LEFT JOIN users u ON r.id = u.region_id
      LEFT JOIN streams s ON r.id = s.region_id
      GROUP BY r.id, r.name
      ORDER BY user_count DESC
    `);

    res.json({
      platform_stats: platformStatsResult.rows[0],
      revenue_trends: revenueStatsResult.rows,
      category_stats: categoryStatsResult.rows,
      region_stats: regionStatsResult.rows
    });

  } catch (error) {
    console.error('Get system stats error:', error);
    res.status(500).json({ error: 'Failed to fetch system statistics' });
  }
});

// Get all categories
router.get('/categories', [
  requireRole(['admin'])
], async (req, res) => {
  try {
    const categoriesResult = await query(`
      SELECT 
        c.id,
        c.name,
        c.description,
        c.nsfw_flag,
        c.is_active,
        c.created_at,
        COUNT(s.id) as stream_count
      FROM categories c
      LEFT JOIN streams s ON c.id = s.category_id
      GROUP BY c.id
      ORDER BY c.name
    `);

    res.json({ categories: categoriesResult.rows });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Create new category
router.post('/categories', [
  requireRole(['admin']),
  body('name').isLength({ min: 1, max: 100 }).withMessage('Category name required'),
  body('description').optional().isLength({ max: 500 }),
  body('nsfw_flag').isBoolean().withMessage('NSFW flag must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { name, description = '', nsfw_flag, icon_url } = req.body;

    const categoryResult = await query(`
      INSERT INTO categories (name, description, nsfw_flag, icon_url)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [name, description, nsfw_flag, icon_url]);

    res.status(201).json({
      message: 'Category created successfully',
      category: categoryResult.rows[0]
    });

  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

module.exports = router;