const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { auditLog } = require('../services/analyticsService');

// Get active guest streamers for a host
router.get('/active/:hostId', authenticateToken, async (req, res) => {
  try {
    const { hostId } = req.params;
    
    // Check if user can view these guests
    if (req.user.id !== hostId && !req.user.is_admin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const db = req.app.get('db');
    
    const activeGuestsQuery = `
      SELECT 
        gs.*,
        u.username,
        u.email,
        u.is_verified,
        u.avatar_url
      FROM guest_streamers gs
      JOIN users u ON gs.guest_id = u.id
      WHERE gs.host_streamer_id = $1 
        AND gs.status = 'active'
      ORDER BY gs.started_at DESC
    `;
    
    const result = await db.query(activeGuestsQuery, [hostId]);
    
    // Format the response
    const guests = result.rows.map(guest => ({
      id: guest.id,
      host_streamer_id: guest.host_streamer_id,
      guest_id: guest.guest_id,
      session_id: guest.session_id,
      status: guest.status,
      can_raiders: guest.can_raiders,
      tipping_enabled: guest.tipping_enabled,
      tip_split_percentage: guest.tip_split_percentage,
      started_at: guest.started_at,
      ended_at: guest.ended_at,
      guest_info: {
        username: guest.username,
        email: guest.email,
        follower_count: guest.follower_count || 0,
        is_verified: guest.is_verified,
        avatar_url: guest.avatar_url
      }
    }));
    
    res.json(guests);
  } catch (error) {
    console.error('Error fetching active guest streamers:', error);
    res.status(500).json({ error: 'Failed to fetch active guest streamers' });
  }
});

// Get pending guest invites for a user
router.get('/pending/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if user can view their pending invites
    if (req.user.id !== userId && !req.user.is_admin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const db = req.app.get('db');
    
    const pendingInvitesQuery = `
      SELECT 
        gs.*,
        u.username,
        u.email,
        u.is_verified,
        u.avatar_url
      FROM guest_streamers gs
      JOIN users u ON gs.host_streamer_id = u.id
      WHERE gs.guest_id = $1 
        AND gs.status = 'pending'
      ORDER BY gs.started_at DESC
    `;
    
    const result = await db.query(pendingInvitesQuery, [userId]);
    
    // Format the response
    const invites = result.rows.map(invite => ({
      id: invite.id,
      host_streamer_id: invite.host_streamer_id,
      guest_id: invite.guest_id,
      session_id: invite.session_id,
      status: invite.status,
      can_raiders: invite.can_raiders,
      tipping_enabled: invite.tipping_enabled,
      tip_split_percentage: invite.tip_split_percentage,
      started_at: invite.started_at,
      ended_at: invite.ended_at,
      host_info: {
        username: invite.username,
        email: invite.email,
        is_verified: invite.is_verified,
        avatar_url: invite.avatar_url
      }
    }));
    
    res.json(invites);
  } catch (error) {
    console.error('Error fetching pending guest invites:', error);
    res.status(500).json({ error: 'Failed to fetch pending guest invites' });
  }
});

// Send guest invite
router.post('/invite', authenticateToken, async (req, res) => {
  try {
    const {
      host_streamer_id,
      guest_username,
      session_id,
      can_raiders = true,
      tipping_enabled = true,
      tip_split_percentage = 50
    } = req.body;
    
    // Check if user is the host
    if (req.user.id !== host_streamer_id) {
      return res.status(403).json({ error: 'Only the host can send invites' });
    }

    const db = req.app.get('db');
    
    // Get guest user by username
    const guestQuery = 'SELECT id, username, is_verified FROM users WHERE username = $1';
    const guestResult = await db.query(guestQuery, [guest_username]);
    
    if (guestResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const guest = guestResult.rows[0];
    
    // Check if guest is already invited or active
    const existingQuery = `
      SELECT * FROM guest_streamers 
      WHERE (host_streamer_id = $1 AND guest_id = $2 AND status IN ('pending', 'active'))
         OR (host_streamer_id = $1 AND guest_id = $2 AND session_id = $3)
    `;
    
    const existingResult = await db.query(existingQuery, [host_streamer_id, guest.id, session_id]);
    
    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: 'Guest is already invited or active' });
    }
    
    // Create guest invite
    const insertQuery = `
      INSERT INTO guest_streamers (
        host_streamer_id, guest_id, session_id, status, 
        can_raiders, tipping_enabled, tip_split_percentage
      ) VALUES ($1, $2, $3, 'pending', $4, $5, $6)
      RETURNING *
    `;
    
    const insertResult = await db.query(insertQuery, [
      host_streamer_id,
      guest.id,
      session_id,
      can_raiders,
      tipping_enabled,
      tip_split_percentage
    ]);
    
    const invite = insertResult.rows[0];
    
    // Log the invite
    await auditLog(req.user.id, 'guest_invite_sent', 'guest_streamers', invite.id, {
      host_streamer_id,
      guest_id: guest.id,
      guest_username,
      session_id,
      settings: {
        can_raiders,
        tipping_enabled,
        tip_split_percentage
      }
    }, req.ip, req.get('User-Agent'));
    
    // Format response
    const response = {
      ...invite,
      guest_info: {
        username: guest.username,
        follower_count: 0,
        is_verified: guest.is_verified
      }
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error sending guest invite:', error);
    res.status(500).json({ error: 'Failed to send guest invite' });
  }
});

// Accept guest invite
router.post('/accept/:inviteId', authenticateToken, async (req, res) => {
  try {
    const { inviteId } = req.params;
    
    const db = req.app.get('db');
    
    // Get the invite
    const inviteQuery = 'SELECT * FROM guest_streamers WHERE id = $1';
    const inviteResult = await db.query(inviteQuery, [inviteId]);
    
    if (inviteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invite not found' });
    }
    
    const invite = inviteResult.rows[0];
    
    // Check if user is the invited guest
    if (req.user.id !== invite.guest_id) {
      return res.status(403).json({ error: 'Only the invited guest can accept' });
    }
    
    // Check if invite is still pending
    if (invite.status !== 'pending') {
      return res.status(400).json({ error: 'Invite is no longer pending' });
    }
    
    // Update invite status
    const updateQuery = `
      UPDATE guest_streamers 
      SET status = 'active', started_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const updateResult = await db.query(updateQuery, [inviteId]);
    const acceptedInvite = updateResult.rows[0];
    
    // Get user info for response
    const userQuery = 'SELECT username, is_verified FROM users WHERE id = $1';
    const userResult = await db.query(userQuery, [invite.guest_id]);
    const user = userResult.rows[0];
    
    // Log the acceptance
    await auditLog(req.user.id, 'guest_invite_accepted', 'guest_streamers', inviteId, {
      host_streamer_id: invite.host_streamer_id,
      guest_id: invite.guest_id,
      session_id: invite.session_id
    }, req.ip, req.get('User-Agent'));
    
    // Format response
    const response = {
      ...acceptedInvite,
      guest_info: {
        username: user.username,
        follower_count: 0,
        is_verified: user.is_verified
      }
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error accepting guest invite:', error);
    res.status(500).json({ error: 'Failed to accept guest invite' });
  }
});

// Decline guest invite
router.post('/decline/:inviteId', authenticateToken, async (req, res) => {
  try {
    const { inviteId } = req.params;
    
    const db = req.app.get('db');
    
    // Get the invite
    const inviteQuery = 'SELECT * FROM guest_streamers WHERE id = $1';
    const inviteResult = await db.query(inviteQuery, [inviteId]);
    
    if (inviteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invite not found' });
    }
    
    const invite = inviteResult.rows[0];
    
    // Check if user is the invited guest
    if (req.user.id !== invite.guest_id) {
      return res.status(403).json({ error: 'Only the invited guest can decline' });
    }
    
    // Check if invite is still pending
    if (invite.status !== 'pending') {
      return res.status(400).json({ error: 'Invite is no longer pending' });
    }
    
    // Update invite status
    const updateQuery = `
      UPDATE guest_streamers 
      SET status = 'declined', ended_at = NOW()
      WHERE id = $1
    `;
    
    await db.query(updateQuery, [inviteId]);
    
    // Log the decline
    await auditLog(req.user.id, 'guest_invite_declined', 'guest_streamers', inviteId, {
      host_streamer_id: invite.host_streamer_id,
      guest_id: invite.guest_id,
      session_id: invite.session_id
    }, req.ip, req.get('User-Agent'));
    
    res.json({ message: 'Invite declined successfully' });
  } catch (error) {
    console.error('Error declining guest invite:', error);
    res.status(500).json({ error: 'Failed to decline guest invite' });
  }
});

// End guest session
router.post('/end/:guestId', authenticateToken, async (req, res) => {
  try {
    const { guestId } = req.params;
    
    const db = req.app.get('db');
    
    // Get the guest session
    const guestQuery = 'SELECT * FROM guest_streamers WHERE id = $1';
    const guestResult = await db.query(guestQuery, [guestId]);
    
    if (guestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Guest session not found' });
    }
    
    const guest = guestResult.rows[0];
    
    // Check if user is the host or the guest
    if (req.user.id !== guest.host_streamer_id && req.user.id !== guest.guest_id && !req.user.is_admin) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Check if session is active
    if (guest.status !== 'active') {
      return res.status(400).json({ error: 'Session is not active' });
    }
    
    // End the session
    const updateQuery = `
      UPDATE guest_streamers 
      SET status = 'ended', ended_at = NOW()
      WHERE id = $1
    `;
    
    await db.query(updateQuery, [guestId]);
    
    // Log the end
    await auditLog(req.user.id, 'guest_session_ended', 'guest_streamers', guestId, {
      host_streamer_id: guest.host_streamer_id,
      guest_id: guest.guest_id,
      session_id: guest.session_id,
      duration: guest.ended_at ? guest.ended_at - guest.started_at : null
    }, req.ip, req.get('User-Agent'));
    
    res.json({ message: 'Guest session ended successfully' });
  } catch (error) {
    console.error('Error ending guest session:', error);
    res.status(500).json({ error: 'Failed to end guest session' });
  }
});

// Update guest session settings
router.put('/settings/:guestId', authenticateToken, async (req, res) => {
  try {
    const { guestId } = req.params;
    const {
      can_raiders,
      tipping_enabled,
      tip_split_percentage
    } = req.body;
    
    const db = req.app.get('db');
    
    // Get the guest session
    const guestQuery = 'SELECT * FROM guest_streamers WHERE id = $1';
    const guestResult = await db.query(guestQuery, [guestId]);
    
    if (guestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Guest session not found' });
    }
    
    const guest = guestResult.rows[0];
    
    // Check if user is the host
    if (req.user.id !== guest.host_streamer_id) {
      return res.status(403).json({ error: 'Only the host can update settings' });
    }
    
    // Validate tip split percentage
    if (tip_split_percentage < 10 || tip_split_percentage > 90) {
      return res.status(400).json({ error: 'Tip split percentage must be between 10 and 90' });
    }
    
    // Update settings
    const updateQuery = `
      UPDATE guest_streamers 
      SET can_raiders = $1, tipping_enabled = $2, tip_split_percentage = $3
      WHERE id = $4
      RETURNING *
    `;
    
    const result = await db.query(updateQuery, [
      can_raiders,
      tipping_enabled,
      tip_split_percentage,
      guestId
    ]);
    
    const updatedGuest = result.rows[0];
    
    // Log the update
    await auditLog(req.user.id, 'guest_session_settings_updated', 'guest_streamers', guestId, {
      old_settings: {
        can_raiders: guest.can_raiders,
        tipping_enabled: guest.tipping_enabled,
        tip_split_percentage: guest.tip_split_percentage
      },
      new_settings: {
        can_raiders,
        tipping_enabled,
        tip_split_percentage
      }
    }, req.ip, req.get('User-Agent'));
    
    res.json(updatedGuest);
  } catch (error) {
    console.error('Error updating guest session settings:', error);
    res.status(500).json({ error: 'Failed to update guest session settings' });
  }
});

// Get guest session analytics
router.get('/analytics/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const db = req.app.get('db');
    
    // Get session analytics
    const analyticsQuery = `
      SELECT 
        gs.*,
        u.username as host_username,
        g.username as guest_username
      FROM guest_streamers gs
      JOIN users u ON gs.host_streamer_id = u.id
      JOIN users g ON gs.guest_id = g.id
      WHERE gs.session_id = $1
    `;
    
    const result = await db.query(analyticsQuery, [sessionId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    const session = result.rows[0];
    
    // Check if user has access to this session
    if (req.user.id !== session.host_streamer_id && 
        req.user.id !== session.guest_id && 
        !req.user.is_admin) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Calculate session duration
    const startTime = new Date(session.started_at);
    const endTime = session.ended_at ? new Date(session.ended_at) : new Date();
    const duration = Math.floor((endTime - startTime) / 1000); // seconds
    
    const analytics = {
      session_id: sessionId,
      host: {
        id: session.host_streamer_id,
        username: session.host_username
      },
      guest: {
        id: session.guest_id,
        username: session.guest_username
      },
      status: session.status,
      duration: duration,
      settings: {
        can_raiders: session.can_raiders,
        tipping_enabled: session.tipping_enabled,
        tip_split_percentage: session.tip_split_percentage
      },
      timestamps: {
        started_at: session.started_at,
        ended_at: session.ended_at
      }
    };
    
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching guest session analytics:', error);
    res.status(500).json({ error: 'Failed to fetch guest session analytics' });
  }
});

module.exports = router;