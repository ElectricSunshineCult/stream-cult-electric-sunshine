const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Get all custom URLs for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { cacheService } = req.app.locals;
    const userId = req.user.id;
    
    // Check cache first
    let urls = await cacheService.get(`user_urls:${userId}`);
    
    if (!urls) {
      // TODO: Fetch from database
      urls = [
        {
          id: '1',
          userId,
          url: 'my-awesome-stream',
          isActive: true,
          isVerified: false,
          createdAt: new Date().toISOString(),
          totalVisits: 0,
          category: 'personal',
          description: 'My main streaming page',
          isPublic: true,
          allowDirectTips: true
        }
      ];
      
      // Cache for 10 minutes
      await cacheService.set(`user_urls:${userId}`, urls, 600);
    }
    
    res.json(urls);
  } catch (error) {
    req.app.locals.errorService.handleError(error, req, res);
  }
});

// Create custom URL
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { cacheService, analyticsService } = req.app.locals;
    const userId = req.user.id;
    const { url, category, description, isPublic, allowDirectTips, customMetadata } = req.body;
    
    // Validate URL
    const validation = validateUrl(url);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.error });
    }
    
    // Check availability
    const isAvailable = await checkUrlAvailability(url, userId);
    if (!isAvailable) {
      return res.status(400).json({ error: 'URL is already taken' });
    }
    
    // Create URL
    const newUrl = {
      id: Date.now().toString(),
      userId,
      url,
      category,
      description,
      isPublic,
      allowDirectTips,
      customMetadata,
      isActive: true,
      isVerified: false,
      createdAt: new Date().toISOString(),
      totalVisits: 0
    };
    
    // TODO: Save to database
    // Invalidate cache
    await cacheService.delete(`user_urls:${userId}`);
    await cacheService.delete(`url_${url}`); // Also delete direct URL cache
    
    // Track URL creation
    await analyticsService.trackEvent('custom_url_created', {
      userId,
      url,
      category,
      timestamp: new Date()
    });
    
    res.json(newUrl);
  } catch (error) {
    req.app.locals.errorService.handleError(error, req, res);
  }
});

// Update custom URL
router.put('/:urlId', authenticateToken, async (req, res) => {
  try {
    const { cacheService, analyticsService } = req.app.locals;
    const { urlId } = req.params;
    const userId = req.user.id;
    const updates = req.body;
    
    // TODO: Check ownership and update in database
    const updatedUrl = {
      id: urlId,
      userId,
      ...updates,
      updatedAt: new Date()
    };
    
    // Invalidate cache
    await cacheService.delete(`user_urls:${userId}`);
    await cacheService.delete(`url_${updatedUrl.url}`);
    
    // Track URL update
    await analyticsService.trackEvent('custom_url_updated', {
      userId,
      urlId,
      updates: Object.keys(updates),
      timestamp: new Date()
    });
    
    res.json(updatedUrl);
  } catch (error) {
    req.app.locals.errorService.handleError(error, req, res);
  }
});

// Delete custom URL
router.delete('/:urlId', authenticateToken, async (req, res) => {
  try {
    const { cacheService, analyticsService } = req.app.locals;
    const { urlId } = req.params;
    const userId = req.user.id;
    
    // TODO: Check ownership and delete from database
    // Get URL data first for analytics
    const urlData = { url: 'example-url', category: 'personal' };
    
    // Invalidate cache
    await cacheService.delete(`user_urls:${userId}`);
    await cacheService.delete(`url_${urlData.url}`);
    
    // Track URL deletion
    await analyticsService.trackEvent('custom_url_deleted', {
      userId,
      urlId,
      url: urlData.url,
      timestamp: new Date()
    });
    
    res.json({ success: true });
  } catch (error) {
    req.app.locals.errorService.handleError(error, req, res);
  }
});

// Check URL availability
router.get('/check-availability/:url', async (req, res) => {
  try {
    const { url } = req.params;
    const { cacheService } = req.app.locals;
    
    // Validate URL
    const validation = validateUrl(url);
    if (!validation.isValid) {
      return res.json({ available: false, error: validation.error });
    }
    
    // Check if URL exists
    const existingUrl = await cacheService.get(`url_${url}`);
    const isAvailable = !existingUrl;
    
    res.json({ available: isAvailable });
  } catch (error) {
    req.app.locals.errorService.handleError(error, req, res);
  }
});

// Resolve custom URL to user
router.get('/resolve/:url', async (req, res) => {
  try {
    const { cacheService, analyticsService } = req.app.locals;
    const { url } = req.params;
    
    // Check cache for URL mapping
    let urlData = await cacheService.get(`url_${url}`);
    
    if (!urlData) {
      // TODO: Fetch from database
      urlData = {
        userId: 'user123',
        url,
        isActive: true,
        isPublic: true
      };
      
      // Cache for 1 hour
      await cacheService.set(`url_${url}`, urlData, 3600);
    }
    
    if (!urlData.isActive || !urlData.isPublic) {
      return res.status(404).json({ error: 'URL not found or inactive' });
    }
    
    // Track URL visit
    await analyticsService.trackEvent('custom_url_visit', {
      url,
      userId: urlData.userId,
      timestamp: new Date()
    });
    
    // Increment visit count
    await cacheService.incr(`url_visits:${url}`);
    
    res.json(urlData);
  } catch (error) {
    req.app.locals.errorService.handleError(error, req, res);
  }
});

// Get URL analytics
router.get('/:urlId/analytics', authenticateToken, async (req, res) => {
  try {
    const { analyticsService } = req.app.locals;
    const { urlId } = req.params;
    const userId = req.user.id;
    
    // TODO: Check ownership
    const analytics = await analyticsService.getCustomUrlAnalytics(urlId, userId);
    
    res.json(analytics);
  } catch (error) {
    req.app.locals.errorService.handleError(error, req, res);
  }
});

// Helper functions
function validateUrl(url) {
  if (url.length < 3) {
    return { isValid: false, error: 'URL must be at least 3 characters' };
  }
  if (url.length > 50) {
    return { isValid: false, error: 'URL must be less than 50 characters' };
  }
  
  if (!/^[a-z0-9-]+$/.test(url)) {
    return { isValid: false, error: 'URL can only contain lowercase letters, numbers, and hyphens' };
  }
  
  if (url.startsWith('-') || url.endsWith('-')) {
    return { isValid: false, error: 'URL cannot start or end with a hyphen' };
  }
  
  if (url.includes('--')) {
    return { isValid: false, error: 'URL cannot contain consecutive hyphens' };
  }
  
  const reservedUrls = ['admin', 'api', 'www', 'mail', 'ftp', 'localhost', 'support', 'help'];
  if (reservedUrls.includes(url)) {
    return { isValid: false, error: 'This URL is reserved and cannot be used' };
  }
  
  return { isValid: true };
}

async function checkUrlAvailability(url, userId) {
  // TODO: Check database for existing URL
  // For now, just check if it's not already taken
  return true;
}

module.exports = router;