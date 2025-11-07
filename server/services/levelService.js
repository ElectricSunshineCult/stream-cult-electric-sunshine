const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class LevelService {
  /**
   * Calculate user level based on experience points
   */
  static async calculateUserLevel(experiencePoints) {
    try {
      const result = await query(`
        SELECT level, title, badge_icon, experience_required
        FROM user_levels
        WHERE experience_required <= $1
        ORDER BY level DESC
        LIMIT 1
      `, [experiencePoints]);

      if (result.rows.length === 0) {
        // Default to level 1 if no level found
        return { level: 1, title: 'Newbie', badge_icon: '🥉', experience_required: 0 };
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error calculating user level:', error);
      return { level: 1, title: 'Newbie', badge_icon: '🥉', experience_required: 0 };
    }
  }

  /**
   * Add experience points to a user
   */
  static async addExperience(userId, amount, reason, sourceType, sourceId = null) {
    const client = await require('../config/database').pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get current user data
      const userResult = await client.query(
        'SELECT experience_points, level FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const currentExp = userResult.rows[0].experience_points;
      const newExp = currentExp + amount;

      // Record the experience transaction
      await client.query(`
        INSERT INTO experience_transactions (user_id, amount, reason, source_type, source_id)
        VALUES ($1, $2, $3, $4, $5)
      `, [userId, amount, reason, sourceType, sourceId]);

      // Calculate new level
      const newLevel = await this.calculateUserLevel(newExp);

      // Update user level if it changed
      if (newLevel.level !== userResult.rows[0].level) {
        await client.query(`
          UPDATE users 
          SET experience_points = $1, level = $2, level_title = $3, updated_at = CURRENT_TIMESTAMP
          WHERE id = $4
        `, [newExp, newLevel.level, newLevel.title, userId]);

        // Award level-up bonus
        const levelUpBonus = newLevel.level * 100;
        await this.addExperience(userId, levelUpBonus, `Level ${newLevel.level} reached`, 'level_up_bonus', null);
      } else {
        await client.query(`
          UPDATE users 
          SET experience_points = $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [newExp, userId]);
      }

      await client.query('COMMIT');
      return { newExp, level: newLevel.level, title: newLevel.title, bonusAwarded: newLevel.level !== userResult.rows[0].level };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error adding experience:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get user level information
   */
  static async getUserLevelInfo(userId) {
    try {
      const result = await query(`
        SELECT u.experience_points, u.level, u.level_title, ul.badge_icon, ul.experience_required as next_level_exp,
               CASE 
                 WHEN ul_next.experience_required IS NULL THEN 0
                 ELSE ul_next.experience_required - u.experience_points
               END as exp_to_next_level
        FROM users u
        LEFT JOIN user_levels ul ON u.level = ul.level
        LEFT JOIN user_levels ul_next ON u.level + 1 = ul_next.level
        WHERE u.id = $1
      `, [userId]);

      return result.rows[0] || { experience_points: 0, level: 1, level_title: 'Newbie', badge_icon: '🥉', exp_to_next_level: 100 };
    } catch (error) {
      console.error('Error getting user level info:', error);
      return { experience_points: 0, level: 1, level_title: 'Newbie', badge_icon: '🥉', exp_to_next_level: 100 };
    }
  }

  /**
   * Award experience for token purchase
   */
  static async awardTokenPurchaseExperience(userId, tokenAmount, purchaseId) {
    const expGained = Math.floor(tokenAmount / 10); // 1 exp per 10 tokens spent
    return await this.addExperience(
      userId, 
      expGained, 
      `Token purchase: ${tokenAmount} tokens`, 
      'token_purchase', 
      purchaseId
    );
  }

  /**
   * Award experience for tipping
   */
  static async awardTipExperience(fromUserId, toUserId, tipAmount, tipId) {
    // Experience for sending tip (based on amount)
    const fromExp = Math.floor(tipAmount / 5);
    await this.addExperience(
      fromUserId, 
      fromExp, 
      `Sent tip: ${tipAmount} tokens`, 
      'tip_sent', 
      tipId
    );

    // Experience for receiving tip (smaller amount)
    const toExp = Math.floor(tipAmount / 20);
    await this.addExperience(
      toUserId, 
      toExp, 
      `Received tip: ${tipAmount} tokens`, 
      'tip_received', 
      tipId
    );
  }

  /**
   * Award experience for watching streams
   */
  static async awardWatchExperience(userId, watchTimeMinutes, streamId) {
    const expGained = Math.floor(watchTimeMinutes / 30); // 1 exp per 30 minutes watched
    if (expGained > 0) {
      return await this.addExperience(
        userId, 
        expGained, 
        `Watched ${watchTimeMinutes} minutes`, 
        'stream_watched', 
        streamId
      );
    }
    return null;
  }

  /**
   * Award experience for streaming
   */
  static async awardStreamExperience(streamerId, streamTimeMinutes, streamId) {
    const expGained = Math.floor(streamTimeMinutes / 10); // 1 exp per 10 minutes streamed
    if (expGained > 0) {
      return await this.addExperience(
        streamerId, 
        expGained, 
        `Streamed ${streamTimeMinutes} minutes`, 
        'stream_streamed', 
        streamId
      );
    }
    return null;
  }

  /**
   * Get leaderboard for a specific category and period
   */
  static async getLeaderboard(category = 'experience', period = 'weekly', limit = 50) {
    try {
      let orderBy = 'score DESC';
      let timeCondition = '';

      switch (period) {
        case 'daily':
          timeCondition = "AND created_at >= CURRENT_DATE";
          break;
        case 'weekly':
          timeCondition = "AND created_at >= CURRENT_DATE - INTERVAL '7 days'";
          break;
        case 'monthly':
          timeCondition = "AND created_at >= CURRENT_DATE - INTERVAL '30 days'";
          break;
        case 'all_time':
          timeCondition = '';
          break;
      }

      const query = `
        SELECT 
          lb.user_id,
          u.username,
          u.avatar_url,
          u.level,
          u.level_title,
          u.badge_icon,
          lb.score,
          lb.rank_position
        FROM leaderboards lb
        JOIN users u ON lb.user_id = u.id
        WHERE lb.category = $1 AND lb.period = $2 ${timeCondition}
        ORDER BY lb.score DESC
        LIMIT $3
      `;

      const result = await query(query, [category, period, limit]);
      return result.rows;
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      return [];
    }
  }

  /**
   * Update leaderboard scores
   */
  static async updateLeaderboards() {
    const categories = ['experience', 'tokens_spent', 'tokens_earned', 'watch_time', 'stream_time'];
    const periods = ['daily', 'weekly', 'monthly', 'all_time'];

    for (const category of categories) {
      for (const period of periods) {
        await this.updateCategoryLeaderboard(category, period);
      }
    }
  }

  /**
   * Update a specific category leaderboard
   */
  static async updateCategoryLeaderboard(category, period) {
    const client = await require('../config/database').pool.connect();
    
    try {
      await client.query('BEGIN');

      let scoreQuery = '';
      let timeCondition = '';

      switch (period) {
        case 'daily':
          timeCondition = "WHERE date >= CURRENT_DATE";
          break;
        case 'weekly':
          timeCondition = "WHERE date >= CURRENT_DATE - INTERVAL '7 days'";
          break;
        case 'monthly':
          timeCondition = "WHERE date >= CURRENT_DATE - INTERVAL '30 days'";
          break;
        case 'all_time':
          timeCondition = '';
          break;
      }

      switch (category) {
        case 'experience':
          scoreQuery = `
            SELECT user_id, SUM(experience_gained) as score
            FROM user_analytics
            ${timeCondition}
            GROUP BY user_id
          `;
          break;
        case 'tokens_spent':
          scoreQuery = `
            SELECT user_id, SUM(tokens_spent) as score
            FROM user_analytics
            ${timeCondition}
            GROUP BY user_id
          `;
          break;
        case 'tokens_earned':
          scoreQuery = `
            SELECT user_id, SUM(tokens_earned) as score
            FROM user_analytics
            ${timeCondition}
            GROUP BY user_id
          `;
          break;
        case 'watch_time':
          scoreQuery = `
            SELECT user_id, SUM(watch_time_minutes) as score
            FROM user_analytics
            ${timeCondition}
            GROUP BY user_id
          `;
          break;
        case 'stream_time':
          scoreQuery = `
            SELECT user_id, SUM(stream_time_minutes) as score
            FROM user_analytics
            ${timeCondition}
            GROUP BY user_id
          `;
          break;
      }

      const scoreResult = await client.query(scoreQuery);
      
      // Clear existing leaderboard entries for this category and period
      await client.query(
        'DELETE FROM leaderboards WHERE category = $1 AND period = $2',
        [category, period]
      );

      // Insert new leaderboard entries
      for (let i = 0; i < scoreResult.rows.length; i++) {
        const row = scoreResult.rows[i];
        await client.query(`
          INSERT INTO leaderboards (category, period, user_id, score, rank_position)
          VALUES ($1, $2, $3, $4, $5)
        `, [category, period, row.user_id, row.score || 0, i + 1]);
      }

      await client.query('COMMIT');
      console.log(`✅ Updated ${category} leaderboard for ${period} period`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Error updating ${category} leaderboard:`, error);
    } finally {
      client.release();
    }
  }

  /**
   * Check and award achievements
   */
  static async checkAchievements(userId) {
    try {
      // Get user stats
      const userStats = await query(`
        SELECT 
          u.level,
          u.total_spent,
          u.tokens_earned,
          u.watch_time_hours,
          u.tokens_earned,
          COUNT(t.id) as tips_sent_count,
          COUNT(t2.id) as tips_received_count,
          COUNT(m.id) as messages_count
        FROM users u
        LEFT JOIN tips t ON u.id = t.from_user_id
        LEFT JOIN tips t2 ON u.id = t2.to_streamer_id
        LEFT JOIN messages m ON u.id = m.user_id
        WHERE u.id = $1
        GROUP BY u.id, u.level, u.total_spent, u.tokens_earned, u.watch_time_hours, u.tokens_earned
      `, [userId]);

      if (userStats.rows.length === 0) return [];

      const stats = userStats.rows[0];
      const newAchievements = [];

      // Get all achievements
      const achievements = await query('SELECT * FROM achievements WHERE is_active = true');
      
      for (const achievement of achievements.rows) {
        // Check if user already has this achievement
        const existing = await query(
          'SELECT id FROM user_achievements WHERE user_id = $1 AND achievement_id = $2',
          [userId, achievement.id]
        );

        if (existing.rows.length > 0) continue;

        // Check requirements
        const requirements = JSON.parse(achievement.requirements);
        let qualifies = true;

        if (requirements.user_level && stats.level < requirements.user_level) qualifies = false;
        if (requirements.total_spent && stats.total_spent < requirements.total_spent) qualifies = false;
        if (requirements.tips_sent && stats.tips_sent_count < requirements.tips_sent) qualifies = false;
        if (requirements.tips_received && stats.tips_received_count < requirements.tips_received) qualifies = false;
        if (requirements.messages_sent && stats.messages_count < requirements.messages_sent) qualifies = false;
        if (requirements.watch_time_hours && stats.watch_time_hours < requirements.watch_time_hours) qualifies = false;

        if (qualifies) {
          // Award achievement
          await query(`
            INSERT INTO user_achievements (user_id, achievement_id, is_completed)
            VALUES ($1, $2, $3)
          `, [userId, achievement.id, true]);

          // Award experience
          await this.addExperience(
            userId, 
            achievement.experience_reward, 
            `Achievement: ${achievement.name}`, 
            'achievement', 
            achievement.id
          );

          newAchievements.push(achievement);
        }
      }

      return newAchievements;
    } catch (error) {
      console.error('Error checking achievements:', error);
      return [];
    }
  }
}

module.exports = LevelService;