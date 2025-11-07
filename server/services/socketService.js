const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { 
  getStreamViewers, 
  setStreamViewers, 
  rateLimitCheck,
  getRedisClient 
} = require('./redisService');

const setupSocketHandlers = (io) => {
  // Authentication middleware for socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        
        const userResult = await query(
          'SELECT id, username, role, is_banned FROM users WHERE id = $1',
          [decoded.userId]
        );

        if (userResult.rows.length === 0 || userResult.rows[0].is_banned) {
          return next(new Error('Authentication failed'));
        }

        socket.user = userResult.rows[0];
      }
      
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user?.username || 'Anonymous'} (${socket.id})`);

    // Join stream room
    socket.on('join-stream', async (data) => {
      try {
        const { streamId } = data;
        
        // Verify stream exists and is live
        const streamResult = await query(`
          SELECT s.*, u.username as streamer_name, u.role as streamer_role
          FROM streams s
          JOIN users u ON s.streamer_id = u.id
          WHERE s.id = $1 AND s.is_live = true
        `, [streamId]);

        if (streamResult.rows.length === 0) {
          socket.emit('error', { message: 'Stream not found or not live' });
          return;
        }

        const stream = streamResult.rows[0];
        
        // Check NSFW access
        if (stream.is_nsfw && !socket.user?.age_verified) {
          socket.emit('error', { message: 'Age verification required for NSFW content' });
          return;
        }

        // Join stream room
        await socket.join(`stream:${streamId}`);
        
        // Update viewer count
        const currentViewers = await getStreamViewers(streamId);
        const newViewerCount = currentViewers + 1;
        await setStreamViewers(streamId, newViewerCount);
        
        // Update stream viewer count in database
        await query(
          'UPDATE streams SET viewer_count = $1 WHERE id = $2',
          [newViewerCount, streamId]
        );

        // Send stream data to user
        socket.emit('stream-data', {
          streamId,
          title: stream.title,
          streamerName: stream.streamer_name,
          viewerCount: newViewerCount,
          isNSFW: stream.is_nsfw
        });

        // Notify other users in stream about new viewer
        socket.to(`stream:${streamId}`).emit('viewer-count-update', {
          count: newViewerCount
        });

        console.log(`User ${socket.user?.username} joined stream ${streamId}`);
      } catch (error) {
        console.error('Join stream error:', error);
        socket.emit('error', { message: 'Failed to join stream' });
      }
    });

    // Leave stream room
    socket.on('leave-stream', async (data) => {
      try {
        const { streamId } = data;
        await socket.leave(`stream:${streamId}`);
        
        // Update viewer count
        const currentViewers = await getStreamViewers(streamId);
        const newViewerCount = Math.max(0, currentViewers - 1);
        await setStreamViewers(streamId, newViewerCount);
        
        // Update stream viewer count in database
        await query(
          'UPDATE streams SET viewer_count = $1 WHERE id = $2',
          [newViewerCount, streamId]
        );

        // Notify other users
        socket.to(`stream:${streamId}`).emit('viewer-count-update', {
          count: newViewerCount
        });

        console.log(`User ${socket.user?.username} left stream ${streamId}`);
      } catch (error) {
        console.error('Leave stream error:', error);
      }
    });

    // Handle chat messages
    socket.on('send-message', async (data) => {
      try {
        if (!socket.user) {
          socket.emit('error', { message: 'Authentication required' });
          return;
        }

        const { streamId, content, messageType = 'chat' } = data;

        // Rate limiting for chat
        const canSend = await rateLimitCheck(`chat:${socket.user.id}`, 10, 10);
        if (!canSend) {
          socket.emit('error', { message: 'Rate limit exceeded. Please wait before sending more messages.' });
          return;
        }

        // Check if user is in stream room
        const isInStream = socket.rooms.has(`stream:${streamId}`);
        if (!isInStream) {
          socket.emit('error', { message: 'You must join the stream first' });
          return;
        }

        // Save message to database
        const messageResult = await query(`
          INSERT INTO messages (stream_id, user_id, content, message_type)
          VALUES ($1, $2, $3, $4)
          RETURNING id, content, message_type, created_at
        `, [streamId, socket.user.id, content, messageType]);

        const message = messageResult.rows[0];

        // Broadcast message to stream room
        const messageData = {
          id: message.id,
          content: message.content,
          messageType: message.message_type,
          createdAt: message.created_at,
          user: {
            id: socket.user.id,
            username: socket.user.username,
            role: socket.user.role
          }
        };

        io.to(`stream:${streamId}`).emit('new-message', messageData);
        
        console.log(`Message sent by ${socket.user.username} in stream ${streamId}`);

      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle tips
    socket.on('send-tip', async (data) => {
      try {
        if (!socket.user) {
          socket.emit('error', { message: 'Authentication required' });
          return;
        }

        const { streamId, streamerId, amount, message, actionType, actionData } = data;

        // Rate limiting for tips
        const canTip = await rateLimitCheck(`tip:${socket.user.id}`, 50, 60);
        if (!canTip) {
          socket.emit('error', { message: 'Rate limit exceeded for tips' });
          return;
        }

        // Check if user has enough tokens
        const userResult = await query(
          'SELECT tokens_balance FROM users WHERE id = $1',
          [socket.user.id]
        );

        if (userResult.rows[0].tokens_balance < amount) {
          socket.emit('error', { message: 'Insufficient tokens' });
          return;
        }

        // Start transaction
        await query('BEGIN');

        try {
          // Deduct tokens from sender
          await query(
            'UPDATE users SET tokens_balance = tokens_balance - $1, total_tips_sent = total_tips_sent + $1 WHERE id = $2',
            [amount, socket.user.id]
          );

          // Add tokens to streamer
          await query(
            'UPDATE users SET tokens_balance = tokens_balance + $1, total_tips_earned = total_tips_earned + $1 WHERE id = $2',
            [amount, streamerId]
          );

          // Create tip record
          const tipResult = await query(`
            INSERT INTO tips (from_user_id, to_streamer_id, stream_id, amount, message, action_type, action_data)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, created_at
          `, [socket.user.id, streamerId, streamId, amount, message, actionType, JSON.stringify(actionData || {})]);

          // Update stream total tips
          await query(
            'UPDATE streams SET total_tips = total_tips + $1 WHERE id = $2',
            [amount, streamId]
          );

          await query('COMMIT');

          const tip = tipResult.rows[0];
          
          // Broadcast tip to stream
          const tipData = {
            id: tip.id,
            amount,
            message,
            actionType,
            actionData,
            createdAt: tip.created_at,
            from: {
              id: socket.user.id,
              username: socket.user.username
            }
          };

          // Special message for the tip
          const tipMessage = `💥 ${socket.user.username} tipped ${amount} CULT tokens!${message ? ` "${message}"` : ''}`;
          
          io.to(`stream:${streamId}`).emit('new-message', {
            id: `tip-${tip.id}`,
            content: tipMessage,
            messageType: 'tip',
            createdAt: tip.created_at,
            tip: tipData
          });

          // Notify streamer privately
          io.to(`streamer:${streamerId}`).emit('tip-received', tipData);

          console.log(`Tip of ${amount} tokens sent by ${socket.user.username}`);

        } catch (error) {
          await query('ROLLBACK');
          throw error;
        }

      } catch (error) {
        console.error('Send tip error:', error);
        socket.emit('error', { message: 'Failed to send tip' });
      }
    });

    // Handle streamer going live/offline
    socket.on('stream-status', async (data) => {
      try {
        if (!socket.user || socket.user.role !== 'streamer') {
          socket.emit('error', { message: 'Streamer role required' });
          return;
        }

        const { streamId, status, streamKey, rtmpUrl } = data;

        if (status === 'start') {
          // Start streaming
          await query(
            'UPDATE streams SET is_live = true, start_time = CURRENT_TIMESTAMP, stream_key = $1, rtmp_url = $2 WHERE id = $3',
            [streamKey, rtmpUrl, streamId]
          );

          // Join streamer room for private notifications
          await socket.join(`streamer:${socket.user.id}`);

          // Notify that stream is live
          io.emit('stream-live', {
            streamId,
            streamerId: socket.user.id,
            streamerName: socket.user.username
          });

          console.log(`Stream ${streamId} started by ${socket.user.username}`);

        } else if (status === 'stop') {
          // Stop streaming
          await query(
            'UPDATE streams SET is_live = false, end_time = CURRENT_TIMESTAMP WHERE id = $1',
            [streamId]
          );

          // Leave streamer room
          await socket.leave(`streamer:${socket.user.id}`);

          // Notify that stream is offline
          io.emit('stream-offline', {
            streamId,
            streamerId: socket.user.id
          });

          console.log(`Stream ${streamId} stopped by ${socket.user.username}`);
        }

      } catch (error) {
        console.error('Stream status error:', error);
        socket.emit('error', { message: 'Failed to update stream status' });
      }
    });

    // Handle private messages/whispers
    socket.on('send-whisper', async (data) => {
      try {
        if (!socket.user) {
          socket.emit('error', { message: 'Authentication required' });
          return;
        }

        const { targetUserId, streamId, content } = data;

        // Save whisper message
        const messageResult = await query(`
          INSERT INTO messages (stream_id, user_id, content, message_type)
          VALUES ($1, $2, $3, 'whisper')
          RETURNING id, created_at
        `, [streamId, socket.user.id, content]);

        const message = messageResult.rows[0];

        // Send whisper to target user
        io.to(`user:${targetUserId}`).emit('whisper-received', {
          id: message.id,
          content: content,
          createdAt: message.created_at,
          from: {
            id: socket.user.id,
            username: socket.user.username
          }
        });

        console.log(`Whisper sent from ${socket.user.username} to user ${targetUserId}`);

      } catch (error) {
        console.error('Send whisper error:', error);
        socket.emit('error', { message: 'Failed to send whisper' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.user?.username || 'Anonymous'} (${socket.id})`);
      
      // Clean up viewer counts for all streams this user was in
      for (const room of socket.rooms) {
        if (room.startsWith('stream:')) {
          const streamId = parseInt(room.split(':')[1]);
          const currentViewers = await getStreamViewers(streamId);
          const newViewerCount = Math.max(0, currentViewers - 1);
          await setStreamViewers(streamId, newViewerCount);
          
          // Update database
          await query(
            'UPDATE streams SET viewer_count = $1 WHERE id = $2',
            [newViewerCount, streamId]
          );
        }
      }
    });
  });
};

module.exports = { setupSocketHandlers };