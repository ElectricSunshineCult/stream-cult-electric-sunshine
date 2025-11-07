const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { auditLog } = require('../services/analyticsService');

// Get tip split settings for a user
router.get('/settings/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if user can access these settings
    if (req.user.id !== userId && !req.user.is_admin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const db = req.app.get('db');
    
    // Get tip split settings
    const settingsQuery = `
      SELECT * FROM user_settings 
      WHERE user_id = $1 AND setting_type = 'tip_split'
    `;
    
    const result = await db.query(settingsQuery, [userId]);
    
    if (result.rows.length === 0) {
      // Return default settings
      const defaultSettings = {
        auto_split: true,
        default_host_percentage: 50,
        default_guest_percentage: 50,
        minimum_tip_to_split: 1,
        split_rules: {
          host_gets_bonus: true,
          guest_engagement_multiplier: false,
          raider_bonus: false
        }
      };
      return res.json(defaultSettings);
    }
    
    const settings = result.rows[0].settings;
    res.json(settings);
  } catch (error) {
    console.error('Error fetching tip split settings:', error);
    res.status(500).json({ error: 'Failed to fetch tip split settings' });
  }
});

// Update tip split settings
router.put('/settings/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const settings = req.body;
    
    // Check if user can update these settings
    if (req.user.id !== userId && !req.user.is_admin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const db = req.app.get('db');
    
    // Validate settings
    if (settings.default_host_percentage < 0 || settings.default_host_percentage > 100) {
      return res.status(400).json({ error: 'Host percentage must be between 0 and 100' });
    }
    
    if (settings.default_guest_percentage < 0 || settings.default_guest_percentage > 100) {
      return res.status(400).json({ error: 'Guest percentage must be between 0 and 100' });
    }
    
    if (settings.default_host_percentage + settings.default_guest_percentage !== 100) {
      return res.status(400).json({ error: 'Host and guest percentages must sum to 100' });
    }
    
    if (settings.minimum_tip_to_split < 0) {
      return res.status(400).json({ error: 'Minimum tip to split must be non-negative' });
    }

    // Upsert settings
    const upsertQuery = `
      INSERT INTO user_settings (user_id, setting_type, settings)
      VALUES ($1, 'tip_split', $2)
      ON CONFLICT (user_id, setting_type)
      DO UPDATE SET settings = $2, updated_at = NOW()
      RETURNING *
    `;
    
    const result = await db.query(upsertQuery, [userId, settings]);
    
    const updatedSettings = result.rows[0].settings;
    
    // Log the update
    await auditLog(req.user.id, 'tip_split_settings_updated', 'user_settings', userId, {
      old_settings: req.body, // In real app, get old settings
      new_settings: updatedSettings
    }, req.ip, req.get('User-Agent'));
    
    res.json(updatedSettings);
  } catch (error) {
    console.error('Error updating tip split settings:', error);
    res.status(500).json({ error: 'Failed to update tip split settings' });
  }
});

// Get tip splits for a session
router.get('/session/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const db = req.app.get('db');
    
    // Get tip splits with user info
    const splitsQuery = `
      SELECT 
        ts.*,
        u.username as recipient_username,
        u.is_verified as recipient_verified,
        t.sender_id,
        t.amount as original_amount,
        t.message,
        t.category
      FROM tip_splits ts
      JOIN users u ON ts.recipient_id = u.id
      JOIN tips t ON ts.original_tip_id = t.id
      WHERE ts.session_id = $1
      ORDER BY ts.created_at DESC
    `;
    
    const result = await db.query(splitsQuery, [sessionId]);
    
    // Format the response
    const splits = result.rows.map(split => ({
      id: split.id,
      original_tip_id: split.original_tip_id,
      session_id: split.session_id,
      recipient_id: split.recipient_id,
      amount: split.amount,
      percentage: split.percentage,
      status: split.status,
      processed_at: split.processed_at,
      created_at: split.created_at,
      recipient_info: {
        username: split.recipient_username,
        is_host: false, // This would need to be determined from session context
        avatar_url: null // This would come from user profile
      },
      original_tip: {
        sender_id: split.sender_id,
        total_amount: split.original_amount,
        message: split.message,
        category: split.category
      }
    }));
    
    res.json(splits);
  } catch (error) {
    console.error('Error fetching tip splits:', error);
    res.status(500).json({ error: 'Failed to fetch tip splits' });
  }
});

// Process automatic tip split
router.post('/process/:tipId', authenticateToken, async (req, res) => {
  try {
    const { tipId } = req.params;
    const { session_id, auto_split = true } = req.body;
    
    const db = req.app.get('db');
    
    // Get the tip
    const tipQuery = 'SELECT * FROM tips WHERE id = $1';
    const tipResult = await db.query(tipQuery, [tipId]);
    
    if (tipResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tip not found' });
    }
    
    const tip = tipResult.rows[0];
    
    // Check if user can process this tip
    if (req.user.id !== tip.recipient_id && !req.user.is_admin) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Check if tip is already split
    const existingSplitsQuery = 'SELECT * FROM tip_splits WHERE original_tip_id = $1';
    const existingSplitsResult = await db.query(existingSplitsQuery, [tipId]);
    
    if (existingSplitsResult.rows.length > 0) {
      return res.status(400).json({ error: 'Tip is already split' });
    }
    
    // Get active guest streamers for this session
    const guestsQuery = `
      SELECT 
        gs.*,
        u.username
      FROM guest_streamers gs
      JOIN users u ON gs.guest_id = u.id
      WHERE gs.session_id = $1 
        AND gs.status = 'active' 
        AND gs.tipping_enabled = true
    `;
    
    const guestsResult = await db.query(guestsQuery, [session_id]);
    const guests = guestsResult.rows;
    
    if (guests.length === 0) {
      return res.status(400).json({ error: 'No active guests to split with' });
    }
    
    // Get tip split settings
    const settingsQuery = `
      SELECT settings FROM user_settings 
      WHERE user_id = $1 AND setting_type = 'tip_split'
    `;
    
    const settingsResult = await db.query(settingsQuery, [tip.recipient_id]);
    const settings = settingsResult.rows.length > 0 ? 
      settingsResult.rows[0].settings : {
        auto_split: true,
        default_host_percentage: 50,
        default_guest_percentage: 50,
        minimum_tip_to_split: 1
      };
    
    // Check if tip meets minimum amount for splitting
    if (tip.amount < settings.minimum_tip_to_split) {
      return res.status(400).json({ 
        error: `Tip amount $${tip.amount} is below minimum split amount $${settings.minimum_tip_to_split}` 
      });
    }
    
    // Calculate splits
    const splits = [];
    let remainingAmount = tip.amount;
    let totalPercentage = 0;
    
    // Create split for host (recipient of original tip)
    const hostPercentage = 100 - guests.reduce((sum, guest) => sum + guest.tip_split_percentage, 0);
    const hostAmount = (tip.amount * hostPercentage) / 100;
    
    splits.push({
      original_tip_id: tipId,
      session_id: session_id,
      recipient_id: tip.recipient_id,
      amount: hostAmount,
      percentage: hostPercentage,
      status: 'completed',
      processed_at: new Date().toISOString()
    });
    
    remainingAmount -= hostAmount;
    totalPercentage += hostPercentage;
    
    // Create splits for each guest
    guests.forEach(guest => {
      const guestAmount = (tip.amount * guest.tip_split_percentage) / 100;
      splits.push({
        original_tip_id: tipId,
        session_id: session_id,
        recipient_id: guest.guest_id,
        amount: guestAmount,
        percentage: guest.tip_split_percentage,
        status: 'pending'
      });
      
      remainingAmount -= guestAmount;
      totalPercentage += guest.tip_split_percentage;
    });
    
    // Insert splits
    const insertQuery = `
      INSERT INTO tip_splits (
        original_tip_id, session_id, recipient_id, amount, percentage, status, processed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const createdSplits = [];
    for (const split of splits) {
      const result = await db.query(insertQuery, [
        split.original_tip_id,
        split.session_id,
        split.recipient_id,
        split.amount,
        split.percentage,
        split.status,
        split.processed_at || null
      ]);
      createdSplits.push(result.rows[0]);
    }
    
    // Update original tip status
    await db.query(
      'UPDATE tips SET status = $1 WHERE id = $2',
      ['split', tipId]
    );
    
    // Log the split processing
    await auditLog(req.user.id, 'tip_split_processed', 'tip_splits', tipId, {
      original_tip_amount: tip.amount,
      session_id: session_id,
      split_count: createdSplits.length,
      splits: createdSplits.map(s => ({
        recipient_id: s.recipient_id,
        amount: s.amount,
        percentage: s.percentage
      }))
    }, req.ip, req.get('User-Agent'));
    
    // Get recipient info for response
    const recipientInfoQuery = `
      SELECT u.username, u.is_verified,
             CASE WHEN u.id = $1 THEN true ELSE false END as is_host
      FROM users u
      WHERE u.id = ANY($2)
    `;
    
    const recipientIds = createdSplits.map(s => s.recipient_id);
    const recipientInfoResult = await db.query(recipientInfoQuery, [tip.recipient_id, recipientIds]);
    const recipientInfo = {};
    recipientInfoResult.rows.forEach(info => {
      recipientInfo[info.id] = {
        username: info.username,
        is_verified: info.is_verified,
        is_host: info.is_host
      };
    });
    
    // Format response
    const response = createdSplits.map(split => ({
      ...split,
      recipient_info: recipientInfo[split.recipient_id]
    }));
    
    res.json(response);
  } catch (error) {
    console.error('Error processing tip split:', error);
    res.status(500).json({ error: 'Failed to process tip split' });
  }
});

// Force custom tip split
router.post('/force/:tipId', authenticateToken, async (req, res) => {
  try {
    const { tipId } = req.params;
    const { session_id, custom_split } = req.body;
    
    // Validate custom split
    if (!custom_split || typeof custom_split !== 'object') {
      return res.status(400).json({ error: 'Invalid custom split data' });
    }
    
    const totalPercentage = Object.values(custom_split).reduce((sum, pct) => sum + pct, 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      return res.status(400).json({ error: 'Custom split percentages must sum to 100' });
    }
    
    const db = req.app.get('db');
    
    // Get the tip
    const tipQuery = 'SELECT * FROM tips WHERE id = $1';
    const tipResult = await db.query(tipQuery, [tipId]);
    
    if (tipResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tip not found' });
    }
    
    const tip = tipResult.rows[0];
    
    // Check if user can force this split
    if (req.user.id !== tip.recipient_id && !req.user.is_admin) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Create splits based on custom split
    const splits = [];
    for (const [recipientId, percentage] of Object.entries(custom_split)) {
      const amount = (tip.amount * percentage) / 100;
      splits.push({
        original_tip_id: tipId,
        session_id: session_id,
        recipient_id: recipientId,
        amount: amount,
        percentage: percentage,
        status: 'completed',
        processed_at: new Date().toISOString()
      });
    }
    
    // Insert splits
    const insertQuery = `
      INSERT INTO tip_splits (
        original_tip_id, session_id, recipient_id, amount, percentage, status, processed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const createdSplits = [];
    for (const split of splits) {
      const result = await db.query(insertQuery, [
        split.original_tip_id,
        split.session_id,
        split.recipient_id,
        split.amount,
        split.percentage,
        split.status,
        split.processed_at
      ]);
      createdSplits.push(result.rows[0]);
    }
    
    // Update original tip status
    await db.query(
      'UPDATE tips SET status = $1 WHERE id = $2',
      ['split', tipId]
    );
    
    // Log the forced split
    await auditLog(req.user.id, 'tip_split_forced', 'tip_splits', tipId, {
      original_tip_amount: tip.amount,
      session_id: session_id,
      custom_split,
      splits: createdSplits
    }, req.ip, req.get('User-Agent'));
    
    res.json(createdSplits);
  } catch (error) {
    console.error('Error forcing tip split:', error);
    res.status(500).json({ error: 'Failed to force tip split' });
  }
});

// Get tip split analytics for a session
router.get('/analytics/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const db = req.app.get('db');
    
    // Get analytics data
    const analyticsQuery = `
      SELECT 
        ts.recipient_id,
        u.username,
        u.is_verified,
        COUNT(*) as tip_count,
        SUM(ts.amount) as total_amount,
        AVG(ts.percentage) as avg_percentage,
        MIN(ts.amount) as min_amount,
        MAX(ts.amount) as max_amount
      FROM tip_splits ts
      JOIN users u ON ts.recipient_id = u.id
      WHERE ts.session_id = $1
      GROUP BY ts.recipient_id, u.username, u.is_verified
      ORDER BY total_amount DESC
    `;
    
    const result = await db.query(analyticsQuery, [sessionId]);
    
    // Get session summary
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_splits,
        SUM(amount) as total_amount,
        AVG(amount) as avg_amount,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as completed_amount,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_amount
      FROM tip_splits
      WHERE session_id = $1
    `;
    
    const summaryResult = await db.query(summaryQuery, [sessionId]);
    const summary = summaryResult.rows[0];
    
    const analytics = {
      session_id: sessionId,
      summary: {
        total_splits: parseInt(summary.total_splits) || 0,
        total_amount: parseFloat(summary.total_amount) || 0,
        avg_amount: parseFloat(summary.avg_amount) || 0,
        completed_amount: parseFloat(summary.completed_amount) || 0,
        pending_amount: parseFloat(summary.pending_amount) || 0
      },
      recipients: result.rows.map(row => ({
        recipient_id: row.recipient_id,
        username: row.username,
        is_verified: row.is_verified,
        tip_count: parseInt(row.tip_count),
        total_amount: parseFloat(row.total_amount),
        avg_percentage: parseFloat(row.avg_percentage),
        min_amount: parseFloat(row.min_amount),
        max_amount: parseFloat(row.max_amount)
      }))
    };
    
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching tip split analytics:', error);
    res.status(500).json({ error: 'Failed to fetch tip split analytics' });
  }
});

// Process pending tip splits
router.post('/process-pending', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const db = req.app.get('db');
    
    // Get pending splits older than 1 hour
    const pendingSplitsQuery = `
      SELECT * FROM tip_splits 
      WHERE status = 'pending' 
        AND created_at < NOW() - INTERVAL '1 hour'
    `;
    
    const pendingSplitsResult = await db.query(pendingSplitsQuery);
    const pendingSplits = pendingSplitsResult.rows;
    
    let processedCount = 0;
    let failedCount = 0;
    
    for (const split of pendingSplits) {
      try {
        // Here you would integrate with payment processing
        // For now, we'll just mark as completed
        
        await db.query(
          'UPDATE tip_splits SET status = $1, processed_at = NOW() WHERE id = $2',
          ['completed', split.id]
        );
        
        processedCount++;
      } catch (error) {
        console.error('Error processing split:', error);
        await db.query(
          'UPDATE tip_splits SET status = $1 WHERE id = $2',
          ['failed', split.id]
        );
        failedCount++;
      }
    }
    
    // Log the batch processing
    await auditLog(req.user.id, 'tip_splits_batch_processed', 'tip_splits', null, {
      processed_count: processedCount,
      failed_count: failedCount,
      total_pending: pendingSplits.length
    }, req.ip, req.get('User-Agent'));
    
    res.json({
      message: 'Pending splits processed',
      processed_count: processedCount,
      failed_count: failedCount,
      total_processed: pendingSplits.length
    });
  } catch (error) {
    console.error('Error processing pending splits:', error);
    res.status(500).json({ error: 'Failed to process pending splits' });
  }
});

module.exports = router;