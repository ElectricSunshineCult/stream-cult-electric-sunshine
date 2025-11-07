const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/emotes'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${req.user.id}_${Date.now()}_${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
  }
});

// Get all custom emotes for a streamer
router.get('/streamer/:streamerId', async (req, res) => {
  try {
    const { cacheService } = req.app.locals;
    const { streamerId } = req.params;
    
    // Check cache first
    let emotes = await cacheService.get(`emotes:${streamerId}`);
    
    if (!emotes) {
      // TODO: Fetch from database
      emotes = [
        {
          id: '1',
          name: 'Kappa',
          imageUrl: '/uploads/emotes/kappa.png',
          createdAt: new Date().toISOString(),
          isActive: true,
          usageCount: 42
        }
      ];
      
      // Cache for 1 hour
      await cacheService.set(`emotes:${streamerId}`, emotes, 3600);
    }
    
    res.json(emotes);
  } catch (error) {
    req.app.locals.errorService.handleError(error, req, res);
  }
});

// Get user's own emotes
router.get('/my-emotes', authenticateToken, async (req, res) => {
  try {
    const { cacheService } = req.app.locals;
    const userId = req.user.id;
    
    // Check cache first
    let emotes = await cacheService.get(`emotes:${userId}:owner`);
    
    if (!emotes) {
      // TODO: Fetch from database
      emotes = [
        {
          id: '1',
          name: 'MyFirstEmote',
          imageUrl: '/uploads/emotes/myfirstemote.png',
          createdAt: new Date().toISOString(),
          isActive: true,
          usageCount: 0
        }
      ];
      
      // Cache for 10 minutes
      await cacheService.set(`emotes:${userId}:owner`, emotes, 600);
    }
    
    res.json(emotes);
  } catch (error) {
    req.app.locals.errorService.handleError(error, req, res);
  }
});

// Upload new emote
router.post('/', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { cacheService, analyticsService } = req.app.locals;
    const userId = req.user.id;
    const { name } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Emote name is required' });
    }
    
    // Validate emote name
    if (name.length > 32) {
      return res.status(400).json({ error: 'Emote name must be 32 characters or less' });
    }
    
    // Check if user already has an emote with this name
    const existingEmotes = await cacheService.get(`emotes:${userId}:owner`);
    if (existingEmotes && existingEmotes.some(e => e.name.toLowerCase() === name.toLowerCase())) {
      return res.status(400).json({ error: 'You already have an emote with this name' });
    }
    
    // Create emote
    const newEmote = {
      id: Date.now().toString(),
      name: name.trim(),
      imageUrl: `/uploads/emotes/${req.file.filename}`,
      createdAt: new Date().toISOString(),
      isActive: true,
      usageCount: 0
    };
    
    // TODO: Save to database
    
    // Update cache
    const updatedEmotes = existingEmotes ? [...existingEmotes, newEmote] : [newEmote];
    await cacheService.set(`emotes:${userId}:owner`, updatedEmotes, 600);
    await cacheService.delete(`emotes:${userId}`); // Also clear public cache
    
    // Track emote creation
    await analyticsService.trackEvent('emote_created', {
      userId,
      emoteName: newEmote.name,
      timestamp: new Date()
    });
    
    res.json(newEmote);
  } catch (error) {
    req.app.locals.errorService.handleError(error, req, res);
  }
});

// Update emote
router.put('/:emoteId', authenticateToken, async (req, res) => {
  try {
    const { cacheService, analyticsService } = req.app.locals;
    const { emoteId } = req.params;
    const userId = req.user.id;
    const { name, isActive } = req.body;
    
    // Get existing emote
    let emotes = await cacheService.get(`emotes:${userId}:owner`);
    if (!emotes) {
      return res.status(404).json({ error: 'Emote not found' });
    }
    
    const emoteIndex = emotes.findIndex(e => e.id === emoteId);
    if (emoteIndex === -1) {
      return res.status(404).json({ error: 'Emote not found' });
    }
    
    // Update emote
    const updatedEmote = { ...emotes[emoteIndex] };
    if (name) updatedEmote.name = name;
    if (typeof isActive === 'boolean') updatedEmote.isActive = isActive;
    
    emotes[emoteIndex] = updatedEmote;
    
    // Update cache
    await cacheService.set(`emotes:${userId}:owner`, emotes, 600);
    await cacheService.delete(`emotes:${userId}`); // Also clear public cache
    
    // Track emote update
    await analyticsService.trackEvent('emote_updated', {
      userId,
      emoteId,
      updates: Object.keys(req.body),
      timestamp: new Date()
    });
    
    res.json(updatedEmote);
  } catch (error) {
    req.app.locals.errorService.handleError(error, req, res);
  }
});

// Delete emote
router.delete('/:emoteId', authenticateToken, async (req, res) => {
  try {
    const { cacheService, analyticsService } = req.app.locals;
    const { emoteId } = req.params;
    const userId = req.user.id;
    
    // Get existing emotes
    let emotes = await cacheService.get(`emotes:${userId}:owner`);
    if (!emotes) {
      return res.status(404).json({ error: 'Emote not found' });
    }
    
    const emoteIndex = emotes.findIndex(e => e.id === emoteId);
    if (emoteIndex === -1) {
      return res.status(404).json({ error: 'Emote not found' });
    }
    
    const deletedEmote = emotes[emoteIndex];
    emotes.splice(emoteIndex, 1);
    
    // Update cache
    await cacheService.set(`emotes:${userId}:owner`, emotes, 600);
    await cacheService.delete(`emotes:${userId}`); // Also clear public cache
    
    // TODO: Delete image file from disk
    
    // Track emote deletion
    await analyticsService.trackEvent('emote_deleted', {
      userId,
      emoteId,
      emoteName: deletedEmote.name,
      timestamp: new Date()
    });
    
    res.json({ success: true });
  } catch (error) {
    req.app.locals.errorService.handleError(error, req, res);
  }
});

// Use emote (track usage)
router.post('/use/:emoteId', authenticateToken, async (req, res) => {
  try {
    const { cacheService, analyticsService } = req.app.locals;
    const { emoteId } = req.params;
    const userId = req.user.id;
    const { streamerId } = req.body;
    
    if (!streamerId) {
      return res.status(400).json({ error: 'Streamer ID is required' });
    }
    
    // Get streamer's emotes
    let emotes = await cacheService.get(`emotes:${streamerId}`);
    if (!emotes) {
      return res.status(404).json({ error: 'Streamer not found or has no emotes' });
    }
    
    const emoteIndex = emotes.findIndex(e => e.id === emoteId);
    if (emoteIndex === -1) {
      return res.status(404).json({ error: 'Emote not found' });
    }
    
    // Update usage count
    const emote = emotes[emoteIndex];
    emote.usageCount = (emote.usageCount || 0) + 1;
    emotes[emoteIndex] = emote;
    
    // Update cache
    await cacheService.set(`emotes:${streamerId}`, emotes, 3600);
    
    // Track emote usage
    await analyticsService.trackEvent('emote_used', {
      userId,
      streamerId,
      emoteId,
      emoteName: emote.name,
      timestamp: new Date()
    });
    
    res.json({ success: true, usageCount: emote.usageCount });
  } catch (error) {
    req.app.locals.errorService.handleError(error, req, res);
  }
});

// Get emote analytics
router.get('/analytics/:emoteId', authenticateToken, async (req, res) => {
  try {
    const { analyticsService } = req.app.locals;
    const { emoteId } = req.params;
    const userId = req.user.id;
    
    // TODO: Check ownership
    const analytics = await analyticsService.getEmoteAnalytics(emoteId, userId);
    
    res.json(analytics);
  } catch (error) {
    req.app.locals.errorService.handleError(error, req, res);
  }
});

module.exports = router;