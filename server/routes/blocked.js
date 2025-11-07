const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Get blocked users
router.get('/blocked', authenticateToken, async (req, res) => {
  try {
    const { cacheService } = req.app.locals;
    const userId = req.user.id;
    
    // Check cache first
    let blockedUsers = await cacheService.get(`blocked_users:${userId}`);
    
    if (!blockedUsers) {
      // TODO: Fetch from database
      blockedUsers = [
        {
          id: 'blocked_user_1',
          username: 'spammer123',
          avatar: '/default-avatar.png',
          reason: 'spam',
          customReason: null,
          blockedAt: new Date().toISOString(),
          isMuted: true
        }
      ];
      
      // Cache for 10 minutes
      await cacheService.set(`blocked_users:${userId}`, blockedUsers, 600);
    }
    
    res.json(blockedUsers);
  } catch (error) {
    req.app.locals.errorService.handleError(error, req, res);
  }
});

// Block user
router.post('/block', authenticateToken, async (req, res) => {
  try {
    const { cacheService, analyticsService } = req.app.locals;
    const userId = req.user.id;
    const { targetUserId, reason, customReason, isMute } = req.body;
    
    // Validate request
    if (!targetUserId) {
      return res.status(400).json({ error: 'Target user ID is required' });
    }
    
    if (!['spam', 'harassment', 'inappropriate', 'custom'].includes(reason)) {
      return res.status(400).json({ error: 'Invalid block reason' });
    }
    
    if (reason === 'custom' && !customReason) {
      return res.status(400).json({ error: 'Custom reason is required for custom block type' });
    }
    
    // Check if already blocked
    let blockedUsers = await cacheService.get(`blocked_users:${userId}`);
    if (blockedUsers && blockedUsers.some(u => u.id === targetUserId)) {
      return res.status(400).json({ error: 'User is already blocked' });
    }
    
    // Create blocked user entry
    const blockedUser = {
      id: targetUserId,
      username: 'target_user', // TODO: Get from database
      avatar: '/default-avatar.png',
      reason,
      customReason: customReason || null,
      blockedAt: new Date().toISOString(),
      isMuted: !!isMute
    };
    
    // Update blocked users list
    if (!blockedUsers) {
      blockedUsers = [];
    }
    blockedUsers.push(blockedUser);
    
    // Update cache
    await cacheService.set(`blocked_users:${userId}`, blockedUsers, 600);
    
    // Add to blocking mapping for quick lookup
    await cacheService.set(`blocking:${userId}:${targetUserId}`, true, 86400);
    
    // Track block action
    await analyticsService.trackEvent('user_blocked', {
      blockerId: userId,
      blockedId: targetUserId,
      reason,
      isMuted: !!isMute,
      timestamp: new Date()
    });
    
    res.json({ success: true, blockedUser });
  } catch (error) {
    req.app.locals.errorService.handleError(error, req, res);
  }
});

// Unblock user
router.delete('/unblock/:targetUserId', authenticateToken, async (req, res) => {
  try {
    const { cacheService, analyticsService } = req.app.locals;
    const { targetUserId } = req.params;
    const userId = req.user.id;
    
    // Get blocked users
    let blockedUsers = await cacheService.get(`blocked_users:${userId}`);
    if (!blockedUsers) {
      return res.status(404).json({ error: 'No blocked users found' });
    }
    
    // Find and remove the user
    const userIndex = blockedUsers.findIndex(u => u.id === targetUserId);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found in blocked list' });
    }
    
    blockedUsers.splice(userIndex, 1);
    
    // Update cache
    await cacheService.set(`blocked_users:${userId}`, blockedUsers, 600);
    await cacheService.delete(`blocking:${userId}:${targetUserId}`);
    
    // Track unblock action
    await analyticsService.trackEvent('user_unblocked', {
      unblockerId: userId,
      unblockedId: targetUserId,
      timestamp: new Date()
    });
    
    res.json({ success: true, message: 'User unblocked successfully' });
  } catch (error) {
    req.app.locals.errorService.handleError(error, req, res);
  }
});

// Update mute status
router.put('/mute/:targetUserId', authenticateToken, async (req, res) => {
  try {
    const { cacheService } = req.app.locals;
    const { targetUserId } = req.params;
    const userId = req.user.id;
    const { isMuted } = req.body;
    
    // Get blocked users
    let blockedUsers = await cacheService.get(`blocked_users:${userId}`);
    if (!blockedUsers) {
      return res.status(404).json({ error: 'No blocked users found' });
    }
    
    // Find and update the user
    const userIndex = blockedUsers.findIndex(u => u.id === targetUserId);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found in blocked list' });
    }
    
    blockedUsers[userIndex].isMuted = !!isMuted;
    
    // Update cache
    await cacheService.set(`blocked_users:${userId}`, blockedUsers, 600);
    
    res.json({ success: true, blockedUser: blockedUsers[userIndex] });
  } catch (error) {
    req.app.locals.errorService.handleError(error, req, res);
  }
});

// Get spam filter settings
router.get('/spam-settings', authenticateToken, async (req, res) => {
  try {
    const { cacheService } = req.app.locals;
    const userId = req.user.id;
    
    // Check cache first
    let settings = await cacheService.get(`spam_settings:${userId}`);
    
    if (!settings) {
      // Default settings
      settings = {
        enabled: true,
        maxMessageLength: 500,
        maxMessagesPerMinute: 10,
        blockedKeywords: [
          'free money', 'click here', 'buy now', 'limited time', 'act fast',
          'guaranteed', 'no risk', 'earn money', 'make money fast', 'investment'
        ],
        suspiciousPatterns: ['^(.)\\1{5,}$', '^.{200,}$'],
        autoDeleteSpam: true,
        notifyOnSpam: true
      };
      
      // Cache for 1 hour
      await cacheService.set(`spam_settings:${userId}`, settings, 3600);
    }
    
    res.json(settings);
  } catch (error) {
    req.app.locals.errorService.handleError(error, req, res);
  }
});

// Update spam filter settings
router.put('/spam-settings', authenticateToken, async (req, res) => {
  try {
    const { cacheService, analyticsService } = req.app.locals;
    const userId = req.user.id;
    const updates = req.body;
    
    // Validate updates
    if (updates.maxMessageLength && (updates.maxMessageLength < 50 || updates.maxMessageLength > 1000)) {
      return res.status(400).json({ error: 'Max message length must be between 50 and 1000' });
    }
    
    if (updates.maxMessagesPerMinute && (updates.maxMessagesPerMinute < 1 || updates.maxMessagesPerMinute > 60)) {
      return res.status(400).json({ error: 'Max messages per minute must be between 1 and 60' });
    }
    
    // Get current settings
    let settings = await cacheService.get(`spam_settings:${userId}`);
    if (!settings) {
      settings = {};
    }
    
    // Update settings
    const updatedSettings = { ...settings, ...updates };
    
    // Update cache
    await cacheService.set(`spam_settings:${userId}`, updatedSettings, 3600);
    
    // Track settings update
    await analyticsService.trackEvent('spam_settings_updated', {
      userId,
      updates: Object.keys(updates),
      timestamp: new Date()
    });
    
    res.json(updatedSettings);
  } catch (error) {
    req.app.locals.errorService.handleError(error, req, res);
  }
});

// Add blocked keyword
router.post('/spam-settings/keywords', authenticateToken, async (req, res) => {
  try {
    const { cacheService, analyticsService } = req.app.locals;
    const userId = req.user.id;
    const { keyword } = req.body;
    
    if (!keyword || keyword.trim().length === 0) {
      return res.status(400).json({ error: 'Keyword is required' });
    }
    
    if (keyword.length > 50) {
      return res.status(400).json({ error: 'Keyword must be 50 characters or less' });
    }
    
    // Get current settings
    let settings = await cacheService.get(`spam_settings:${userId}`);
    if (!settings) {
      settings = { blockedKeywords: [] };
    }
    
    // Add keyword if not already exists
    const lowerKeyword = keyword.toLowerCase().trim();
    if (!settings.blockedKeywords.some(k => k.toLowerCase() === lowerKeyword)) {
      settings.blockedKeywords.push(keyword.trim());
      
      // Update cache
      await cacheService.set(`spam_settings:${userId}`, settings, 3600);
      
      // Track keyword addition
      await analyticsService.trackEvent('spam_keyword_added', {
        userId,
        keyword: keyword.trim(),
        timestamp: new Date()
      });
    }
    
    res.json({ success: true, keyword: keyword.trim() });
  } catch (error) {
    req.app.locals.errorService.handleError(error, req, res);
  }
});

// Remove blocked keyword
router.delete('/spam-settings/keywords/:keyword', authenticateToken, async (req, res) => {
  try {
    const { cacheService, analyticsService } = req.app.locals;
    const { keyword } = req.params;
    const userId = req.user.id;
    
    // Get current settings
    let settings = await cacheService.get(`spam_settings:${userId}`);
    if (!settings || !settings.blockedKeywords) {
      return res.status(404).json({ error: 'No spam settings found' });
    }
    
    // Remove keyword
    const keywordIndex = settings.blockedKeywords.findIndex(k => k === keyword);
    if (keywordIndex === -1) {
      return res.status(404).json({ error: 'Keyword not found' });
    }
    
    settings.blockedKeywords.splice(keywordIndex, 1);
    
    // Update cache
    await cacheService.set(`spam_settings:${userId}`, settings, 3600);
    
    // Track keyword removal
    await analyticsService.trackEvent('spam_keyword_removed', {
      userId,
      keyword,
      timestamp: new Date()
    });
    
    res.json({ success: true, message: 'Keyword removed successfully' });
  } catch (error) {
    req.app.locals.errorService.handleError(error, req, res);
  }
});

// Check if user is blocked
router.get('/check/:targetUserId', authenticateToken, async (req, res) => {
  try {
    const { cacheService } = req.app.locals;
    const { targetUserId } = req.params;
    const userId = req.user.id;
    
    // Check blocking mapping
    const isBlocked = await cacheService.get(`blocking:${userId}:${targetUserId}`);
    
    // Get blocked user details if blocked
    let blockedUser = null;
    if (isBlocked) {
      const blockedUsers = await cacheService.get(`blocked_users:${userId}`);
      blockedUser = blockedUsers?.find(u => u.id === targetUserId) || null;
    }
    
    res.json({
      isBlocked: !!isBlocked,
      blockedUser
    });
  } catch (error) {
    req.app.locals.errorService.handleError(error, req, res);
  }
});

// Get spam analytics
router.get('/spam-analytics', authenticateToken, async (req, res) => {
  try {
    const { analyticsService } = req.app.locals;
    const userId = req.user.id;
    const { period = '7d' } = req.query;
    
    const analytics = await analyticsService.getSpamAnalytics(userId, period);
    
    res.json(analytics);
  } catch (error) {
    req.app.locals.errorService.handleError(error, req, res);
  }
});

module.exports = router;