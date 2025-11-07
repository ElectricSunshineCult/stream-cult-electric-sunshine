const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Get user profile with enhanced information
router.get('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { cacheService, analyticsService } = req.app.locals;
    
    // Check cache first
    let profile = await cacheService.get(`profile:${userId}`);
    
    if (!profile) {
      // TODO: Fetch from database
      profile = {
        id: userId,
        username: 'streamer123',
        displayName: 'Streamer Name',
        bio: 'Welcome to my stream!',
        avatar: '/default-avatar.png',
        socialLinks: [],
        goals: [],
        friendsCount: 0,
        isOnline: false,
        customUrl: 'my-awesome-stream'
      };
      
      // Cache for 5 minutes
      await cacheService.set(`profile:${userId}`, profile, 300);
    }
    
    // Track profile view
    await analyticsService.trackEvent('profile_view', {
      userId,
      viewerId: req.user.id,
      timestamp: new Date()
    });
    
    res.json(profile);
  } catch (error) {
    req.app.locals.errorService.handleError(error, req, res);
  }
});

// Update user profile
router.put('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;
    
    // Verify user owns this profile
    if (userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const { cacheService, analyticsService } = req.app.locals;
    
    // TODO: Update in database
    const updatedProfile = {
      id: userId,
      ...updates,
      updatedAt: new Date()
    };
    
    // Update cache
    await cacheService.set(`profile:${userId}`, updatedProfile, 300);
    
    // Track profile update
    await analyticsService.trackEvent('profile_update', {
      userId,
      updates: Object.keys(updates),
      timestamp: new Date()
    });
    
    res.json(updatedProfile);
  } catch (error) {
    req.app.locals.errorService.handleError(error, req, res);
  }
});

// Add social link
router.post('/:userId/social-links', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { platform, url, label } = req.body;
    
    if (userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // TODO: Add to database
    const newLink = {
      id: Date.now().toString(),
      platform,
      url,
      label
    };
    
    // Invalidate cache
    await req.app.locals.cacheService.delete(`profile:${userId}`);
    
    res.json(newLink);
  } catch (error) {
    req.app.locals.errorService.handleError(error, req, res);
  }
});

// Delete social link
router.delete('/:userId/social-links/:linkId', authenticateToken, async (req, res) => {
  try {
    const { userId, linkId } = req.params;
    
    if (userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // TODO: Delete from database
    
    // Invalidate cache
    await req.app.locals.cacheService.delete(`profile:${userId}`);
    
    res.json({ success: true });
  } catch (error) {
    req.app.locals.errorService.handleError(error, req, res);
  }
});

// Add goal
router.post('/:userId/goals', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { title, description, targetAmount, isPublic } = req.body;
    
    if (userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const newGoal = {
      id: Date.now().toString(),
      title,
      description,
      targetAmount,
      currentAmount: 0,
      isPublic,
      createdAt: new Date()
    };
    
    // TODO: Save to database
    // Invalidate cache
    await req.app.locals.cacheService.delete(`profile:${userId}`);
    
    res.json(newGoal);
  } catch (error) {
    req.app.locals.errorService.handleError(error, req, res);
  }
});

// Delete goal
router.delete('/:userId/goals/:goalId', authenticateToken, async (req, res) => {
  try {
    const { userId, goalId } = req.params;
    
    if (userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // TODO: Delete from database
    // Invalidate cache
    await req.app.locals.cacheService.delete(`profile:${userId}`);
    
    res.json({ success: true });
  } catch (error) {
    req.app.locals.errorService.handleError(error, req, res);
  }
});

// Update user status
router.put('/:userId/status', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body; // online, away, idle, invisible
    
    if (userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Update status in database
    // Broadcast status change to connected clients
    const io = req.app.locals.io;
    io.to(`user:${userId}`).emit('statusChanged', { userId, status });
    
    // Update cache
    await req.app.locals.cacheService.set(`user_status:${userId}`, status, 3600);
    
    res.json({ success: true, status });
  } catch (error) {
    req.app.locals.errorService.handleError(error, req, res);
  }
});

module.exports = router;