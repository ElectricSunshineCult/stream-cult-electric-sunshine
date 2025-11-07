const express = require('express');
const LevelService = require('../services/levelService');
const { auth } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting for API calls
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many API requests, please try again later.'
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message: 'Too many requests, please try again later.'
});

router.use(apiLimiter);

/**
 * GET /api/levels/my-level
 * Get current user's level information
 */
router.get('/my-level', auth, async (req, res) => {
  try {
    const levelInfo = await LevelService.getUserLevelInfo(req.user.id);
    res.json({ success: true, data: levelInfo });
  } catch (error) {
    console.error('Error getting user level:', error);
    res.status(500).json({ success: false, error: 'Failed to get level information' });
  }
});

/**
 * GET /api/levels/user/:userId
 * Get level information for a specific user
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const levelInfo = await LevelService.getUserLevelInfo(userId);
    res.json({ success: true, data: levelInfo });
  } catch (error) {
    console.error('Error getting user level:', error);
    res.status(500).json({ success: false, error: 'Failed to get level information' });
  }
});

/**
 * GET /api/levels/all
 * Get all level configurations
 */
router.get('/all', async (req, res) => {
  try {
    const { query } = require('../config/database');
    const result = await query(`
      SELECT level, title, experience_required, badge_icon, perks
      FROM user_levels
      ORDER BY level ASC
    `);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error getting levels:', error);
    res.status(500).json({ success: false, error: 'Failed to get level information' });
  }
});

/**
 * GET /api/leaderboards/:category
 * Get leaderboard for specific category
 */
router.get('/leaderboards/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { period = 'weekly', limit = 50 } = req.query;

    const validCategories = ['experience', 'tokens_spent', 'tokens_earned', 'watch_time', 'stream_time'];
    const validPeriods = ['daily', 'weekly', 'monthly', 'all_time'];

    if (!validCategories.includes(category)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid category. Must be one of: ' + validCategories.join(', ') 
      });
    }

    if (!validPeriods.includes(period)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid period. Must be one of: ' + validPeriods.join(', ') 
      });
    }

    const leaderboard = await LevelService.getLeaderboard(category, period, parseInt(limit));
    res.json({ success: true, data: leaderboard });
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    res.status(500).json({ success: false, error: 'Failed to get leaderboard' });
  }
});

/**
 * GET /api/leaderboards/global
 * Get global leaderboard with top users across all categories
 */
router.get('/leaderboards/global', async (req, res) => {
  try {
    const { period = 'weekly', limit = 50 } = req.query;
    
    const { query } = require('../config/database');
    
    // Get top users by experience
    const topExperience = await query(`
      SELECT 
        u.id,
        u.username,
        u.avatar_url,
        u.level,
        u.level_title,
        ul.badge_icon,
        u.experience_points,
        CASE 
          WHEN ROW_NUMBER() OVER (ORDER BY u.experience_points DESC) <= 10 THEN ROW_NUMBER() OVER (ORDER BY u.experience_points DESC)
          ELSE NULL
        END as exp_rank
      FROM users u
      LEFT JOIN user_levels ul ON u.level = ul.level
      ORDER BY u.experience_points DESC
      LIMIT $1
    `, [limit]);

    // Get top spenders
    const topSpenders = await query(`
      SELECT 
        u.id,
        u.username,
        u.avatar_url,
        u.level,
        u.level_title,
        ul.badge_icon,
        u.total_spent,
        CASE 
          WHEN ROW_NUMBER() OVER (ORDER BY u.total_spent DESC) <= 10 THEN ROW_NUMBER() OVER (ORDER BY u.total_spent DESC)
          ELSE NULL
        END as spender_rank
      FROM users u
      LEFT JOIN user_levels ul ON u.level = ul.level
      ORDER BY u.total_spent DESC
      LIMIT $1
    `, [limit]);

    // Get top earners
    const topEarners = await query(`
      SELECT 
        u.id,
        u.username,
        u.avatar_url,
        u.level,
        u.level_title,
        ul.badge_icon,
        u.total_earned,
        CASE 
          WHEN ROW_NUMBER() OVER (ORDER BY u.total_earned DESC) <= 10 THEN ROW_NUMBER() OVER (ORDER BY u.total_earned DESC)
          ELSE NULL
        END as earner_rank
      FROM users u
      LEFT JOIN user_levels ul ON u.level = ul.level
      ORDER BY u.total_earned DESC
      LIMIT $1
    `, [limit]);

    res.json({ 
      success: true, 
      data: {
        top_experience: topExperience.rows,
        top_spenders: topSpenders.rows,
        top_earners: topEarners.rows
      }
    });
  } catch (error) {
    console.error('Error getting global leaderboard:', error);
    res.status(500).json({ success: false, error: 'Failed to get global leaderboard' });
  }
});

/**
 * GET /api/achievements/my
 * Get current user's achievements
 */
router.get('/achievements/my', auth, async (req, res) => {
  try {
    const { query } = require('../config/database');
    
    const result = await query(`
      SELECT 
        a.id,
        a.name,
        a.description,
        a.badge_icon,
        a.experience_reward,
        ua.unlocked_at,
        ua.progress,
        ua.is_completed
      FROM achievements a
      LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = $1
      WHERE a.is_active = true
      ORDER BY a.name ASC
    `, [req.user.id]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error getting user achievements:', error);
    res.status(500).json({ success: false, error: 'Failed to get achievements' });
  }
});

/**
 * GET /api/achievements/all
 * Get all available achievements
 */
router.get('/achievements/all', async (req, res) => {
  try {
    const { query } = require('../config/database');
    
    const result = await query(`
      SELECT id, name, description, badge_icon, experience_reward, requirements
      FROM achievements
      WHERE is_active = true
      ORDER BY name ASC
    `);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error getting achievements:', error);
    res.status(500).json({ success: false, error: 'Failed to get achievements' });
  }
});

/**
 * POST /api/achievements/check
 * Check and award new achievements for user
 */
router.post('/achievements/check', auth, strictLimiter, async (req, res) => {
  try {
    const newAchievements = await LevelService.checkAchievements(req.user.id);
    res.json({ 
      success: true, 
      data: newAchievements,
      message: newAchievements.length > 0 ? `Unlocked ${newAchievements.length} new achievements!` : 'No new achievements'
    });
  } catch (error) {
    console.error('Error checking achievements:', error);
    res.status(500).json({ success: false, error: 'Failed to check achievements' });
  }
});

/**
 * GET /api/stats/my
 * Get current user's detailed statistics
 */
router.get('/stats/my', auth, async (req, res) => {
  try {
    const { query } = require('../config/database');
    
    const result = await query(`
      SELECT 
        u.experience_points,
        u.level,
        u.level_title,
        u.total_spent,
        u.total_earned,
        u.watch_time_hours,
        u.stream_time_hours,
        COUNT(DISTINCT t.id) as total_tips_sent,
        COUNT(DISTINCT t2.id) as total_tips_received,
        COUNT(DISTINCT m.id) as total_messages,
        COUNT(DISTINCT ua.id) as achievements_unlocked
      FROM users u
      LEFT JOIN tips t ON u.id = t.from_user_id
      LEFT JOIN tips t2 ON u.id = t2.to_streamer_id
      LEFT JOIN messages m ON u.id = m.user_id
      LEFT JOIN user_achievements ua ON u.id = ua.user_id AND ua.is_completed = true
      WHERE u.id = $1
      GROUP BY u.id, u.experience_points, u.level, u.level_title, u.total_spent, u.total_earned, u.watch_time_hours, u.stream_time_hours
    `, [req.user.id]);

    res.json({ success: true, data: result.rows[0] || {} });
  } catch (error) {
    console.error('Error getting user stats:', error);
    res.status(500).json({ success: false, error: 'Failed to get user statistics' });
  }
});

/**
 * POST /api/admin/update-leaderboards
 * Update all leaderboards (admin only)
 */
router.post('/admin/update-leaderboards', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }

    await LevelService.updateLeaderboards();
    res.json({ success: true, message: 'Leaderboards updated successfully' });
  } catch (error) {
    console.error('Error updating leaderboards:', error);
    res.status(500).json({ success: false, error: 'Failed to update leaderboards' });
  }
});

module.exports = router;