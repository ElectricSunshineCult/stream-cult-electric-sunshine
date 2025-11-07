const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Get queued tips for user
router.get('/queued', authenticateToken, async (req, res) => {
  try {
    const { cacheService } = req.app.locals;
    const userId = req.user.id;
    
    // Check cache for queued tips
    let queuedTips = await cacheService.get(`queued_tips:${userId}`);
    
    if (!queuedTips) {
      // TODO: Fetch from database
      queuedTips = {
        streamers: [],
        totalQueued: 0
      };
      
      // Cache for 5 minutes
      await cacheService.set(`queued_tips:${userId}`, queuedTips, 300);
    }
    
    res.json(queuedTips);
  } catch (error) {
    req.app.locals.errorService.handleError(error, req, res);
  }
});

// Send offline tip
router.post('/offline', authenticateToken, async (req, res) => {
  try {
    const { cacheService, analyticsService, notificationService } = req.app.locals;
    const userId = req.user.id;
    const {
      streamerId,
      streamerUsername,
      amount,
      message,
      isAnonymous,
      category,
      isSpecialOccasion,
      occasionType
    } = req.body;
    
    // Validate request
    if (!streamerId || !streamerUsername || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid tip data' });
    }
    
    if (amount > 10000) { // Max 10k tokens per tip
      return res.status(400).json({ error: 'Tip amount exceeds limit' });
    }
    
    // Create offline tip
    const offlineTip = {
      id: Date.now().toString(),
      streamerId,
      streamerUsername,
      tipperId: userId,
      tipperUsername: req.user.username, // TODO: Get from user data
      amount,
      message: message || null,
      isAnonymous: !!isAnonymous,
      category: category || 'support',
      isSpecialOccasion: !!isSpecialOccasion,
      occasionType: isSpecialOccasion ? occasionType : null,
      timestamp: new Date().toISOString(),
      status: 'pending' // pending, delivered, read, responded
    };
    
    // Check if streamer is online
    const streamerStatus = await cacheService.get(`user_status:${streamerId}`);
    const isOnline = streamerStatus && streamerStatus !== 'offline' && streamerStatus !== 'invisible';
    
    if (isOnline) {
      // Streamer is online, send tip immediately
      offlineTip.status = 'delivered';
      
      // Create notification for streamer
      await notificationService.sendNotification({
        userId: streamerId,
        type: 'tip_received',
        title: 'New Tip Received!',
        message: `${isAnonymous ? 'Anonymous' : req.user.username} sent you ${amount} tokens`,
        data: {
          tipId: offlineTip.id,
          amount,
          message,
          sender: isAnonymous ? null : req.user.username
        }
      });
      
      // Track successful tip
      await analyticsService.trackEvent('tip_sent', {
        tipperId: userId,
        streamerId,
        amount,
        isOnline: true,
        category,
        timestamp: new Date()
      });
      
    } else {
      // Streamer is offline, queue the tip
      offlineTip.status = 'pending';
      
      // Add to user's queued tips
      let queuedTips = await cacheService.get(`queued_tips:${userId}`);
      if (!queuedTips) {
        queuedTips = { streamers: {}, totalQueued: 0 };
      }
      
      // Add or update streamer in queue
      if (!queuedTips.streamers[streamerId]) {
        queuedTips.streamers[streamerId] = {
          streamerId,
          streamerUsername,
          tips: [],
          lastSeen: new Date().toISOString()
        };
      }
      
      queuedTips.streamers[streamerId].tips.push(offlineTip);
      queuedTips.totalQueued = Object.values(queuedTips.streamers)
        .reduce((total, streamer) => total + streamer.tips.length, 0);
      
      // Update cache
      await cacheService.set(`queued_tips:${userId}`, queuedTips, 300);
      
      // Add to streamer's offline tips queue
      let streamerOfflineTips = await cacheService.get(`offline_tips:${streamerId}`);
      if (!streamerOfflineTips) {
        streamerOfflineTips = { tips: [] };
      }
      
      streamerOfflineTips.tips.push({
        tipId: offlineTip.id,
        tipperId: userId,
        tipperUsername: req.user.username,
        amount,
        message: message || null,
        isAnonymous,
        category,
        isSpecialOccasion,
        occasionType,
        timestamp: new Date().toISOString()
      });
      
      await cacheService.set(`offline_tips:${streamerId}`, streamerOfflineTips, 86400); // Cache for 24h
      
      // Track queued tip
      await analyticsService.trackEvent('tip_queued', {
        tipperId: userId,
        streamerId,
        amount,
        isOnline: false,
        category,
        timestamp: new Date()
      });
    }
    
    res.json({
      success: true,
      tip: offlineTip,
      delivered: isOnline,
      message: isOnline ? 'Tip delivered successfully' : 'Tip queued for offline delivery'
    });
    
  } catch (error) {
    req.app.locals.errorService.handleError(error, req, res);
  }
});

// Deliver queued tips when streamer comes online
router.post('/deliver/:streamerId', authenticateToken, async (req, res) => {
  try {
    const { cacheService, analyticsService, notificationService } = req.app.locals;
    const { streamerId } = req.params;
    const userId = req.user.id;
    
    // Verify streamer owns this endpoint
    if (streamerId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Get offline tips
    const offlineTips = await cacheService.get(`offline_tips:${streamerId}`);
    if (!offlineTips || !offlineTips.tips || offlineTips.tips.length === 0) {
      return res.json({ success: true, delivered: 0, tips: [] });
    }
    
    // Process each tip
    const deliveredTips = [];
    for (const tip of offlineTips.tips) {
      try {
        // Update tip status in sender's queued tips
        const queuedTips = await cacheService.get(`queued_tips:${tip.tipperId}`);
        if (queuedTips && queuedTips.streamers[streamerId]) {
          const tipIndex = queuedTips.streamers[streamerId].tips.findIndex(
            t => t.id === tip.tipId
          );
          
          if (tipIndex !== -1) {
            queuedTips.streamers[streamerId].tips[tipIndex].status = 'delivered';
            queuedTips.streamers[streamerId].tips[tipIndex].deliveredAt = new Date().toISOString();
            
            // Recalculate total
            queuedTips.totalQueued = Object.values(queuedTips.streamers)
              .reduce((total, streamer) => total + streamer.tips.length, 0);
            
            await cacheService.set(`queued_tips:${tip.tipperId}`, queuedTips, 300);
          }
        }
        
        // Send notification to tipper
        await notificationService.sendNotification({
          userId: tip.tipperId,
          type: 'tip_delivered',
          title: 'Your Tip Was Delivered!',
          message: `${tip.amount} tokens delivered to ${tip.streamerUsername}`,
          data: {
            tipId: tip.tipId,
            amount: tip.amount,
            streamerUsername
          }
        });
        
        // Track tip delivery
        await analyticsService.trackEvent('tip_delivered', {
          tipperId: tip.tipperId,
          streamerId,
          amount: tip.amount,
          timestamp: new Date()
        });
        
        deliveredTips.push(tip);
        
      } catch (tipError) {
        console.error(`Error delivering tip ${tip.tipId}:`, tipError);
      }
    }
    
    // Clear offline tips queue
    await cacheService.delete(`offline_tips:${streamerId}`);
    
    res.json({
      success: true,
      delivered: deliveredTips.length,
      tips: deliveredTips
    });
    
  } catch (error) {
    req.app.locals.errorService.handleError(error, req, res);
  }
});

// Cancel queued tip
router.delete('/queued/:tipId', authenticateToken, async (req, res) => {
  try {
    const { cacheService, analyticsService } = req.app.locals;
    const { tipId } = req.params;
    const userId = req.user.id;
    
    // Get queued tips
    let queuedTips = await cacheService.get(`queued_tips:${userId}`);
    if (!queuedTips) {
      return res.status(404).json({ error: 'No queued tips found' });
    }
    
    // Find and remove the tip
    let tipFound = false;
    for (const streamerId of Object.keys(queuedTips.streamers)) {
      const tipIndex = queuedTips.streamers[streamerId].tips.findIndex(
        t => t.id === tipId && t.status === 'pending'
      );
      
      if (tipIndex !== -1) {
        const removedTip = queuedTips.streamers[streamerId].tips.splice(tipIndex, 1)[0];
        tipFound = true;
        
        // If no more tips for this streamer, remove the streamer
        if (queuedTips.streamers[streamerId].tips.length === 0) {
          delete queuedTips.streamers[streamerId];
        }
        
        break;
      }
    }
    
    if (!tipFound) {
      return res.status(404).json({ error: 'Tip not found or already delivered' });
    }
    
    // Recalculate total
    queuedTips.totalQueued = Object.values(queuedTips.streamers)
      .reduce((total, streamer) => total + streamer.tips.length, 0);
    
    // Update cache
    await cacheService.set(`queued_tips:${userId}`, queuedTips, 300);
    
    // Track tip cancellation
    await analyticsService.trackEvent('tip_cancelled', {
      tipperId: userId,
      tipId,
      timestamp: new Date()
    });
    
    res.json({ success: true, message: 'Tip cancelled successfully' });
    
  } catch (error) {
    req.app.locals.errorService.handleError(error, req, res);
  }
});

// Get tip analytics
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    const { analyticsService } = req.app.locals;
    const userId = req.user.id;
    const { type = 'sent' } = req.query; // 'sent' or 'received'
    
    const analytics = await analyticsService.getTipAnalytics(userId, type);
    
    res.json(analytics);
  } catch (error) {
    req.app.locals.errorService.handleError(error, req, res);
  }
});

module.exports = router;