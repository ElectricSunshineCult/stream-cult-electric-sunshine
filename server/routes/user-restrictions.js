const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { auditLog } = require('../services/analyticsService');

// Get restrictions for a user
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if user can view these restrictions
    if (req.user.id !== userId && !req.user.is_admin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const db = req.app.get('db');
    
    // Get active restrictions
    const restrictionsQuery = `
      SELECT * FROM user_restrictions 
      WHERE user_id = $1 AND is_active = true
        AND (end_time IS NULL OR end_time > NOW())
      ORDER BY start_time DESC
    `;
    
    const result = await db.query(restrictionsQuery, [userId]);
    
    if (result.rows.length === 0) {
      return res.json(null); // No restrictions
    }
    
    const restriction = result.rows[0];
    res.json(restriction);
  } catch (error) {
    console.error('Error fetching user restrictions:', error);
    res.status(500).json({ error: 'Failed to fetch user restrictions' });
  }
});

// Create new streamer restriction (automatically for new users)
router.post('/create-new-streamer/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const db = req.app.get('db');
    
    // Check if user already has restrictions
    const existingQuery = `
      SELECT * FROM user_restrictions 
      WHERE user_id = $1 AND restriction_type = 'new_streamer' AND is_active = true
    `;
    
    const existingResult = await db.query(existingQuery, [userId]);
    
    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: 'User already has new streamer restrictions' });
    }
    
    // Create new streamer restriction (30 minutes)
    const endTime = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
    
    const insertQuery = `
      INSERT INTO user_restrictions (
        user_id, restriction_type, restriction_data, is_active, end_time, reason
      ) VALUES ($1, 'new_streamer', $2, true, $3, $4)
      RETURNING *
    `;
    
    const restrictionData = {
      premium_features_blocked: ['messaging', 'dming', 'friend_adding', 'emote_uploading', 'custom_url', 'premium_themes', 'analytics'],
      allowed_features: ['basic_chat', 'tipping', 'basic_viewing', 'reactions'],
      max_streaming_time: 1800 // 30 minutes
    };
    
    const result = await db.query(insertQuery, [
      userId,
      restrictionData,
      endTime.toISOString(),
      'Automatic restriction for new streamers to prevent abuse'
    ]);
    
    const restriction = result.rows[0];
    
    // Log the creation
    await auditLog(req.user.id, 'new_streamer_restriction_created', 'user_restrictions', restriction.id, {
      user_id: userId,
      restriction_data: restrictionData,
      end_time: endTime.toISOString()
    }, req.ip, req.get('User-Agent'));
    
    res.json(restriction);
  } catch (error) {
    console.error('Error creating new streamer restriction:', error);
    res.status(500).json({ error: 'Failed to create new streamer restriction' });
  }
});

// Check if user can access a specific feature
router.post('/check-feature', authenticateToken, async (req, res) => {
  try {
    const { userId, featureId } = req.body;
    
    // Check if user can check features (own or admin)
    if (req.user.id !== userId && !req.user.is_admin) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const db = req.app.get('db');
    
    // Get active restrictions
    const restrictionsQuery = `
      SELECT * FROM user_restrictions 
      WHERE user_id = $1 AND is_active = true
        AND (end_time IS NULL OR end_time > NOW())
    `;
    
    const result = await db.query(restrictionsQuery, [userId]);
    
    if (result.rows.length === 0) {
      return res.json({
        allowed: true,
        reason: 'No active restrictions'
      });
    }
    
    const restriction = result.rows[0];
    const restrictionData = restriction.restriction_data;
    
    // Check if feature is blocked
    if (restrictionData.premium_features_blocked.includes(featureId)) {
      const timeRemaining = restriction.end_time ? 
        Math.max(0, Math.floor((new Date(restriction.end_time).getTime() - Date.now()) / 1000)) : 
        0;
      
      return res.json({
        allowed: false,
        reason: 'Feature restricted for new streamers',
        time_remaining: timeRemaining,
        restriction_id: restriction.id
      });
    }
    
    // Check if feature is explicitly allowed
    if (restrictionData.allowed_features.includes(featureId)) {
      return res.json({
        allowed: true,
        reason: 'Feature is allowed under current restrictions'
      });
    }
    
    // Default to blocked for premium features
    const premiumFeatures = ['messaging', 'dming', 'friend_adding', 'emote_uploading', 'custom_url', 'premium_themes', 'analytics'];
    if (premiumFeatures.includes(featureId)) {
      const timeRemaining = restriction.end_time ? 
        Math.max(0, Math.floor((new Date(restriction.end_time).getTime() - Date.now()) / 1000)) : 
        0;
      
      return res.json({
        allowed: false,
        reason: 'Premium feature restricted for new streamers',
        time_remaining: timeRemaining,
        restriction_id: restriction.id
      });
    }
    
    res.json({
      allowed: true,
      reason: 'Feature access granted'
    });
  } catch (error) {
    console.error('Error checking feature access:', error);
    res.status(500).json({ error: 'Failed to check feature access' });
  }
});

// Get all active restrictions (admin only)
router.get('/active', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const db = req.app.get('db');
    
    const activeRestrictionsQuery = `
      SELECT 
        ur.*,
        u.username,
        u.email
      FROM user_restrictions ur
      JOIN users u ON ur.user_id = u.id
      WHERE ur.is_active = true
        AND (ur.end_time IS NULL OR ur.end_time > NOW())
      ORDER BY ur.start_time DESC
    `;
    
    const result = await db.query(activeRestrictionsQuery);
    
    res.json({
      restrictions: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching active restrictions:', error);
    res.status(500).json({ error: 'Failed to fetch active restrictions' });
  }
});

// Remove restrictions (admin only)
router.delete('/remove/:restrictionId', authenticateToken, async (req, res) => {
  try {
    const { restrictionId } = req.params;
    
    // Check if user is admin
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const db = req.app.get('db');
    
    // Get the restriction
    const restrictionQuery = 'SELECT * FROM user_restrictions WHERE id = $1';
    const restrictionResult = await db.query(restrictionQuery, [restrictionId]);
    
    if (restrictionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Restriction not found' });
    }
    
    const restriction = restrictionResult.rows[0];
    
    // Deactivate the restriction
    const updateQuery = `
      UPDATE user_restrictions 
      SET is_active = false, end_time = NOW()
      WHERE id = $1
    `;
    
    await db.query(updateQuery, [restrictionId]);
    
    // Log the removal
    await auditLog(req.user.id, 'user_restriction_removed', 'user_restrictions', restrictionId, {
      user_id: restriction.user_id,
      restriction_type: restriction.restriction_type,
      reason: 'Removed by admin'
    }, req.ip, req.get('User-Agent'));
    
    res.json({ message: 'Restriction removed successfully' });
  } catch (error) {
    console.error('Error removing restriction:', error);
    res.status(500).json({ error: 'Failed to remove restriction' });
  }
});

// Request feature access
router.post('/request-access', authenticateToken, async (req, res) => {
  try {
    const { user_id, feature_id, reason } = req.body;
    
    // Check if user is requesting for themselves
    if (req.user.id !== user_id) {
      return res.status(403).json({ error: 'Can only request access for yourself' });
    }
    
    const db = req.app.get('db');
    
    // Check if user has active restrictions
    const restrictionsQuery = `
      SELECT * FROM user_restrictions 
      WHERE user_id = $1 AND is_active = true
        AND (end_time IS NULL OR end_time > NOW())
    `;
    
    const restrictionsResult = await db.query(restrictionsQuery, [user_id]);
    
    if (restrictionsResult.rows.length === 0) {
      return res.status(400).json({ error: 'No active restrictions found' });
    }
    
    // Create access request record
    const requestQuery = `
      INSERT INTO access_requests (user_id, feature_id, reason, status, created_at)
      VALUES ($1, $2, $3, 'pending', NOW())
      RETURNING *
    `;
    
    const result = await db.query(requestQuery, [user_id, feature_id, reason || 'User request']);
    const request = result.rows[0];
    
    // Log the request
    await auditLog(req.user.id, 'feature_access_requested', 'access_requests', request.id, {
      user_id,
      feature_id,
      reason
    }, req.ip, req.get('User-Agent'));
    
    res.json({
      message: 'Feature access request submitted',
      request_id: request.id,
      status: 'pending'
    });
  } catch (error) {
    console.error('Error requesting feature access:', error);
    res.status(500).json({ error: 'Failed to request feature access' });
  }
});

// Get access requests (admin only)
router.get('/requests', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { status = 'pending', limit = 50 } = req.query;
    
    const db = req.app.get('db');
    
    const requestsQuery = `
      SELECT 
        ar.*,
        u.username,
        u.email
      FROM access_requests ar
      JOIN users u ON ar.user_id = u.id
      WHERE ar.status = $1
      ORDER BY ar.created_at DESC
      LIMIT $2
    `;
    
    const result = await db.query(requestsQuery, [status, parseInt(limit)]);
    
    res.json({
      requests: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching access requests:', error);
    res.status(500).json({ error: 'Failed to fetch access requests' });
  }
});

// Approve/Reject access request (admin only)
router.post('/requests/:requestId/:action', authenticateToken, async (req, res) => {
  try {
    const { requestId, action } = req.params;
    const { admin_note } = req.body;
    
    // Check if user is admin
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }
    
    const db = req.app.get('db');
    
    // Get the request
    const requestQuery = 'SELECT * FROM access_requests WHERE id = $1';
    const requestResult = await db.query(requestQuery, [requestId]);
    
    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }
    
    const request = requestResult.rows[0];
    
    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request is not pending' });
    }
    
    // Update request status
    const updateQuery = `
      UPDATE access_requests 
      SET status = $1, admin_note = $2, processed_at = NOW(), processed_by = $3
      WHERE id = $4
    `;
    
    await db.query(updateQuery, [
      action === 'approve' ? 'approved' : 'rejected',
      admin_note,
      req.user.id,
      requestId
    ]);
    
    // If approved, temporarily remove restriction for the specific feature
    if (action === 'approve') {
      // Here you would implement logic to temporarily allow the specific feature
      // This could involve creating a new restriction that excludes the specific feature
      console.log(`Approved access for user ${request.user_id} to feature ${request.feature_id}`);
    }
    
    // Log the decision
    await auditLog(req.user.id, `access_request_${action}d`, 'access_requests', requestId, {
      user_id: request.user_id,
      feature_id: request.feature_id,
      admin_note
    }, req.ip, req.get('User-Agent'));
    
    res.json({
      message: `Access request ${action}d successfully`,
      request_id: requestId,
      new_status: action === 'approve' ? 'approved' : 'rejected'
    });
  } catch (error) {
    console.error('Error processing access request:', error);
    res.status(500).json({ error: 'Failed to process access request' });
  }
});

// Get restriction statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const db = req.app.get('db');
    
    // Get restriction statistics
    const statsQuery = `
      SELECT 
        restriction_type,
        COUNT(*) as count,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_count
      FROM user_restrictions
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY restriction_type
    `;
    
    const result = await db.query(statsQuery);
    
    // Get feature access request statistics
    const requestStatsQuery = `
      SELECT 
        status,
        COUNT(*) as count
      FROM access_requests
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY status
    `;
    
    const requestStatsResult = await db.query(requestStatsQuery);
    
    const stats = {
      restrictions: result.rows.reduce((acc, row) => {
        acc[row.restriction_type] = {
          total: parseInt(row.count),
          active: parseInt(row.active_count)
        };
        return acc;
      }, {}),
      access_requests: requestStatsResult.rows.reduce((acc, row) => {
        acc[row.status] = parseInt(row.count);
        return acc;
      }, {})
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching restriction stats:', error);
    res.status(500).json({ error: 'Failed to fetch restriction statistics' });
  }
});

// Clean up expired restrictions
router.post('/cleanup', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const db = req.app.get('db');
    
    // Deactivate expired restrictions
    const cleanupQuery = `
      UPDATE user_restrictions 
      SET is_active = false
      WHERE is_active = true 
        AND end_time IS NOT NULL 
        AND end_time < NOW()
    `;
    
    const result = await db.query(cleanupQuery);
    
    // Log the cleanup
    await auditLog(req.user.id, 'restrictions_cleanup', 'user_restrictions', null, {
      cleaned_count: result.rowCount
    }, req.ip, req.get('User-Agent'));
    
    res.json({
      message: 'Expired restrictions cleaned up',
      cleaned_count: result.rowCount
    });
  } catch (error) {
    console.error('Error cleaning up restrictions:', error);
    res.status(500).json({ error: 'Failed to clean up restrictions' });
  }
});

module.exports = router;