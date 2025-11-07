const { createClient } = require('redis');

let redisClient = null;

const setupRedis = async () => {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 5000,
        lazyConnect: true,
      },
    });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis connected');
    });

    redisClient.on('end', () => {
      console.log('Redis disconnected');
    });

    await redisClient.connect();
    console.log('✅ Redis service ready');
    return redisClient;
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    throw error;
  }
};

const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  return redisClient;
};

const setCache = async (key, value, ttl = 3600) => {
  try {
    await redisClient.setEx(key, ttl, JSON.stringify(value));
  } catch (error) {
    console.error('Redis SET error:', error);
  }
};

const getCache = async (key) => {
  try {
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('Redis GET error:', error);
    return null;
  }
};

const deleteCache = async (key) => {
  try {
    await redisClient.del(key);
  } catch (error) {
    console.error('Redis DEL error:', error);
  }
};

const incrementCache = async (key, ttl = 3600) => {
  try {
    const value = await redisClient.incr(key);
    if (value === 1) {
      await redisClient.expire(key, ttl);
    }
    return value;
  } catch (error) {
    console.error('Redis INCR error:', error);
    return null;
  }
};

const setStreamViewers = async (streamId, count) => {
  try {
    await setCache(`stream:${streamId}:viewers`, { count, updated: Date.now() }, 300);
  } catch (error) {
    console.error('Error setting stream viewers:', error);
  }
};

const getStreamViewers = async (streamId) => {
  try {
    const data = await getCache(`stream:${streamId}:viewers`);
    return data ? data.count : 0;
  } catch (error) {
    console.error('Error getting stream viewers:', error);
    return 0;
  }
};

const rateLimitCheck = async (key, limit, window) => {
  try {
    const count = await incrementCache(`rate_limit:${key}`, window);
    return count <= limit;
  } catch (error) {
    console.error('Error checking rate limit:', error);
    return true; // Allow on error
  }
};

const cacheStreamData = async (streamId, data, ttl = 300) => {
  try {
    await setCache(`stream:${streamId}:data`, data, ttl);
  } catch (error) {
    console.error('Error caching stream data:', error);
  }
};

const getCachedStreamData = async (streamId) => {
  try {
    return await getCache(`stream:${streamId}:data`);
  } catch (error) {
    console.error('Error getting cached stream data:', error);
    return null;
  }
};

const cleanup = async () => {
  if (redisClient) {
    await redisClient.quit();
  }
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

module.exports = {
  setupRedis,
  getRedisClient,
  setCache,
  getCache,
  deleteCache,
  incrementCache,
  setStreamViewers,
  getStreamViewers,
  rateLimitCheck,
  cacheStreamData,
  getCachedStreamData,
  cleanup
};