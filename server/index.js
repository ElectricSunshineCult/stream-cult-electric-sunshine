require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createClient } = require('redis');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const streamRoutes = require('./routes/streams');
const tipRoutes = require('./routes/tips');
const chatRoutes = require('./routes/chat');
const regionRoutes = require('./routes/regions');
const adminRoutes = require('./routes/admin');
const paymentRoutes = require('./routes/payments');
const levelsRoutes = require('./routes/levels');
const profilesRoutes = require('./routes/profiles');
const urlsRoutes = require('./routes/urls');
const emotesRoutes = require('./routes/emotes');
const blockedRoutes = require('./routes/blocked');
const videoQualityRoutes = require('./routes/video-quality');
const connectionStatusRoutes = require('./routes/connection-status');
const guestStreamersRoutes = require('./routes/guest-streamers');
const raidsRoutes = require('./routes/raids');
const tipSplitsRoutes = require('./routes/tip-splits');
const userRestrictionsRoutes = require('./routes/user-restrictions');
const screenShareRoutes = require('./routes/screen-share');

// Import middleware
const { authenticateToken } = require('./middleware/auth');
const { errorHandler } = require('./middleware/errorHandler');
const { rateLimiter } = require('./middleware/rateLimiter');

// Import services
const { setupSocketHandlers } = require('./services/socketService');
const { setupRedis } = require('./services/redisService');
const CacheService = require('./services/cacheService');
const ErrorService = require('./services/errorService');
const NotificationService = require('./services/notificationService');
const AnalyticsService = require('./services/analyticsService');

const app = express();
const server = http.createServer(app);

// CORS configuration
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  credentials: true
};

// Middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(rateLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/streams', streamRoutes);
app.use('/api/tips', tipRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/regions', regionRoutes);
app.use('/api/levels', levelsRoutes);
app.use('/api/profiles', authenticateToken, profilesRoutes);
app.use('/api/urls', urlsRoutes);
app.use('/api/emotes', emotesRoutes);
app.use('/api/blocked', authenticateToken, blockedRoutes);
app.use('/api/video-quality', videoQualityRoutes);
app.use('/api/connection-status', connectionStatusRoutes);
app.use('/api/guests', guestStreamersRoutes);
app.use('/api/raids', raidsRoutes);
app.use('/api/tip-splits', tipSplitsRoutes);
app.use('/api/restrictions', userRestrictionsRoutes);
app.use('/api/screen-share', screenShareRoutes);
app.use('/api/admin', authenticateToken, adminRoutes);
app.use('/api/payments', paymentRoutes);

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/obs-overlay', express.static(path.join(__dirname, 'public/obs-overlay')));

// Initialize services and inject them into app locals
const initializeAppServices = async () => {
  app.locals.cacheService = new CacheService();
  app.locals.errorService = new ErrorService();
  app.locals.notificationService = new NotificationService();
  app.locals.analyticsService = new AnalyticsService();
  
  console.log('✅ Application services initialized');
};

// Initialize app services
initializeAppServices().catch(console.error);

// Error handling middleware (must be after services initialization)
app.use(errorService.middleware());

// Analytics middleware
app.use(analyticsService.middleware());

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize services
const initializeServices = async () => {
  try {
    // Setup Redis
    await setupRedis();
    console.log('✅ Redis service initialized');
    
    // Setup Socket.IO with CORS
    const io = socketIo(server, {
      cors: corsOptions,
      transports: ['websocket', 'polling']
    });
    
    // Setup socket handlers
    setupSocketHandlers(io);
    console.log('✅ Socket.IO handlers initialized');
    
  } catch (error) {
    console.error('❌ Service initialization failed:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  await initializeServices();
});

module.exports = { app, server, io: socketIo(server, corsOptions) };