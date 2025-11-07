const redis = require('redis');
const { v4: uuidv4 } = require('uuid');

class CacheService {
  constructor() {
    this.redisClient = null;
    this.defaultTTL = 3600; // 1 hour
    this.isInitialized = false;
  }

  /**
   * Initialize Redis connection
   */
  async initialize() {
    try {
      this.redisClient = redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            return new Error('The Redis server refused the connection');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            return new Error('Retry time exhausted');
          }
          if (options.attempt > 10) {
            return undefined;
          }
          return Math.min(options.attempt * 100, 3000);
        }
      });

      this.redisClient.on('error', (err) => {
        console.error('Redis Client Error:', err);
        this.isInitialized = false;
      });

      this.redisClient.on('connect', () => {
        console.log('✅ Redis client connected');
        this.isInitialized = true;
      });

      await this.redisClient.connect();
    } catch (error) {
      console.error('❌ Failed to initialize Redis:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Get value from cache
   */
  async get(key) {
    if (!this.isInitialized) {
      return null;
    }

    try {
      const value = await this.redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(key, value, ttl = this.defaultTTL) {
    if (!this.isInitialized) {
      return false;
    }

    try {
      await this.redisClient.setEx(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async del(key) {
    if (!this.isInitialized) {
      return false;
    }

    try {
      await this.redisClient.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async delPattern(pattern) {
    if (!this.isInitialized) {
      return false;
    }

    try {
      const keys = await this.redisClient.keys(pattern);
      if (keys.length > 0) {
        await this.redisClient.del(keys);
      }
      return true;
    } catch (error) {
      console.error('Cache pattern delete error:', error);
      return false;
    }
  }

  /**
   * Cache user level information
   */
  async cacheUserLevel(userId, levelData, ttl = 1800) { // 30 minutes
    const key = `user_level:${userId}`;
    return await this.set(key, levelData, ttl);
  }

  /**
   * Get cached user level information
   */
  async getCachedUserLevel(userId) {
    const key = `user_level:${userId}`;
    return await this.get(key);
  }

  /**
   * Cache leaderboard data
   */
  async cacheLeaderboard(category, period, leaderboardData, ttl = 900) { // 15 minutes
    const key = `leaderboard:${category}:${period}`;
    return await this.set(key, leaderboardData, ttl);
  }

  /**
   * Get cached leaderboard data
   */
  async getCachedLeaderboard(category, period) {
    const key = `leaderboard:${category}:${period}`;
    return await this.get(key);
  }

  /**
   * Cache achievements data
   */
  async cacheUserAchievements(userId, achievementsData, ttl = 1800) { // 30 minutes
    const key = `user_achievements:${userId}`;
    return await this.set(key, achievementsData, ttl);
  }

  /**
   * Get cached achievements data
   */
  async getCachedUserAchievements(userId) {
    const key = `user_achievements:${userId}`;
    return await this.get(key);
  }

  /**
   * Cache stream data
   */
  async cacheStream(streamId, streamData, ttl = 300) { // 5 minutes
    const key = `stream:${streamId}`;
    return await this.set(key, streamData, ttl);
  }

  /**
   * Get cached stream data
   */
  async getCachedStream(streamId) {
    const key = `stream:${streamId}`;
    return await this.get(key);
  }

  /**
   * Invalidate user-related cache
   */
  async invalidateUserCache(userId) {
    const patterns = [
      `user_level:${userId}`,
      `user_achievements:${userId}`,
      'leaderboard:*' // Invalidate all leaderboards when user data changes
    ];

    for (const pattern of patterns) {
      if (pattern.includes('*')) {
        await this.delPattern(pattern);
      } else {
        await this.del(pattern);
      }
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    if (!this.isInitialized) {
      return { error: 'Redis not connected' };
    }

    try {
      const info = await this.redisClient.info();
      const stats = {};
      
      info.split('\r\n').forEach(line => {
        if (line.includes(':')) {
          const [key, value] = line.split(':');
          stats[key] = value;
        }
      });

      return {
        connected: true,
        memory_used: stats.used_memory_human,
        memory_peak: stats.used_memory_peak_human,
        total_keys: parseInt(stats.db0?.split(',')[0]?.split('=')[1] || '0'),
        uptime: stats.uptime_in_seconds
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Close Redis connection
   */
  async close() {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }
}

module.exports = new CacheService();