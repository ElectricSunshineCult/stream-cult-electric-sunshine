const express = require('express');
const { query } = require('../config/database');

const router = express.Router();

// Get all regions
router.get('/', async (req, res) => {
  try {
    const regionsResult = await query(`
      SELECT 
        r.id,
        r.name,
        r.code,
        r.continent,
        r.parent_id,
        COUNT(DISTINCT s.id) as live_stream_count,
        COUNT(DISTINCT u.id) as user_count
      FROM regions r
      LEFT JOIN regions sub_r ON r.id = sub_r.parent_id
      LEFT JOIN streams s ON (r.id = s.region_id AND s.is_live = true)
      LEFT JOIN users u ON r.id = u.region_id
      WHERE r.parent_id IS NULL OR r.parent_id IS NULL
      GROUP BY r.id, r.name, r.code, r.continent, r.parent_id
      ORDER BY r.continent, r.name
    `);

    res.json({ regions: regionsResult.rows });

  } catch (error) {
    console.error('Get regions error:', error);
    res.status(500).json({ error: 'Failed to fetch regions' });
  }
});

// Get region details with sub-regions
router.get('/:regionId', async (req, res) => {
  try {
    const { regionId } = req.params;

    // Get main region
    const regionResult = await query(`
      SELECT 
        r.id,
        r.name,
        r.code,
        r.continent,
        r.parent_id,
        COUNT(DISTINCT s.id) as live_stream_count,
        COUNT(DISTINCT u.id) as user_count
      FROM regions r
      LEFT JOIN streams s ON (r.id = s.region_id AND s.is_live = true)
      LEFT JOIN users u ON r.id = u.region_id
      WHERE r.id = $1
      GROUP BY r.id, r.name, r.code, r.continent, r.parent_id
    `, [regionId]);

    if (regionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Region not found' });
    }

    // Get sub-regions if this is a continent
    const subRegionsResult = await query(`
      SELECT 
        r.id,
        r.name,
        r.code,
        r.continent,
        COUNT(DISTINCT s.id) as live_stream_count,
        COUNT(DISTINCT u.id) as user_count
      FROM regions r
      LEFT JOIN streams s ON (r.id = s.region_id AND s.is_live = true)
      LEFT JOIN users u ON r.id = u.region_id
      WHERE r.parent_id = $1
      GROUP BY r.id, r.name, r.code, r.continent
      ORDER BY r.name
    `, [regionId]);

    const region = regionResult.rows[0];
    region.sub_regions = subRegionsResult.rows;

    res.json({ region });

  } catch (error) {
    console.error('Get region error:', error);
    res.status(500).json({ error: 'Failed to fetch region' });
  }
});

// Get region's live streams
router.get('/:regionId/streams', async (req, res) => {
  try {
    const { regionId } = req.params;
    const { 
      category_id, 
      sort = 'viewer_count', 
      limit = 20, 
      offset = 0 
    } = req.query;

    // Build query
    let whereClause = 'WHERE s.is_live = true AND s.region_id = $1';
    const params = [regionId];
    let paramIndex = 2;

    // Add category filter
    if (category_id) {
      whereClause += ` AND s.category_id = $${paramIndex}`;
      params.push(category_id);
      paramIndex++;
    }

    // Add sorting
    let orderBy = 's.viewer_count DESC, s.total_tips DESC';
    if (sort === 'recent') {
      orderBy = 's.start_time DESC';
    } else if (sort === 'tips') {
      orderBy = 's.total_tips DESC';
    } else if (sort === 'uptime') {
      orderBy = 's.start_time ASC';
    }

    params.push(limit, offset);

    const streamsResult = await query(`
      SELECT 
        s.id,
        s.title,
        s.description,
        s.viewer_count,
        s.total_tips,
        s.start_time,
        s.thumbnail_url,
        s.language,
        s.is_nsfw,
        u.username as streamer_name,
        u.id as streamer_id,
        c.name as category_name,
        c.id as category_id
      FROM streams s
      JOIN users u ON s.streamer_id = u.id
      JOIN categories c ON s.category_id = c.id
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, params);

    res.json({
      streams: streamsResult.rows,
      total: streamsResult.rows.length
    });

  } catch (error) {
    console.error('Get region streams error:', error);
    res.status(500).json({ error: 'Failed to fetch region streams' });
  }
});

// Get region's streamers
router.get('/:regionId/streamers', async (req, res) => {
  try {
    const { regionId } = req.params;
    const { 
      sort = 'followers', 
      limit = 20, 
      offset = 0 
    } = req.query;

    let orderBy = 'follower_count DESC, u.total_tips_earned DESC';
    if (sort === 'earnings') {
      orderBy = 'u.total_tips_earned DESC';
    } else if (sort === 'newest') {
      orderBy = 'u.created_at DESC';
    }

    const streamersResult = await query(`
      SELECT 
        u.id,
        u.username,
        u.bio,
        u.avatar_url,
        u.tokens_balance,
        u.total_tips_earned,
        u.total_tips_sent,
        u.is_streaming,
        u.created_at,
        COUNT(DISTINCT f.follower_id) as follower_count,
        COUNT(DISTINCT s.id) as total_streams,
        COUNT(DISTINCT CASE WHEN s.is_live = true THEN s.id END) as live_streams
      FROM users u
      LEFT JOIN streams s ON u.id = s.streamer_id
      LEFT JOIN user_follows f ON u.id = f.streamer_id
      WHERE u.role = 'streamer' AND u.region_id = $1
      GROUP BY u.id
      ORDER BY ${orderBy}
      LIMIT $2 OFFSET $3
    `, [regionId, limit, offset]);

    res.json({
      streamers: streamersResult.rows,
      total: streamersResult.rows.length
    });

  } catch (error) {
    console.error('Get region streamers error:', error);
    res.status(500).json({ error: 'Failed to fetch region streamers' });
  }
});

// Get region's statistics
router.get('/:regionId/stats', async (req, res) => {
  try {
    const { regionId } = req.params;

    const statsResult = await query(`
      SELECT 
        COUNT(DISTINCT u.id) as total_users,
        COUNT(DISTINCT CASE WHEN u.role = 'streamer' THEN u.id END) as total_streamers,
        COUNT(DISTINCT s.id) as total_streams,
        COUNT(DISTINCT CASE WHEN s.is_live = true THEN s.id END) as live_streams,
        COALESCE(SUM(s.total_tips), 0) as total_tips_generated,
        COALESCE(SUM(CASE WHEN s.is_live = true THEN s.viewer_count END), 0) as current_viewers,
        COUNT(DISTINCT c.id) as category_count
      FROM regions r
      LEFT JOIN users u ON r.id = u.region_id
      LEFT JOIN streams s ON r.id = s.region_id
      LEFT JOIN categories c ON s.category_id = c.id
      WHERE r.id = $1
      GROUP BY r.id
    `, [regionId]);

    // Get popular categories in region
    const popularCategoriesResult = await query(`
      SELECT 
        c.id,
        c.name,
        c.nsfw_flag,
        COUNT(s.id) as stream_count,
        SUM(s.viewer_count) as total_viewers
      FROM regions r
      JOIN streams s ON r.id = s.region_id AND s.is_live = true
      JOIN categories c ON s.category_id = c.id
      WHERE r.id = $1
      GROUP BY c.id, c.name, c.nsfw_flag
      ORDER BY stream_count DESC, total_viewers DESC
      LIMIT 10
    `, [regionId]);

    const stats = statsResult.rows[0];
    stats.popular_categories = popularCategoriesResult.rows;

    res.json({ stats });

  } catch (error) {
    console.error('Get region stats error:', error);
    res.status(500).json({ error: 'Failed to fetch region statistics' });
  }
});

// Search streams in region
router.get('/:regionId/search/streams', async (req, res) => {
  try {
    const { regionId } = req.params;
    const { 
      q: searchQuery, 
      category_id, 
      nsfw = 'false',
      limit = 20, 
      offset = 0 
    } = req.query;

    let whereClause = 'WHERE s.region_id = $1 AND s.is_live = true';
    const params = [regionId];
    let paramIndex = 2;

    // Add search query
    if (searchQuery) {
      whereClause += ` AND (s.title ILIKE $${paramIndex} OR u.username ILIKE $${paramIndex})`;
      params.push(`%${searchQuery}%`);
      paramIndex++;
    }

    // Add category filter
    if (category_id) {
      whereClause += ` AND s.category_id = $${paramIndex}`;
      params.push(category_id);
      paramIndex++;
    }

    // Add NSFW filter
    if (nsfw === 'false') {
      whereClause += ' AND s.is_nsfw = false';
    }

    params.push(limit, offset);

    const streamsResult = await query(`
      SELECT 
        s.id,
        s.title,
        s.description,
        s.viewer_count,
        s.total_tips,
        s.start_time,
        s.thumbnail_url,
        s.language,
        s.is_nsfw,
        u.username as streamer_name,
        u.id as streamer_id,
        c.name as category_name,
        c.id as category_id
      FROM streams s
      JOIN users u ON s.streamer_id = u.id
      JOIN categories c ON s.category_id = c.id
      ${whereClause}
      ORDER BY 
        CASE WHEN $1 IS NOT NULL THEN 
          CASE WHEN s.title ILIKE $1 OR u.username ILIKE $1 THEN 1 ELSE 2 END
        ELSE 1 END,
        s.viewer_count DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, params);

    res.json({
      streams: streamsResult.rows,
      total: streamsResult.rows.length,
      query: searchQuery
    });

  } catch (error) {
    console.error('Search region streams error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;