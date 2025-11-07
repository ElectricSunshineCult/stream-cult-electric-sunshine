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
        experience_points BIGINT DEFAULT 0,
        level INTEGER DEFAULT 1,
        level_title VARCHAR(50) DEFAULT 'Newbie',
        total_spent BIGINT DEFAULT 0,
        total_earned BIGINT DEFAULT 0,
        watch_time_hours INTEGER DEFAULT 0,
        stream_time_hours INTEGER DEFAULT 0,
        badges JSONB DEFAULT '[]',
        achievements JSONB DEFAULT '[]',
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

    // User levels configuration table
    await query(`
      CREATE TABLE IF NOT EXISTS user_levels (
        id SERIAL PRIMARY KEY,
        level INTEGER NOT NULL UNIQUE,
        title VARCHAR(50) NOT NULL,
        experience_required BIGINT NOT NULL,
        badge_icon VARCHAR(100),
        perks JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Experience transactions table
    await query(`
      CREATE TABLE IF NOT EXISTS experience_transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount BIGINT NOT NULL,
        reason VARCHAR(100) NOT NULL,
        source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('token_purchase', 'tip_sent', 'tip_received', 'stream_watched', 'stream_streamed', 'referral_bonus', 'achievement', 'daily_bonus', 'level_up_bonus')),
        source_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Leaderboards table
    await query(`
      CREATE TABLE IF NOT EXISTS leaderboards (
        id SERIAL PRIMARY KEY,
        category VARCHAR(50) NOT NULL,
        period VARCHAR(20) NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly', 'all_time')),
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        score BIGINT NOT NULL,
        rank_position INTEGER,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(category, period, user_id)
      );
    `);

    // Achievements table
    await query(`
      CREATE TABLE IF NOT EXISTS achievements (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT NOT NULL,
        badge_icon VARCHAR(100),
        experience_reward BIGINT DEFAULT 100,
        requirements JSONB NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // User achievements tracking
    await query(`
      CREATE TABLE IF NOT EXISTS user_achievements (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        achievement_id INTEGER NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
        unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        progress JSONB DEFAULT '{}',
        is_completed BOOLEAN DEFAULT false,
        UNIQUE(user_id, achievement_id)
      );
    `);

    // Daily streaks and rewards
    await query(`
      CREATE TABLE IF NOT EXISTS user_streaks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        streak_type VARCHAR(20) NOT NULL CHECK (streak_type IN ('login', 'watch', 'tip')),
        current_streak INTEGER DEFAULT 0,
        longest_streak INTEGER DEFAULT 0,
        last_activity_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, streak_type)
      );
    `);

    // Performance and analytics tracking
    await query(`
      CREATE TABLE IF NOT EXISTS user_analytics (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        watch_time_minutes INTEGER DEFAULT 0,
        tokens_spent BIGINT DEFAULT 0,
        tokens_earned BIGINT DEFAULT 0,
        messages_sent INTEGER DEFAULT 0,
        tips_sent_count INTEGER DEFAULT 0,
        tips_received_count INTEGER DEFAULT 0,
        experience_gained BIGINT DEFAULT 0,
        sessions_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, date)
      );
    `);

    console.log('✅ Database tables created successfully');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  }
};

module.exports = { createTables };