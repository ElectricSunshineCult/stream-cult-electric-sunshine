const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { auditLog } = require('../services/analyticsService');

// Get connection status for a user
router.get('/status/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if user can access this status
    if (req.user.id !== userId && !req.user.is_admin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const db = req.app.get('db');
    
    // Get active connection status
    const statusQuery = `
      SELECT * FROM connection_status 
      WHERE user_id = $1 AND status IN ('connected', 'connecting')
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    const result = await db.query(statusQuery, [userId]);
    
    if (result.rows.length === 0) {
      return res.json({
        status: 'disconnected',
        user_id: userId,
        session_id: null,
        connection_type: 'polling',
        latency_ms: 0,
        bandwidth_mbps: 0,
        last_ping: null,
        disconnect_reason: 'No active connection',
        reconnect_attempts: 0
      });
    }
    
    const connection = result.rows[0];
    res.json(connection);
  } catch (error) {
    console.error('Error fetching connection status:', error);
    res.status(500).json({ error: 'Failed to fetch connection status' });
  }
});

// Update connection status
router.post('/update/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      session_id,
      connection_type,
      status,
      latency_ms,
      bandwidth_mbps,
      disconnect_reason
    } = req.body;
    
    // Check if user can update their status
    if (req.user.id !== userId && !req.user.is_admin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const db = req.app.get('db');
    
    // Validate status
    const validStatuses = ['connected', 'connecting', 'disconnected', 'error'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    // Validate connection type
    const validTypes = ['websocket', 'polling', 'sse'];
    if (!validTypes.includes(connection_type)) {
      return res.status(400).json({ error: 'Invalid connection type' });
    }

    // Update or insert connection status
    const upsertQuery = `
      INSERT INTO connection_status (
        user_id, session_id, connection_type, status, latency_ms, 
        bandwidth_mbps, last_ping, disconnect_reason
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (user_id, session_id) 
      DO UPDATE SET 
        connection_type = EXCLUDED.connection_type,
        status = EXCLUDED.status,
        latency_ms = EXCLUDED.latency_ms,
        bandwidth_mbps = EXCLUDED.bandwidth_mbps,
        last_ping = EXCLUDED.last_ping,
        disconnect_reason = EXCLUDED.disconnect_reason,
        reconnect_attempts = CASE 
          WHEN EXCLUDED.status = 'connected' THEN 0
          ELSE connection_status.reconnect_attempts + 1
        END
      RETURNING *
    `;
    
    const result = await db.query(upsertQuery, [
      userId,
      session_id,
      connection_type,
      status,
      latency_ms || 0,
      bandwidth_mbps || 0,
      new Date().toISOString(),
      disconnect_reason
    ]);
    
    const connection = result.rows[0];
    
    // Log the status change if it's significant
    if (status === 'disconnected' || status === 'error') {
      await auditLog(req.user.id, 'connection_status_changed', 'connection_status', connection.id, {
        old_status: 'connected',
        new_status: status,
        reason: disconnect_reason
      }, req.ip, req.get('User-Agent'));
    }
    
    res.json(connection);
  } catch (error) {
    console.error('Error updating connection status:', error);
    res.status(500).json({ error: 'Failed to update connection status' });
  }
});

// Get connection history for a user
router.get('/history/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50 } = req.query;
    
    // Check if user can access history
    if (req.user.id !== userId && !req.user.is_admin) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const db = req.app.get('db');
    
    const historyQuery = `
      SELECT * FROM connection_status 
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;
    
    const result = await db.query(historyQuery, [userId, parseInt(limit)]);
    
    res.json({
      history: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching connection history:', error);
    res.status(500).json({ error: 'Failed to fetch connection history' });
  }
});

// Get all active connections (admin only)
router.get('/active', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const db = req.app.get('db');
    
    const activeConnectionsQuery = `
      SELECT 
        cs.*,
        u.username,
        u.email,
        u.is_verified
      FROM connection_status cs
      JOIN users u ON cs.user_id = u.id
      WHERE cs.status = 'connected'
      ORDER BY cs.last_ping DESC
    `;
    
    const result = await db.query(activeConnectionsQuery);
    
    res.json({
      active_connections: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching active connections:', error);
    res.status(500).json({ error: 'Failed to fetch active connections' });
  }
});

// Test connection quality
router.post('/test/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if user can test their connection
    if (req.user.id !== userId && !req.user.is_admin) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const db = req.app.get('db');
    
    // Simulate connection test
    const testResults = {
      latency: Math.floor(Math.random() * 200) + 20, // 20-220ms
      jitter: Math.floor(Math.random() * 50) + 5,   // 5-55ms
      packet_loss: Math.random() * 5,               // 0-5%
      bandwidth_up: Math.random() * 50 + 5,         // 5-55 Mbps
      bandwidth_down: Math.random() * 100 + 20,     // 20-120 Mbps
      quality_score: 0,
      recommendations: []
    };
    
    // Calculate quality score
    let score = 100;
    if (testResults.latency > 100) score -= 20;
    if (testResults.latency > 200) score -= 30;
    if (testResults.jitter > 20) score -= 15;
    if (testResults.packet_loss > 1) score -= 25;
    if (testResults.bandwidth_down < 10) score -= 30;
    
    testResults.quality_score = Math.max(0, score);
    
    // Generate recommendations
    if (testResults.latency > 100) {
      testResults.recommendations.push('High latency detected - consider reducing video quality');
    }
    if (testResults.bandwidth_down < 10) {
      testResults.recommendations.push('Low bandwidth - enable auto-quality adjustment');
    }
    if (testResults.packet_loss > 1) {
      testResults.recommendations.push('Packet loss detected - check network connection');
    }
    
    // Update user connection with test results
    await db.query(`
      UPDATE video_quality_settings 
      SET 
        latency_ms = $1,
        network_speed = $2,
        auto_quality = $3,
        adaptive_streaming = $4,
        updated_at = NOW()
      WHERE user_id = $5
    `, [
      testResults.latency,
      testResults.bandwidth_down > 25 ? 'fast' : testResults.bandwidth_down > 10 ? 'medium' : 'slow',
      testResults.quality_score < 70, // Enable auto-quality for poor connections
      true,
      userId
    ]);
    
    // Log the test
    await auditLog(req.user.id, 'connection_quality_test', 'connection_status', userId, {
      test_results: testResults
    }, req.ip, req.get('User-Agent'));
    
    res.json(testResults);
  } catch (error) {
    console.error('Error testing connection quality:', error);
    res.status(500).json({ error: 'Failed to test connection quality' });
  }
});

// Clean up stale connections
router.post('/cleanup', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const db = req.app.get('db');
    
    // Mark stale connections as disconnected
    const cleanupQuery = `
      UPDATE connection_status 
      SET status = 'disconnected', 
          disconnect_reason = 'Automatic cleanup - stale connection',
          last_ping = NOW()
      WHERE status IN ('connected', 'connecting') 
        AND last_ping < NOW() - INTERVAL '5 minutes'
    `;
    
    const result = await db.query(cleanupQuery);
    
    // Get cleanup statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_connections,
        COUNT(CASE WHEN status = 'connected' THEN 1 END) as active_connections,
        COUNT(CASE WHEN status = 'disconnected' THEN 1 END) as stale_connections
      FROM connection_status
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `;
    
    const statsResult = await db.query(statsQuery);
    const stats = statsResult.rows[0];
    
    // Log the cleanup
    await auditLog(req.user.id, 'connection_cleanup', 'connection_status', null, {
      cleaned_connections: result.rowCount,
      stats
    }, req.ip, req.get('User-Agent'));
    
    res.json({
      message: 'Cleanup completed',
      cleaned_connections: result.rowCount,
      stats
    });
  } catch (error) {
    console.error('Error cleaning up connections:', error);
    res.status(500).json({ error: 'Failed to cleanup connections' });
  }
});

module.exports = router;