const { query } = require('../config/database');
const CacheService = require('./cacheService');
const ErrorService = require('./errorService');

class AnalyticsService {
  constructor() {
    this.metricsBuffer = new Map();
    this.aggregationJobs = new Map();
  }

  /**
   * Track user activity event
   */
  async trackUserEvent(userId, eventType, data = {}, metadata = {}) {
    try {
      const event = {
        userId,
        eventType,
        data,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
          sessionId: metadata.sessionId || null
        }
      };

      // Buffer the event for batch processing
      this.addToMetricsBuffer(userId, event);

      // Update real-time metrics
      await this.updateRealTimeMetrics(userId, eventType, data);

      // Store in database
      await this.storeEventInDatabase(event);

      return true;
    } catch (error) {
      ErrorService.logError(error, { 
        context: 'AnalyticsService.trackUserEvent', 
        userId, 
        eventType 
      });
      return false;
    }
  }

  /**
   * Track stream metrics
   */
  async trackStreamMetrics(streamId, streamerId, metrics) {
    try {
      const streamEvent = {
        streamId,
        streamerId,
        timestamp: new Date().toISOString(),
        metrics: {
          viewerCount: metrics.viewerCount || 0,
          chatMessages: metrics.chatMessages || 0,
          tipsReceived: metrics.tipsReceived || 0,
          duration: metrics.duration || 0,
          category: metrics.category || null
        }
      };

      // Update real-time stream data
      await this.updateStreamMetrics(streamId, streamEvent);

      // Store in database
      await this.storeStreamMetrics(streamEvent);

      // Update aggregation jobs
      this.scheduleAggregation('stream_metrics', streamId, streamEvent);

      return true;
    } catch (error) {
      ErrorService.logError(error, { 
        context: 'AnalyticsService.trackStreamMetrics', 
        streamId 
      });
      return false;
    }
  }

  /**
   * Get user analytics dashboard data
   */
  async getUserAnalytics(userId, timeRange = '7d') {
    try {
      const cacheKey = `user_analytics:${userId}:${timeRange}`;
      const cached = await CacheService.get(cacheKey);
      
      if (cached) {
        return cached;
      }

      const analytics = {
        user: await this.getUserProfile(userId),
        activity: await this.getUserActivity(userId, timeRange),
        engagement: await this.getUserEngagement(userId, timeRange),
        achievements: await this.getUserAchievements(userId),
        progress: await this.getUserProgress(userId),
        comparisons: await this.getUserComparisons(userId, timeRange)
      };

      await CacheService.set(cacheKey, analytics, 1800); // 30 minutes
      return analytics;
    } catch (error) {
      ErrorService.logError(error, { 
        context: 'AnalyticsService.getUserAnalytics', 
        userId, 
        timeRange 
      });
      return this.getEmptyUserAnalytics();
    }
  }

  /**
   * Get streamer analytics dashboard
   */
  async getStreamerAnalytics(streamerId, timeRange = '30d') {
    try {
      const cacheKey = `streamer_analytics:${streamerId}:${timeRange}`;
      const cached = await CacheService.get(cacheKey);
      
      if (cached) {
        return cached;
      }

      const analytics = {
        profile: await this.getStreamerProfile(streamerId),
        streams: await this.getStreamerStreams(streamerId, timeRange),
        audience: await this.getStreamerAudience(streamerId, timeRange),
        revenue: await this.getStreamerRevenue(streamerId, timeRange),
        engagement: await this.getStreamerEngagement(streamerId, timeRange),
        performance: await this.getStreamerPerformance(streamerId, timeRange)
      };

      await CacheService.set(cacheKey, analytics, 3600); // 1 hour
      return analytics;
    } catch (error) {
      ErrorService.logError(error, { 
        context: 'AnalyticsService.getStreamerAnalytics', 
        streamerId, 
        timeRange 
      });
      return this.getEmptyStreamerAnalytics();
    }
  }

  /**
   * Get platform analytics
   */
  async getPlatformAnalytics(timeRange = '30d') {
    try {
      const cacheKey = `platform_analytics:${timeRange}`;
      const cached = await CacheService.get(cacheKey);
      
      if (cached) {
        return cached;
      }

      const analytics = {
        users: await this.getPlatformUserMetrics(timeRange),
        streams: await this.getPlatformStreamMetrics(timeRange),
        content: await this.getPlatformContentMetrics(timeRange),
        revenue: await this.getPlatformRevenueMetrics(timeRange),
        performance: await this.getPlatformPerformanceMetrics(timeRange),
        growth: await this.getPlatformGrowthMetrics(timeRange)
      };

      await CacheService.set(cacheKey, analytics, 3600); // 1 hour
      return analytics;
    } catch (error) {
      ErrorService.logError(error, { 
        context: 'AnalyticsService.getPlatformAnalytics', 
        timeRange 
      });
      return this.getEmptyPlatformAnalytics();
    }
  }

  /**
   * Get user activity metrics
   */
  async getUserActivity(userId, timeRange) {
    const timeCondition = this.getTimeCondition(timeRange);
    
    const result = await query(`
      SELECT 
        COUNT(*) as total_events,
        COUNT(DISTINCT DATE(timestamp)) as active_days,
        AVG(CASE WHEN event_type = 'stream_watched' THEN data->>'duration'::int END) as avg_watch_time,
        SUM(CASE WHEN event_type = 'tip_sent' THEN data->>'amount'::bigint END) as total_tips_sent,
        SUM(CASE WHEN event_type = 'tip_received' THEN data->>'amount'::bigint END) as total_tips_received,
        COUNT(CASE WHEN event_type = 'message_sent' THEN 1 END) as messages_sent
      FROM user_analytics
      WHERE user_id = $1 ${timeCondition}
    `, [userId]);

    return result.rows[0] || {};
  }

  /**
   * Get user engagement metrics
   */
  async getUserEngagement(userId, timeRange) {
    const timeCondition = this.getTimeCondition(timeRange);
    
    const result = await query(`
      SELECT 
        SUM(experience_gained) as total_experience,
        MAX(level) as current_level,
        COUNT(achievement_id) as achievements_unlocked,
        AVG(sessions_count) as avg_sessions_per_day,
        AVG(messages_sent) as avg_messages_per_day,
        AVG(tips_sent_count) as avg_tips_per_day
      FROM user_analytics
      WHERE user_id = $1 ${timeCondition}
    `, [userId]);

    return result.rows[0] || {};
  }

  /**
   * Get user achievements summary
   */
  async getUserAchievements(userId) {
    const result = await query(`
      SELECT 
        a.name,
        a.description,
        a.badge_icon,
        a.experience_reward,
        ua.unlocked_at,
        ua.progress,
        ua.is_completed
      FROM achievements a
      LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = $1
      WHERE a.is_active = true
      ORDER BY a.experience_reward DESC
    `, [userId]);

    return result.rows || [];
  }

  /**
   * Get user progress metrics
   */
  async getUserProgress(userId) {
    const result = await query(`
      SELECT 
        u.experience_points,
        u.level,
        u.level_title,
        ul.experience_required as next_level_exp,
        u.tokens_balance,
        u.total_tips_earned,
        u.total_tips_sent,
        u.watch_time_hours,
        u.stream_time_hours
      FROM users u
      LEFT JOIN user_levels ul ON u.level + 1 = ul.level
      WHERE u.id = $1
    `, [userId]);

    return result.rows[0] || {};
  }

  /**
   * Get user comparisons (position relative to other users)
   */
  async getUserComparisons(userId, timeRange) {
    const timeCondition = this.getTimeCondition(timeRange);
    
    const result = await query(`
      WITH user_stats AS (
        SELECT 
          user_id,
          SUM(experience_gained) as exp_gained,
          SUM(tokens_spent) as tokens_spent,
          SUM(tokens_earned) as tokens_earned,
          SUM(watch_time_minutes) as watch_time,
          SUM(stream_time_minutes) as stream_time
        FROM user_analytics
        WHERE 1=1 ${timeCondition}
        GROUP BY user_id
      ),
      user_rank AS (
        SELECT 
          user_id,
          ROW_NUMBER() OVER (ORDER BY exp_gained DESC) as exp_rank,
          ROW_NUMBER() OVER (ORDER BY tokens_spent DESC) as spending_rank,
          ROW_NUMBER() OVER (ORDER BY tokens_earned DESC) as earning_rank,
          ROW_NUMBER() OVER (ORDER BY watch_time DESC) as watch_rank,
          ROW_NUMBER() OVER (ORDER BY stream_time DESC) as stream_rank
        FROM user_stats
      )
      SELECT 
        u.username,
        ur.exp_rank,
        ur.spending_rank,
        ur.earning_rank,
        ur.watch_rank,
        ur.stream_rank,
        COUNT(*) OVER() as total_users
      FROM user_rank ur
      JOIN users u ON ur.user_id = u.id
      WHERE ur.user_id = $1
    `, [userId]);

    return result.rows[0] || {};
  }

  /**
   * Get streamer profile data
   */
  async getStreamerProfile(streamerId) {
    const result = await query(`
      SELECT 
        u.username,
        u.avatar_url,
        u.level,
        u.level_title,
        u.badge_icon,
        COUNT(DISTINCT uf.follower_id) as follower_count,
        COUNT(DISTINCT s.id) as total_streams,
        SUM(s.total_tips) as total_tips_earned,
        AVG(s.viewer_count) as avg_viewers
      FROM users u
      LEFT JOIN user_follows uf ON u.id = uf.streamer_id
      LEFT JOIN streams s ON u.id = s.streamer_id
      WHERE u.id = $1
      GROUP BY u.id
    `, [streamerId]);

    return result.rows[0] || {};
  }

  /**
   * Get platform growth metrics
   */
  async getPlatformGrowthMetrics(timeRange) {
    const timeCondition = this.getTimeCondition(timeRange);
    
    const result = await query(`
      SELECT 
        COUNT(DISTINCT user_id) as active_users,
        COUNT(DISTINCT streamer_id) as active_streamers,
        COUNT(DISTINCT stream_id) as total_streams,
        SUM(total_tips) as total_tips_volume,
        AVG(viewer_count) as avg_viewers_per_stream
      FROM user_analytics ua
      JOIN streams s ON ua.user_id = s.streamer_id
      WHERE 1=1 ${timeCondition}
    `);

    return result.rows[0] || {};
  }

  /**
   * Update real-time metrics
   */
  async updateRealTimeMetrics(userId, eventType, data) {
    const cacheKey = `realtime_metrics:${userId}`;
    const existing = await CacheService.get(cacheKey) || {
      lastActivity: new Date().toISOString(),
      events: {},
      totalTime: 0
    };

    existing.lastActivity = new Date().toISOString();
    existing.events[eventType] = (existing.events[eventType] || 0) + 1;
    existing.totalTime = Date.now() - new Date(existing.lastActivity).getTime();

    await CacheService.set(cacheKey, existing, 300); // 5 minutes
  }

  /**
   * Update stream metrics
   */
  async updateStreamMetrics(streamId, streamEvent) {
    const cacheKey = `stream_metrics:${streamId}`;
    await CacheService.set(cacheKey, streamEvent, 600); // 10 minutes
  }

  /**
   * Add event to metrics buffer for batch processing
   */
  addToMetricsBuffer(userId, event) {
    if (!this.metricsBuffer.has(userId)) {
      this.metricsBuffer.set(userId, []);
    }
    this.metricsBuffer.get(userId).push(event);

    // Process batch if buffer is large enough
    if (this.metricsBuffer.get(userId).length >= 50) {
      this.processMetricsBatch(userId);
    }
  }

  /**
   * Process metrics batch
   */
  async processMetricsBatch(userId) {
    const events = this.metricsBuffer.get(userId) || [];
    if (events.length === 0) return;

    try {
      // Batch insert events into database
      const values = events.map((event, index) => {
        return `($${index * 5 + 1}, $${index * 5 + 2}, $${index * 5 + 3}, $${index * 5 + 4}, $${index * 5 + 5})`;
      }).join(', ');

      const params = [];
      events.forEach((event) => {
        params.push(
          userId,
          event.eventType,
          JSON.stringify(event.data),
          JSON.stringify(event.metadata),
          event.metadata.timestamp
        );
      });

      await query(`
        INSERT INTO analytics_events (user_id, event_type, data, metadata, timestamp)
        VALUES ${values}
        ON CONFLICT (id) DO NOTHING
      `, params);

      // Clear processed events
      this.metricsBuffer.set(userId, []);
    } catch (error) {
      ErrorService.logError(error, { 
        context: 'AnalyticsService.processMetricsBatch', 
        userId, 
        eventCount: events.length 
      });
    }
  }

  /**
   * Schedule aggregation job
   */
  scheduleAggregation(type, id, data) {
    const jobKey = `${type}:${id}`;
    this.aggregationJobs.set(jobKey, {
      type,
      id,
      data,
      scheduledAt: new Date()
    });
  }

  /**
   * Process aggregation jobs
   */
  async processAggregationJobs() {
    for (const [jobKey, job] of this.aggregationJobs.entries()) {
      try {
        await this.runAggregationJob(job);
        this.aggregationJobs.delete(jobKey);
      } catch (error) {
        ErrorService.logError(error, { 
          context: 'AnalyticsService.processAggregationJobs', 
          jobKey, 
          job 
        });
      }
    }
  }

  /**
   * Run aggregation job
   */
  async runAggregationJob(job) {
    switch (job.type) {
      case 'stream_metrics':
        await this.aggregateStreamMetrics(job.data);
        break;
      case 'user_daily':
        await this.aggregateUserDailyMetrics(job.id);
        break;
      default:
        console.warn('Unknown aggregation job type:', job.type);
    }
  }

  /**
   * Aggregate stream metrics
   */
  async aggregateStreamMetrics(streamEvent) {
    await query(`
      INSERT INTO stream_metrics_aggregates (
        stream_id, date, total_viewers, peak_viewers, 
        total_messages, total_tips, duration_minutes
      )
      VALUES ($1, CURRENT_DATE, $2, $2, $3, $4, $5)
      ON CONFLICT (stream_id, date) 
      DO UPDATE SET 
        total_viewers = GREATEST(stream_metrics_aggregates.total_viewers, EXCLUDED.total_viewers),
        total_messages = stream_metrics_aggregates.total_messages + EXCLUDED.total_messages,
        total_tips = stream_metrics_aggregates.total_tips + EXCLUDED.total_tips,
        duration_minutes = stream_metrics_aggregates.duration_minutes + EXCLUDED.duration_minutes
    `, [
      streamEvent.streamId,
      streamEvent.metrics.viewerCount,
      streamEvent.metrics.chatMessages,
      streamEvent.metrics.tipsReceived,
      streamEvent.metrics.duration
    ]);
  }

  /**
   * Store event in database
   */
  async storeEventInDatabase(event) {
    try {
      await query(`
        INSERT INTO analytics_events (user_id, event_type, data, metadata, timestamp)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO NOTHING
      `, [
        event.userId,
        event.eventType,
        JSON.stringify(event.data),
        JSON.stringify(event.metadata),
        event.metadata.timestamp
      ]);
    } catch (error) {
      // If batch insert fails, store individual event
      console.error('Failed to store analytics event:', error);
    }
  }

  /**
   * Store stream metrics in database
   */
  async storeStreamMetrics(streamEvent) {
    try {
      await query(`
        INSERT INTO stream_metrics (stream_id, timestamp, viewer_count, chat_messages, tips_received, duration)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        streamEvent.streamId,
        streamEvent.timestamp,
        streamEvent.metrics.viewerCount,
        streamEvent.metrics.chatMessages,
        streamEvent.metrics.tipsReceived,
        streamEvent.metrics.duration
      ]);
    } catch (error) {
      ErrorService.logError(error, { 
        context: 'AnalyticsService.storeStreamMetrics', 
        streamId: streamEvent.streamId 
      });
    }
  }

  /**
   * Get time condition for database queries
   */
  getTimeCondition(timeRange) {
    switch (timeRange) {
      case '1h':
        return "AND timestamp >= NOW() - INTERVAL '1 hour'";
      case '24h':
        return "AND timestamp >= CURRENT_DATE";
      case '7d':
        return "AND timestamp >= CURRENT_DATE - INTERVAL '7 days'";
      case '30d':
        return "AND timestamp >= CURRENT_DATE - INTERVAL '30 days'";
      case '90d':
        return "AND timestamp >= CURRENT_DATE - INTERVAL '90 days'";
      default:
        return "AND timestamp >= CURRENT_DATE - INTERVAL '7 days'";
    }
  }

  /**
   * Get empty user analytics (for error cases)
   */
  getEmptyUserAnalytics() {
    return {
      user: null,
      activity: {},
      engagement: {},
      achievements: [],
      progress: {},
      comparisons: {}
    };
  }

  /**
   * Get empty streamer analytics (for error cases)
   */
  getEmptyStreamerAnalytics() {
    return {
      profile: {},
      streams: [],
      audience: {},
      revenue: {},
      engagement: {},
      performance: {}
    };
  }

  /**
   * Get empty platform analytics (for error cases)
   */
  getEmptyPlatformAnalytics() {
    return {
      users: {},
      streams: {},
      content: {},
      revenue: {},
      performance: {},
      growth: {}
    };
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      bufferSize: this.metricsBuffer.size,
      aggregationJobs: this.aggregationJobs.size,
      eventsInBuffer: Array.from(this.metricsBuffer.values())
        .reduce((sum, events) => sum + events.length, 0)
    };
  }
}

module.exports = new AnalyticsService();