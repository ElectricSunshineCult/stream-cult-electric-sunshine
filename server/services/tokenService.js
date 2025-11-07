const jwt = require('jsonwebtoken');

const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'fallback-secret',
    { 
      expiresIn: '15m',
      issuer: 'stream-cult',
      audience: 'stream-cult-users'
    }
  );

  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
    { 
      expiresIn: '30d',
      issuer: 'stream-cult',
      audience: 'stream-cult-users'
    }
  );

  return {
    accessToken,
    refreshToken,
    expiresIn: '15m'
  };
};

const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret', {
      issuer: 'stream-cult',
      audience: 'stream-cult-users'
    });
  } catch (error) {
    return null;
  }
};

const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret', {
      issuer: 'stream-cult',
      audience: 'stream-cult-users'
    });

    if (decoded.type !== 'refresh') {
      return null;
    }

    return decoded;
  } catch (error) {
    return null;
  }
};

const generateStreamerToken = (streamId) => {
  return jwt.sign(
    { streamId, type: 'streamer' },
    process.env.JWT_STREAMER_SECRET || 'fallback-streamer-secret',
    { 
      expiresIn: '24h',
      issuer: 'stream-cult',
      audience: 'stream-cult-streamers'
    }
  );
};

const verifyStreamerToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_STREAMER_SECRET || 'fallback-streamer-secret', {
      issuer: 'stream-cult',
      audience: 'stream-cult-streamers'
    });
  } catch (error) {
    return null;
  }
};

const generateOBSToken = (streamId, streamerId) => {
  return jwt.sign(
    { streamId, streamerId, type: 'obs' },
    process.env.JWT_OBS_SECRET || 'fallback-obs-secret',
    { 
      expiresIn: '12h',
      issuer: 'stream-cult',
      audience: 'stream-cult-obs'
    }
  );
};

const verifyOBSToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_OBS_SECRET || 'fallback-obs-secret', {
      issuer: 'stream-cult',
      audience: 'stream-cult-obs'
    });
  } catch (error) {
    return null;
  }
};

module.exports = {
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  generateStreamerToken,
  verifyStreamerToken,
  generateOBSToken,
  verifyOBSToken
};