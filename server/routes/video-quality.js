const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { auditLog } = require('../services/analyticsService');

// Get video quality settings for a user
router.get('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if user can access these settings
    if (req.user.id !== userId && !req.user.is_admin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const db = req.app.get('db');
    
    // Get video quality settings
    const settingsQuery = `
      SELECT * FROM video_quality_settings 
      WHERE user_id = $1
    `;
    
    const settingsResult = await db.query(settingsQuery, [userId]);
    
    if (settingsResult.rows.length === 0) {
      // Create default settings
      const defaultSettings = {
        user_id: userId,
        quality_preference: 'auto',
        resolution: 'auto',
        bitrate_kbps: 0,
        framerate: 30,
        device_type: detectDeviceType(req),
        network_speed: 'unknown',
        auto_quality: true,
        adaptive_streaming: true
      };
      
      const insertQuery = `
        INSERT INTO video_quality_settings (
          user_id, quality_preference, resolution, bitrate_kbps, framerate, 
          device_type, network_speed, auto_quality, adaptive_streaming
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      
      const insertResult = await db.query(insertQuery, [
        defaultSettings.user_id,
        defaultSettings.quality_preference,
        defaultSettings.resolution,
        defaultSettings.bitrate_kbps,
        defaultSettings.framerate,
        defaultSettings.device_type,
        defaultSettings.network_speed,
        defaultSettings.auto_quality,
        defaultSettings.adaptive_streaming
      ]);
      
      const settings = insertResult.rows[0];
      
      // Log the creation
      await auditLog(req.user.id, 'video_quality_settings_created', 'video_quality_settings', settings.id, {
        settings
      }, req.ip, req.get('User-Agent'));
      
      return res.json(settings);
    }
    
    const settings = settingsResult.rows[0];
    
    res.json(settings);
  } catch (error) {
    console.error('Error fetching video quality settings:', error);
    res.status(500).json({ error: 'Failed to fetch video quality settings' });
  }
});

// Update video quality settings
router.put('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      quality_preference,
      resolution,
      bitrate_kbps,
      framerate,
      device_type,
      network_speed,
      auto_quality,
      adaptive_streaming
    } = req.body;
    
    // Check if user can update these settings
    if (req.user.id !== userId && !req.user.is_admin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const db = req.app.get('db');
    
    // Validate inputs
    const validQualities = ['auto', 'low', 'medium', 'high', 'ultra'];
    const validResolutions = ['auto', '360p', '480p', '720p', '1080p', '1440p', '4k'];
    const validFramerates = [30, 60, 120];
    const validDeviceTypes = ['desktop', 'tablet', 'mobile'];
    const validNetworkSpeeds = ['slow', 'medium', 'fast', 'unknown'];
    
    if (!validQualities.includes(quality_preference)) {
      return res.status(400).json({ error: 'Invalid quality preference' });
    }
    
    if (!validResolutions.includes(resolution)) {
      return res.status(400).json({ error: 'Invalid resolution' });
    }
    
    if (!validFramerates.includes(framerate)) {
      return res.status(400).json({ error: 'Invalid framerate' });
    }
    
    if (!validDeviceTypes.includes(device_type)) {
      return res.status(400).json({ error: 'Invalid device type' });
    }
    
    if (!validNetworkSpeeds.includes(network_speed)) {
      return res.status(400).json({ error: 'Invalid network speed' });
    }

    // Update settings
    const updateQuery = `
      UPDATE video_quality_settings 
      SET quality_preference = $1,
          resolution = $2,
          bitrate_kbps = $3,
          framerate = $4,
          device_type = $5,
          network_speed = $6,
          auto_quality = $7,
          adaptive_streaming = $8,
          updated_at = NOW()
      WHERE user_id = $9
      RETURNING *
    `;
    
    const result = await db.query(updateQuery, [
      quality_preference,
      resolution,
      bitrate_kbps || 0,
      framerate,
      device_type,
      network_speed,
      auto_quality,
      adaptive_streaming,
      userId
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Video quality settings not found' });
    }
    
    const updatedSettings = result.rows[0];
    
    // Log the update
    await auditLog(req.user.id, 'video_quality_settings_updated', 'video_quality_settings', updatedSettings.id, {
      old_settings: req.body, // In a real app, you'd get the old settings
      new_settings: updatedSettings
    }, req.ip, req.get('User-Agent'));
    
    res.json(updatedSettings);
  } catch (error) {
    console.error('Error updating video quality settings:', error);
    res.status(500).json({ error: 'Failed to update video quality settings' });
  }
});

// Test connection speed
router.post('/:userId/test-speed', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if user can test speed
    if (req.user.id !== userId && !req.user.is_admin) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // This would typically involve a more sophisticated speed test
    // For now, we'll simulate it
    const testResults = {
      download_speed: Math.random() * 50 + 10, // 10-60 Mbps
      upload_speed: Math.random() * 20 + 5,    // 5-25 Mbps
      latency: Math.floor(Math.random() * 100) + 20, // 20-120ms
      recommended_quality: 'auto',
      timestamp: new Date().toISOString()
    };
    
    // Determine recommended quality based on speed
    if (testResults.download_speed > 25 && testResults.latency < 50) {
      testResults.recommended_quality = 'high';
    } else if (testResults.download_speed > 10 && testResults.latency < 100) {
      testResults.recommended_quality = 'medium';
    } else {
      testResults.recommended_quality = 'low';
    }
    
    // Update network speed in settings
    const db = req.app.get('db');
    const networkSpeed = testResults.download_speed > 25 ? 'fast' : 
                        testResults.download_speed > 10 ? 'medium' : 'slow';
    
    await db.query(
      'UPDATE video_quality_settings SET network_speed = $1, updated_at = NOW() WHERE user_id = $2',
      [networkSpeed, userId]
    );
    
    // Log the speed test
    await auditLog(req.user.id, 'connection_speed_test', 'video_quality_settings', userId, {
      test_results: testResults
    }, req.ip, req.get('User-Agent'));
    
    res.json(testResults);
  } catch (error) {
    console.error('Error testing connection speed:', error);
    res.status(500).json({ error: 'Failed to test connection speed' });
  }
});

// Get video quality analytics
router.get('/:userId/analytics', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if user can access analytics
    if (req.user.id !== userId && !req.user.is_admin) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const db = req.app.get('db');
    
    // Get analytics data
    const analyticsQuery = `
      SELECT 
        quality_preference,
        resolution,
        framerate,
        device_type,
        network_speed,
        auto_quality,
        adaptive_streaming,
        COUNT(*) as usage_count
      FROM video_quality_settings 
      WHERE user_id = $1
      GROUP BY quality_preference, resolution, framerate, device_type, network_speed, auto_quality, adaptive_streaming
    `;
    
    const result = await db.query(analyticsQuery, [userId]);
    
    const analytics = {
      current_settings: result.rows[0] || {},
      usage_patterns: result.rows,
      recommendations: {
        optimal_quality: 'auto',
        bandwidth_needed: '5-10 Mbps',
        data_usage: '500MB-1GB per hour'
      },
      last_updated: new Date().toISOString()
    };
    
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching video quality analytics:', error);
    res.status(500).json({ error: 'Failed to fetch video quality analytics' });
  }
});

// Helper function to detect device type
function detectDeviceType(req) {
  const userAgent = req.get('User-Agent');
  
  if (/mobile/i.test(userAgent)) {
    return 'mobile';
  } else if (/tablet|ipad/i.test(userAgent)) {
    return 'tablet';
  } else {
    return 'desktop';
  }
}

module.exports = router;