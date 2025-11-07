const { RateLimiterRedis } = require('rate-limiter-flexible');

// Create rate limiter for general API requests
const generalRateLimiter = new RateLimiterRedis({
  storeClient: require('../services/redisService').getRedisClient(),
  keyPrefix: 'general_rl',
  points: 100, // Number of points
  duration: 60, // Per 60 seconds
  blockDuration: 60, // Block for 1 minute
});

// Create rate limiter for auth endpoints
const authRateLimiter = new RateLimiterRedis({
  storeClient: require('../services/redisService').getRedisClient(),
  keyPrefix: 'auth_rl',
  points: 5, // 5 attempts
  duration: 300, // Per 5 minutes
  blockDuration: 900, // Block for 15 minutes
});

// Create rate limiter for chat messages
const chatRateLimiter = new RateLimiterRedis({
  storeClient: require('../services/redisService').getRedisClient(),
  keyPrefix: 'chat_rl',
  points: 10, // 10 messages
  duration: 10, // Per 10 seconds
  blockDuration: 30, // Block for 30 seconds
});

// Create rate limiter for tipping
const tipRateLimiter = new RateLimiterRedis({
  storeClient: require('../services/redisService').getRedisClient(),
  keyPrefix: 'tip_rl',
  points: 50, // 50 tips
  duration: 60, // Per minute
  blockDuration: 120, // Block for 2 minutes
});

const rateLimiter = (req, res, next) => {
  // Skip rate limiting for health checks
  if (req.path === '/health') {
    return next();
  }

  // Use appropriate rate limiter based on endpoint
  let limiter = generalRateLimiter;
  
  if (req.path.startsWith('/api/auth')) {
    limiter = authRateLimiter;
  } else if (req.path.startsWith('/api/chat')) {
    limiter = chatRateLimiter;
  } else if (req.path.startsWith('/api/tips')) {
    limiter = tipRateLimiter;
  }

  const key = req.ip || 'unknown';
  
  limiter.consume(key)
    .then(() => {
      next();
    })
    .catch((rejRes) => {
      const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
      res.set('Retry-After', String(secs));
      res.status(429).json({ 
        error: 'Rate limit exceeded', 
        retryAfter: secs,
        type: 'rate_limit'
      });
    });
};

module.exports = {
  rateLimiter,
  generalRateLimiter,
  authRateLimiter,
  chatRateLimiter,
  tipRateLimiter
};