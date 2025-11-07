const { Server } = require('socket.io');
const eventEmitter = require('events');
const CacheService = require('./cacheService');
const ErrorService = require('./errorService');

class NotificationService extends eventEmitter {
  constructor() {
    super();
    this.io = null;
    this.connectedUsers = new Map();
    this.notificationHistory = new Map();
    this.preferences = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize the notification service
   */
  initialize(server) {
    try {
      this.io = new Server(server, {
        cors: {
          origin: process.env.CLIENT_URL || "*",
          methods: ["GET", "POST"]
        },
        transports: ['websocket', 'polling']
      });

      this.setupSocketHandlers();
      this.isInitialized = true;
      console.log('✅ Notification Service initialized');
    } catch (error) {
      ErrorService.logError(error, { context: 'NotificationService.initialize' });
      this.isInitialized = false;
    }
  }

  /**
   * Setup Socket.IO event handlers
   */
  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`📡 User connected: ${socket.id}`);

      // Handle user authentication
      socket.on('authenticate', async (userId) => {
        try {
          socket.userId = userId;
          this.connectedUsers.set(userId, socket);
          
          // Join user-specific room
          socket.join(`user:${userId}`);
          
          // Send authentication confirmation
          socket.emit('authenticated', { userId, status: 'connected' });
          
          // Send unread notifications
          const unreadNotifications = await this.getUnreadNotifications(userId);
          socket.emit('unread_notifications', unreadNotifications);

          console.log(`🔐 User ${userId} authenticated on socket ${socket.id}`);
        } catch (error) {
          ErrorService.logError(error, { 
            context: 'NotificationService.authenticate', 
            userId, 
            socketId: socket.id 
          });
          socket.emit('auth_error', { message: 'Authentication failed' });
        }
      });

      // Handle joining rooms
      socket.on('join_room', (roomId) => {
        socket.join(roomId);
        console.log(`🏠 User ${socket.userId} joined room: ${roomId}`);
      });

      socket.on('leave_room', (roomId) => {
        socket.leave(roomId);
        console.log(`🚪 User ${socket.userId} left room: ${roomId}`);
      });

      // Handle real-time actions
      socket.on('send_message', (data) => {
        this.handleRealTimeMessage(socket, data);
      });

      socket.on('send_tip', (data) => {
        this.handleRealTimeTip(socket, data);
      });

      socket.on('achievement_unlocked', (data) => {
        this.handleAchievementUnlocked(socket, data);
      });

      // Handle typing indicators
      socket.on('typing_start', (data) => {
        socket.to(`stream:${data.streamId}`).emit('user_typing', {
          userId: socket.userId,
          username: data.username,
          streamId: data.streamId
        });
      });

      socket.on('typing_stop', (data) => {
        socket.to(`stream:${data.streamId}`).emit('user_stop_typing', {
          userId: socket.userId,
          streamId: data.streamId
        });
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        if (socket.userId) {
          this.connectedUsers.delete(socket.userId);
        }
        console.log(`📡 User disconnected: ${socket.id}`);
      });
    });
  }

  /**
   * Send notification to user
   */
  async sendToUser(userId, notification) {
    if (!this.isInitialized) {
      ErrorService.logError(new Error('Notification service not initialized'), {
        context: 'NotificationService.sendToUser',
        userId
      });
      return false;
    }

    try {
      // Check user preferences
      const userPrefs = this.preferences.get(userId) || this.getDefaultPreferences();
      if (!this.shouldSendNotification(notification, userPrefs)) {
        return false;
      }

      const notificationData = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        read: false,
        ...notification
      };

      // Add to notification history
      if (!this.notificationHistory.has(userId)) {
        this.notificationHistory.set(userId, []);
      }
      this.notificationHistory.get(userId).push(notificationData);

      // Send real-time notification if user is online
      const userSocket = this.connectedUsers.get(userId);
      if (userSocket) {
        userSocket.emit('notification', notificationData);
        userSocket.emit('unread_count', await this.getUnreadCount(userId));
      }

      // Store in cache for offline users
      await this.storeNotification(userId, notificationData);

      return true;
    } catch (error) {
      ErrorService.logError(error, { 
        context: 'NotificationService.sendToUser', 
        userId, 
        notificationType: notification.type 
      });
      return false;
    }
  }

  /**
   * Send notification to all users in a room
   */
  async sendToRoom(roomId, notification) {
    if (!this.isInitialized) return false;

    try {
      const notificationData = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        read: false,
        ...notification
      };

      this.io.to(roomId).emit('notification', notificationData);
      return true;
    } catch (error) {
      ErrorService.logError(error, { 
        context: 'NotificationService.sendToRoom', 
        roomId, 
        notificationType: notification.type 
      });
      return false;
    }
  }

  /**
   * Send achievement notification
   */
  async sendAchievementNotification(userId, achievement) {
    const notification = {
      type: 'achievement',
      title: '🏆 Achievement Unlocked!',
      message: achievement.description,
      data: achievement,
      actions: [
        { type: 'view_achievements', label: 'View Achievements', url: '/achievements' }
      ]
    };

    return await this.sendToUser(userId, notification);
  }

  /**
   * Send level up notification
   */
  async sendLevelUpNotification(userId, levelData) {
    const notification = {
      type: 'level_up',
      title: '⬆️ Level Up!',
      message: `Congratulations! You've reached level ${levelData.level} - ${levelData.title}`,
      data: levelData,
      actions: [
        { type: 'view_profile', label: 'View Profile', url: '/profile' },
        { type: 'view_leaderboard', label: 'See Leaderboard', url: '/leaderboard' }
      ]
    };

    return await this.sendToUser(userId, notification);
  }

  /**
   * Send tip notification
   */
  async sendTipNotification(fromUser, toUserId, tipData) {
    // Notification to receiver
    const receiverNotification = {
      type: 'tip_received',
      title: '💰 New Tip Received!',
      message: `${fromUser.username} sent you ${tipData.amount} tokens`,
      data: tipData,
      actions: [
        { type: 'view_stream', label: 'View Stream', url: `/stream/${tipData.streamId}` }
      ]
    };

    // Notification to sender
    const senderNotification = {
      type: 'tip_sent',
      title: '💝 Tip Sent!',
      message: `You sent ${tipData.amount} tokens to ${tipData.streamerName}`,
      data: tipData,
      actions: [
        { type: 'view_stream', label: 'View Stream', url: `/stream/${tipData.streamId}` }
      ]
    };

    const promises = [
      this.sendToUser(toUserId, receiverNotification),
      this.sendToUser(fromUser.id, senderNotification)
    ];

    return await Promise.all(promises);
  }

  /**
   * Send stream notification
   */
  async sendStreamNotification(streamData, notificationType) {
    let notification = {};

    switch (notificationType) {
      case 'stream_started':
        notification = {
          type: 'stream_started',
          title: '🔴 Stream Started!',
          message: `${streamData.streamerName} is now live streaming: ${streamData.title}`,
          data: streamData,
          actions: [
            { type: 'watch_stream', label: 'Watch Now', url: `/stream/${streamData.id}` }
          ]
        };
        break;
      case 'stream_ended':
        notification = {
          type: 'stream_ended',
          title: '⏹️ Stream Ended',
          message: `${streamData.streamerName}'s stream has ended.`,
          data: streamData
        };
        break;
      case 'follower_milestone':
        notification = {
          type: 'follower_milestone',
          title: '👥 Milestone Reached!',
          message: `You now have ${streamData.followerCount} followers!`,
          data: streamData
        };
        break;
    }

    // Send to streamer
    await this.sendToUser(streamData.streamerId, notification);

    // Send to followers if it's a stream start
    if (notificationType === 'stream_started' && streamData.followers) {
      for (const follower of streamData.followers) {
        await this.sendToUser(follower.id, {
          ...notification,
          data: { ...streamData, followerId: follower.id }
        });
      }
    }
  }

  /**
   * Send daily bonus notification
   */
  async sendDailyBonusNotification(userId, bonusData) {
    const notification = {
      type: 'daily_bonus',
      title: '🎁 Daily Bonus!',
      message: `You've received ${bonusData.amount} tokens for your ${bonusData.streak} day login streak!`,
      data: bonusData,
      actions: [
        { type: 'view_profile', label: 'View Profile', url: '/profile' }
      ]
    };

    return await this.sendToUser(userId, notification);
  }

  /**
   * Handle real-time message
   */
  handleRealTimeMessage(socket, data) {
    const message = {
      id: Date.now().toString(),
      userId: socket.userId,
      username: data.username,
      content: data.content,
      type: 'chat',
      timestamp: new Date().toISOString()
    };

    // Broadcast to stream room
    socket.to(`stream:${data.streamId}`).emit('new_message', message);
  }

  /**
   * Handle real-time tip
   */
  async handleRealTimeTip(socket, data) {
    const tip = {
      id: Date.now().toString(),
      fromUserId: socket.userId,
      fromUsername: data.fromUsername,
      toStreamerId: data.toStreamerId,
      amount: data.amount,
      message: data.message,
      streamId: data.streamId,
      timestamp: new Date().toISOString()
    };

    // Broadcast tip to stream
    socket.to(`stream:${data.streamId}`).emit('new_tip', tip);
  }

  /**
   * Handle achievement unlocked
   */
  handleAchievementUnlocked(socket, data) {
    const achievement = {
      id: data.achievementId,
      name: data.achievementName,
      description: data.achievementDescription,
      badgeIcon: data.badgeIcon,
      experienceReward: data.experienceReward,
      timestamp: new Date().toISOString()
    };

    // Broadcast to user's followers and friends
    socket.broadcast.emit('achievement_unlocked', {
      userId: socket.userId,
      achievement
    });
  }

  /**
   * Get user preferences
   */
  getUserPreferences(userId) {
    return this.preferences.get(userId) || this.getDefaultPreferences();
  }

  /**
   * Update user preferences
   */
  updateUserPreferences(userId, preferences) {
    const currentPrefs = this.getUserPreferences(userId);
    const updatedPrefs = { ...currentPrefs, ...preferences };
    this.preferences.set(userId, updatedPrefs);
    return updatedPrefs;
  }

  /**
   * Get default preferences
   */
  getDefaultPreferences() {
    return {
      email: true,
      push: true,
      achievements: true,
      tips: true,
      streams: true,
      leaderboards: true,
      daily_bonus: true,
      sounds: true,
      desktop: true,
      mobile: true
    };
  }

  /**
   * Check if notification should be sent based on preferences
   */
  shouldSendNotification(notification, preferences) {
    switch (notification.type) {
      case 'achievement':
        return preferences.achievements;
      case 'tip_received':
      case 'tip_sent':
        return preferences.tips;
      case 'stream_started':
      case 'stream_ended':
        return preferences.streams;
      case 'daily_bonus':
        return preferences.daily_bonus;
      default:
        return true;
    }
  }

  /**
   * Get unread notifications count
   */
  async getUnreadCount(userId) {
    const notifications = this.notificationHistory.get(userId) || [];
    return notifications.filter(n => !n.read).length;
  }

  /**
   * Get unread notifications
   */
  async getUnreadNotifications(userId) {
    const notifications = this.notificationHistory.get(userId) || [];
    return notifications.filter(n => !n.read).slice(-20); // Last 20 unread
  }

  /**
   * Mark notification as read
   */
  markAsRead(userId, notificationId) {
    const notifications = this.notificationHistory.get(userId) || [];
    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      return true;
    }
    return false;
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(userId) {
    const notifications = this.notificationHistory.get(userId) || [];
    notifications.forEach(n => n.read = true);
  }

  /**
   * Store notification in cache
   */
  async storeNotification(userId, notification) {
    try {
      const cacheKey = `notifications:${userId}`;
      const cached = await CacheService.get(cacheKey) || [];
      cached.push(notification);
      
      // Keep only last 100 notifications
      if (cached.length > 100) {
        cached.splice(0, cached.length - 100);
      }
      
      await CacheService.set(cacheKey, cached, 86400); // 24 hours
    } catch (error) {
      ErrorService.logError(error, { 
        context: 'NotificationService.storeNotification', 
        userId 
      });
    }
  }

  /**
   * Get notification history
   */
  getNotificationHistory(userId, limit = 50) {
    const notifications = this.notificationHistory.get(userId) || [];
    return notifications.slice(-limit);
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      connectedUsers: this.connectedUsers.size,
      totalNotifications: Array.from(this.notificationHistory.values())
        .reduce((sum, notifications) => sum + notifications.length, 0),
      isInitialized: this.isInitialized
    };
  }

  /**
   * Cleanup old notifications
   */
  cleanup() {
    const now = new Date();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

    for (const [userId, notifications] of this.notificationHistory.entries()) {
      const validNotifications = notifications.filter(n => {
        const age = now - new Date(n.timestamp);
        return age < maxAge;
      });
      
      if (validNotifications.length !== notifications.length) {
        this.notificationHistory.set(userId, validNotifications);
      }
    }
  }
}

module.exports = new NotificationService();