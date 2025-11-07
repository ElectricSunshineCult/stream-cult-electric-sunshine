const { query } = require('../config/database');

const createTables = async () => {
  try {
    // Enable UUID extension
    await query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    
    // Regions table
    await query(`
      CREATE TABLE IF NOT EXISTS regions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(10) NOT NULL UNIQUE,
        parent_id INTEGER REFERENCES regions(id),
        continent VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'viewer' CHECK (role IN ('viewer', 'streamer', 'moderator', 'admin')),
        region_id INTEGER REFERENCES regions(id),
        tokens_balance BIGINT DEFAULT 0,
        total_tips_earned BIGINT DEFAULT 0,
        total_tips_sent BIGINT DEFAULT 0,
        age_verified BOOLEAN DEFAULT false,
        is_banned BOOLEAN DEFAULT false,
        ban_reason TEXT,
        avatar_url TEXT,
        bio TEXT,
        is_streaming BOOLEAN DEFAULT false,
        verification_level INTEGER DEFAULT 0,
        referral_code VARCHAR(50) UNIQUE,
        referred_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Categories table
    await query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        nsfw_flag BOOLEAN DEFAULT false,
        icon_url TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Streams table
    await query(`
      CREATE TABLE IF NOT EXISTS streams (
        id SERIAL PRIMARY KEY,
        streamer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        category_id INTEGER REFERENCES categories(id),
        region_id INTEGER REFERENCES regions(id),
        is_nsfw BOOLEAN DEFAULT false,
        is_live BOOLEAN DEFAULT false,
        stream_key VARCHAR(100),
        rtmp_url VARCHAR(255),
        viewer_count INTEGER DEFAULT 0,
        max_viewers INTEGER DEFAULT 0,
        total_tips BIGINT DEFAULT 0,
        start_time TIMESTAMP,
        end_time TIMESTAMP,
        thumbnail_url TEXT,
        quality_settings JSONB DEFAULT '{}',
        language VARCHAR(10) DEFAULT 'en',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Tips table
    await query(`
      CREATE TABLE IF NOT EXISTS tips (
        id SERIAL PRIMARY KEY,
        from_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        to_streamer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        stream_id INTEGER REFERENCES streams(id) ON DELETE CASCADE,
        amount BIGINT NOT NULL,
        message TEXT,
        is_private BOOLEAN DEFAULT false,
        action_type VARCHAR(50),
        action_data JSONB,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Messages table
    await query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        stream_id INTEGER NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        message_type VARCHAR(20) DEFAULT 'chat' CHECK (message_type IN ('chat', 'tip', 'system', 'whisper')),
        is_deleted BOOLEAN DEFAULT false,
        is_moderated BOOLEAN DEFAULT false,
        reply_to_id INTEGER REFERENCES messages(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Moderation logs table
    await query(`
      CREATE TABLE IF NOT EXISTS moderation_logs (
        id SERIAL PRIMARY KEY,
        moderator_id INTEGER NOT NULL REFERENCES users(id),
        target_user_id INTEGER REFERENCES users(id),
        target_stream_id INTEGER REFERENCES streams(id),
        target_message_id INTEGER REFERENCES messages(id),
        action VARCHAR(50) NOT NULL,
        reason TEXT,
        duration_minutes INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // User sessions table
    await query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(255) NOT NULL,
        ip_address INET,
        user_agent TEXT,
        is_active BOOLEAN DEFAULT true,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Stream goals table
    await query(`
      CREATE TABLE IF NOT EXISTS stream_goals (
        id SERIAL PRIMARY KEY,
        streamer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        stream_id INTEGER NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        target_amount BIGINT NOT NULL,
        current_amount BIGINT DEFAULT 0,
        is_completed BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
      );
    `);

    // Stream rules table
    await query(`
      CREATE TABLE IF NOT EXISTS stream_rules (
        id SERIAL PRIMARY KEY,
        stream_id INTEGER NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
        rule_type VARCHAR(50) NOT NULL,
        rule_data JSONB NOT NULL,
        min_tip_amount BIGINT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // User follows table
    await query(`
      CREATE TABLE IF NOT EXISTS user_follows (
        id SERIAL PRIMARY KEY,
        follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        streamer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(follower_id, streamer_id)
      );
    `);

    // Transactions table
    await query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        type VARCHAR(30) NOT NULL CHECK (type IN ('purchase', 'tip_send', 'tip_receive', 'withdraw', 'bonus', 'penalty')),
        amount BIGINT NOT NULL,
        balance_before BIGINT,
        balance_after BIGINT,
        external_id VARCHAR(255),
        metadata JSONB,
        status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Database tables created successfully');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  }
};

module.exports = { createTables };