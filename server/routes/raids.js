const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { auditLog } = require('../services/analyticsService');

// Start a raid
router.post('/start', authenticateToken, async (req, res) => {
  try {
    const {
      raider_id,
      target_username,
      session_id
    } = req.body;
    
    // Check if user is the raider
    if (req.user.id !== raider_id) {
      return res.status(403).json({ error: 'Only the raider can start a raid' });
    }

    const db = req.app.get('db');
    
    // Get target streamer
    const targetQuery = 'SELECT id, username, is_verified FROM users WHERE username = $1';
    const targetResult = await db.query(targetQuery, [target_username]);
    
    if (targetResult.rows.length === 0) {
      return res.status(404).json({ error: 'Target streamer not found' });
    }
    
    const target = targetResult.rows[0];
    
    // Check if target is the same as raider
    if (target.id === raider_id) {
      return res.status(400).json({ error: 'Cannot raid yourself' });
    }
    
    // Get raider's follower count
    const followerQuery = `
      SELECT COUNT(*) as follower_count 
      FROM friends 
      WHERE friend_id = $1 AND status = 'accepted'
    `;
    const followerResult = await db.query(followerQuery, [raider_id]);
    const followerCount = parseInt(followerResult.rows[0].follower_count);
    
    // Check if raider already has an active raid
    const existingRaidQuery = `
      SELECT * FROM raids 
      WHERE raider_id = $1 AND status = 'active'
    `;
    const existingRaidResult = await db.query(existingRaidQuery, [raider_id]);
    
    if (existingRaidResult.rows.length > 0) {
      return res.status(400).json({ error: 'You already have an active raid' });
    }
    
    // Check if target is currently being raided by someone else
    const targetRaidQuery = `
      SELECT * FROM raids 
      WHERE target_streamer_id = $1 AND status = 'active'
    `;
    const targetRaidResult = await db.query(targetRaidQuery, [target.id]);
    
    if (targetRaidResult.rows.length > 0) {
      return res.status(400).json({ error: 'Target streamer is already being raided' });
    }
    
    // Create raid
    const insertQuery = `
      INSERT INTO raids (
        raider_id, target_streamer_id, session_id, 
        follower_count, status
      ) VALUES ($1, $2, $3, $4, 'active')
      RETURNING *
    `;
    
    const insertResult = await db.query(insertQuery, [
      raider_id,
      target.id,
      session_id,
      followerCount
    ]);
    
    const raid = insertResult.rows[0];
    
    // Get raider info for response
    const raiderQuery = 'SELECT username, is_verified FROM users WHERE id = $1';
    const raiderResult = await db.query(raiderQuery, [raider_id]);
    const raider = raiderResult.rows[0];
    
    // Log the raid start
    await auditLog(req.user.id, 'raid_started', 'raids', raid.id, {
      raider_id,
      target_streamer_id: target.id,
      target_username,
      session_id,
      follower_count: followerCount
    }, req.ip, req.get('User-Agent'));
    
    // Format response
    const response = {
      ...raid,
      raider_info: {
        username: raider.username,
        is_verified: raider.is_verified
      }
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error starting raid:', error);
    res.status(500).json({ error: 'Failed to start raid' });
  }
});

// End a raid
router.post('/end/:raidId', authenticateToken, async (req, res) => {
  try {
    const { raidId } = req.params;
    
    const db = req.app.get('db');
    
    // Get the raid
    const raidQuery = 'SELECT * FROM raids WHERE id = $1';
    const raidResult = await db.query(raidQuery, [raidId]);
    
    if (raidResult.rows.length === 0) {
      return res.status(404).json({ error: 'Raid not found' });
    }
    
    const raid = raidResult.rows[0];
    
    // Check if user is the raider
    if (req.user.id !== raid.raider_id && !req.user.is_admin) {
      return res.status(403).json({ error: 'Only the raider can end the raid' });
    }
    
    // Check if raid is active
    if (raid.status !== 'active') {
      return res.status(400).json({ error: 'Raid is not active' });
    }
    
    // End the raid
    const updateQuery = `
      UPDATE raids 
      SET status = 'completed', ended_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await db.query(updateQuery, [raidId]);
    const endedRaid = result.rows[0];
    
    // Log the raid end
    await auditLog(req.user.id, 'raid_ended', 'raids', raidId, {
      raider_id: raid.raider_id,
      target_streamer_id: raid.target_streamer_id,
      follower_count: raid.follower_count,
      total_tip_amount: raid.total_tip_amount,
      tip_count: raid.tip_count
    }, req.ip, req.get('User-Agent'));
    
    res.json({
      message: 'Raid ended successfully',
      raid: endedRaid
    });
  } catch (error) {
    console.error('Error ending raid:', error);
    res.status(500).json({ error: 'Failed to end raid' });
  }
});

// Get raid details
router.get('/:raidId', authenticateToken, async (req, res) => {
  try {
    const { raidId } = req.params;
    
    const db = req.app.get('db');
    
    // Get raid with user info
    const raidQuery = `
      SELECT 
        r.*,
        u1.username as raider_username,
        u1.is_verified as raider_verified,
        u2.username as target_username,
        u2.is_verified as target_verified
      FROM raids r
      JOIN users u1 ON r.raider_id = u1.id
      JOIN users u2 ON r.target_streamer_id = u2.id
      WHERE r.id = $1
    `;
    
    const result = await db.query(raidQuery, [raidId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Raid not found' });
    }
    
    const raid = result.rows[0];
    
    // Check if user has access to this raid
    if (req.user.id !== raid.raider_id && 
        req.user.id !== raid.target_streamer_id && 
        !req.user.is_admin) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Calculate duration
    const startTime = new Date(raid.started_at);
    const endTime = raid.ended_at ? new Date(raid.ended_at) : new Date();
    const duration = Math.floor((endTime - startTime) / 1000); // seconds
    
    // Format response
    const response = {
      id: raid.id,
      raider_id: raid.raider_id,
      target_streamer_id: raid.target_streamer_id,
      session_id: raid.session_id,
      follower_count: raid.follower_count,
      tip_count: raid.tip_count,
      total_tip_amount: raid.total_tip_amount,
      status: raid.status,
      started_at: raid.started_at,
      ended_at: raid.ended_at,
      duration: duration,
      raider_info: {
        username: raid.raider_username,
        is_verified: raid.raider_verified
      },
      target_info: {
        username: raid.target_username,
        is_verified: raid.target_verified
      }
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching raid details:', error);
    res.status(500).json({ error: 'Failed to fetch raid details' });
  }
});

// Get recent raids for a user
router.get('/recent/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10 } = req.query;
    
    // Check if user can view these raids
    if (req.user.id !== userId && !req.user.is_admin) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const db = req.app.get('db');
    
    const recentRaidsQuery = `
      SELECT 
        r.*,
        u1.username as raider_username,
        u1.is_verified as raider_verified,
        u2.username as target_username,
        u2.is_verified as target_verified
      FROM raids r
      JOIN users u1 ON r.raider_id = u1.id
      JOIN users u2 ON r.target_streamer_id = u2.id
      WHERE r.raider_id = $1 OR r.target_streamer_id = $1
      ORDER BY r.started_at DESC
      LIMIT $2
    `;
    
    const result = await db.query(recentRaidsQuery, [userId, parseInt(limit)]);
    
    // Format the response
    const raids = result.rows.map(raid => ({
      id: raid.id,
      raider_id: raid.raider_id,
      target_streamer_id: raid.target_streamer_id,
      session_id: raid.session_id,
      follower_count: raid.follower_count,
      tip_count: raid.tip_count,
      total_tip_amount: raid.total_tip_amount,
      status: raid.status,
      started_at: raid.started_at,
      ended_at: raid.ended_at,
      raider_info: {
        username: raid.raider_username,
        is_verified: raid.raider_verified
      },
      target_info: {
        username: raid.target_username,
        is_verified: raid.target_verified
      }
    }));
    
    res.json(raids);
  } catch (error) {
    console.error('Error fetching recent raids:', error);
    res.status(500).json({ error: 'Failed to fetch recent raids' });
  }
});

// Get active raids
router.get('/active', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin or wants to see public raids
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const db = req.app.get('db');
    
    const activeRaidsQuery = `
      SELECT 
        r.*,
        u1.username as raider_username,
        u1.is_verified as raider_verified,
        u2.username as target_username,
        u2.is_verified as target_verified
      FROM raids r
      JOIN users u1 ON r.raider_id = u1.id
      JOIN users u2 ON r.target_streamer_id = u2.id
      WHERE r.status = 'active'
      ORDER BY r.started_at DESC
    `;
    
    const result = await db.query(activeRaidsQuery);
    
    // Format the response
    const raids = result.rows.map(raid => ({
      id: raid.id,
      raider_id: raid.raider_id,
      target_streamer_id: raid.target_streamer_id,
      session_id: raid.session_id,
      follower_count: raid.follower_count,
      tip_count: raid.tip_count,
      total_tip_amount: raid.total_tip_amount,
      status: raid.status,
      started_at: raid.started_at,
      raider_info: {
        username: raid.raider_username,
        is_verified: raid.raider_verified
      },
      target_info: {
        username: raid.target_username,
        is_verified: raid.target_verified
      }
    }));
    
    res.json({
      active_raids: raids,
      total: raids.length
    });
  } catch (error) {
    console.error('Error fetching active raids:', error);
    res.status(500).json({ error: 'Failed to fetch active raids' });
  }
});

// Update raid tip count and amount
router.post('/update-tips/:raidId', authenticateToken, async (req, res) => {
  try {
    const { raidId } = req.params;
    const {
      tip_count_increment = 1,
      tip_amount_increment = 0
    } = req.body;
    
    const db = req.app.get('db');
    
    // Get the raid
    const raidQuery = 'SELECT * FROM raids WHERE id = $1';
    const raidResult = await db.query(raidQuery, [raidId]);
    
    if (raidResult.rows.length === 0) {
      return res.status(404).json({ error: 'Raid not found' });
    }
    
    const raid = raidResult.rows[0];
    
    // Check if raid is active
    if (raid.status !== 'active') {
      return res.status(400).json({ error: 'Raid is not active' });
    }
    
    // Check if user is the raider or target (or admin)
    if (req.user.id !== raid.raider_id && 
        req.user.id !== raid.target_streamer_id && 
        !req.user.is_admin) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Update raid stats
    const updateQuery = `
      UPDATE raids 
      SET 
        tip_count = tip_count + $1,
        total_tip_amount = total_tip_amount + $2
      WHERE id = $3
      RETURNING *
    `;
    
    const result = await db.query(updateQuery, [
      tip_count_increment,
      tip_amount_increment,
      raidId
    ]);
    
    const updatedRaid = result.rows[0];
    
    // Log the tip update
    await auditLog(req.user.id, 'raid_tip_updated', 'raids', raidId, {
      raider_id: raid.raider_id,
      target_streamer_id: raid.target_streamer_id,
      tip_count_increment,
      tip_amount_increment,
      new_totals: {
        tip_count: updatedRaid.tip_count,
        total_tip_amount: updatedRaid.total_tip_amount
      }
    }, req.ip, req.get('User-Agent'));
    
    res.json(updatedRaid);
  } catch (error) {
    console.error('Error updating raid tips:', error);
    res.status(500).json({ error: 'Failed to update raid tips' });
  }
});

// Get raid analytics
router.get('/analytics/:raidId', authenticateToken, async (req, res) => {
  try {
    const { raidId } = req.params;
    
    const db = req.app.get('db');
    
    // Get raid with analytics
    const raidQuery = `
      SELECT 
        r.*,
        u1.username as raider_username,
        u1.is_verified as raider_verified,
        u2.username as target_username,
        u2.is_verified as target_verified
      FROM raids r
      JOIN users u1 ON r.raider_id = u1.id
      JOIN users u2 ON r.target_streamer_id = u2.id
      WHERE r.id = $1
    `;
    
    const result = await db.query(raidQuery, [raidId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Raid not found' });
    }
    
    const raid = result.rows[0];
    
    // Check if user has access
    if (req.user.id !== raid.raider_id && 
        req.user.id !== raid.target_streamer_id && 
        !req.user.is_admin) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Calculate metrics
    const startTime = new Date(raid.started_at);
    const endTime = raid.ended_at ? new Date(raid.ended_at) : new Date();
    const duration = Math.floor((endTime - startTime) / 1000); // seconds
    
    const analytics = {
      raid_id: raidId,
      raider: {
        id: raid.raider_id,
        username: raid.raider_username,
        is_verified: raid.raider_verified
      },
      target: {
        id: raid.target_streamer_id,
        username: raid.target_username,
        is_verified: raid.target_verified
      },
      metrics: {
        duration: duration,
        follower_count: raid.follower_count,
        tip_count: raid.tip_count,
        total_tip_amount: raid.total_tip_amount,
        average_tip_amount: raid.tip_count > 0 ? raid.total_tip_amount / raid.tip_count : 0,
        tips_per_minute: duration > 0 ? (raid.tip_count / (duration / 60)) : 0,
        revenue_per_minute: duration > 0 ? (raid.total_tip_amount / (duration / 60)) : 0
      },
      status: raid.status,
      timestamps: {
        started_at: raid.started_at,
        ended_at: raid.ended_at
      }
    };
    
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching raid analytics:', error);
    res.status(500).json({ error: 'Failed to fetch raid analytics' });
  }
});

module.exports = router;