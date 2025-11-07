import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Crown, Zap, Gift, Settings, Shield, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GuestStreamer {
  id: string;
  host_streamer_id: string;
  guest_id: string;
  session_id: string;
  status: 'pending' | 'accepted' | 'active' | 'ended' | 'declined';
  can_raiders: boolean;
  tipping_enabled: boolean;
  tip_split_percentage: number;
  started_at: string;
  ended_at?: string;
  guest_info?: {
    username: string;
    avatar_url?: string;
    follower_count: number;
    is_verified: boolean;
  };
}

interface Raid {
  id: string;
  raider_id: string;
  target_streamer_id: string;
  session_id: string;
  follower_count: number;
  tip_count: number;
  total_tip_amount: number;
  status: 'active' | 'completed' | 'cancelled';
  started_at: string;
  ended_at?: string;
  raider_info?: {
    username: string;
    avatar_url?: string;
  };
}

interface GuestStreamerManagerProps {
  userId: string;
  isHost: boolean;
  currentSessionId?: string;
  onGuestJoin?: (guest: GuestStreamer) => void;
  onRaidStart?: (raid: Raid) => void;
}

const GuestStreamerManager: React.FC<GuestStreamerManagerProps> = ({
  userId,
  isHost,
  currentSessionId,
  onGuestJoin,
  onRaidStart
}) => {
  const [activeGuests, setActiveGuests] = useState<GuestStreamer[]>([]);
  const [pendingInvites, setPendingInvites] = useState<GuestStreamer[]>([]);
  const [recentRaids, setRecentRaids] = useState<Raid[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRaidModal, setShowRaidModal] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [raidTarget, setRaidTarget] = useState('');
  const [tipSplitPercentage, setTipSplitPercentage] = useState(50);
  const [canRaiders, setCanRaiders] = useState(true);
  const [tippingEnabled, setTippingEnabled] = useState(true);

  useEffect(() => {
    if (currentSessionId) {
      loadSessionData();
    }
  }, [userId, currentSessionId]);

  const loadSessionData = async () => {
    try {
      setIsLoading(true);
      
      // Load active guests
      const guestsResponse = await fetch(`/api/guests/active/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (guestsResponse.ok) {
        const guestsData = await guestsResponse.json();
        setActiveGuests(guestsData);
      }

      // Load pending invites
      const invitesResponse = await fetch(`/api/guests/pending/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (invitesResponse.ok) {
        const invitesData = await invitesResponse.json();
        setPendingInvites(invitesData);
      }

      // Load recent raids
      const raidsResponse = await fetch(`/api/raids/recent/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (raidsResponse.ok) {
        const raidsData = await raidsResponse.json();
        setRecentRaids(raidsData);
      }
    } catch (error) {
      console.error('Failed to load session data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendGuestInvite = async () => {
    try {
      if (!inviteUsername.trim()) return;
      
      setIsLoading(true);
      const response = await fetch('/api/guests/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          host_streamer_id: userId,
          guest_username: inviteUsername,
          session_id: currentSessionId,
          can_raiders: canRaiders,
          tipping_enabled: tippingEnabled,
          tip_split_percentage: tipSplitPercentage
        })
      });

      if (response.ok) {
        const invite = await response.json();
        setPendingInvites(prev => [...prev, invite]);
        setInviteUsername('');
        setShowInviteModal(false);
        
        // Show success toast
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg z-50';
        toast.textContent = `Guest invite sent to ${invite.guest_info?.username}!`;
        document.body.appendChild(toast);
        setTimeout(() => document.body.removeChild(toast), 3000);
      }
    } catch (error) {
      console.error('Failed to send guest invite:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const acceptGuestInvite = async (inviteId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/guests/accept/${inviteId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const guest = await response.json();
        setActiveGuests(prev => [...prev, guest]);
        setPendingInvites(prev => prev.filter(invite => invite.id !== inviteId));
        onGuestJoin?.(guest);
      }
    } catch (error) {
      console.error('Failed to accept guest invite:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const declineGuestInvite = async (inviteId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/guests/decline/${inviteId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setPendingInvites(prev => prev.filter(invite => invite.id !== inviteId));
      }
    } catch (error) {
      console.error('Failed to decline guest invite:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const endGuestSession = async (guestId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/guests/end/${guestId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setActiveGuests(prev => prev.filter(guest => guest.id !== guestId));
      }
    } catch (error) {
      console.error('Failed to end guest session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startRaid = async () => {
    try {
      if (!raidTarget.trim()) return;
      
      setIsLoading(true);
      const response = await fetch('/api/raids/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          raider_id: userId,
          target_username: raidTarget,
          session_id: currentSessionId
        })
      });

      if (response.ok) {
        const raid = await response.json();
        setRecentRaids(prev => [raid, ...prev.slice(0, 4)]);
        setRaidTarget('');
        setShowRaidModal(false);
        onRaidStart?.(raid);
      }
    } catch (error) {
      console.error('Failed to start raid:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-500';
      case 'pending': return 'text-yellow-500';
      case 'accepted': return 'text-blue-500';
      case 'ended': return 'text-gray-500';
      case 'declined': return 'text-red-500';
      default: return 'text-gray-400';
    }
  };

  const formatTipSplit = (percentage: number) => {
    return `${percentage}% / ${100 - percentage}%`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Users className="w-5 h-5" />
          Guest Streamers
        </h3>
        {isHost && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
            >
              Invite Guest
            </button>
            <button
              onClick={() => setShowRaidModal(true)}
              className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
            >
              Start Raid
            </button>
          </div>
        )}
      </div>

      {/* Active Guests */}
      {activeGuests.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <Crown className="w-4 h-4 text-yellow-500" />
            Active Guests ({activeGuests.length})
          </h4>
          <div className="space-y-3">
            {activeGuests.map((guest) => (
              <div key={guest.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-medium text-white">
                      {guest.guest_info?.username || 'Unknown Guest'}
                    </div>
                    <div className="text-sm text-gray-400">
                      Split: {formatTipSplit(guest.tip_split_percentage)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {guest.can_raiders && (
                    <div className="p-1 bg-orange-500 rounded" title="Can raiders">
                      <Zap className="w-3 h-3 text-white" />
                    </div>
                  )}
                  {guest.tipping_enabled && (
                    <div className="p-1 bg-green-500 rounded" title="Tipping enabled">
                      <Gift className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <div className={`text-xs font-medium ${getStatusColor(guest.status)}`}>
                    {guest.status}
                  </div>
                  {isHost && (
                    <button
                      onClick={() => endGuestSession(guest.id)}
                      className="p-1 text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-yellow-500" />
            Pending Invites ({pendingInvites.length})
          </h4>
          <div className="space-y-3">
            {pendingInvites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-medium text-white">
                      {invite.guest_info?.username || 'Unknown User'}
                    </div>
                    <div className="text-sm text-gray-400">
                      Host invited you
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => acceptGuestInvite(invite.id)}
                    disabled={isLoading}
                    className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white text-xs rounded transition-colors"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => declineGuestInvite(invite.id)}
                    disabled={isLoading}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white text-xs rounded transition-colors"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Raids */}
      {recentRaids.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-500" />
            Recent Raids
          </h4>
          <div className="space-y-2">
            {recentRaids.slice(0, 5).map((raid) => (
              <div key={raid.id} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                <div>
                  <div className="text-sm text-white">
                    Raided: {raid.raider_info?.username || 'Unknown'}
                  </div>
                  <div className="text-xs text-gray-400">
                    {raid.follower_count} followers • {raid.total_tip_amount} tips
                  </div>
                </div>
                <div className={`text-xs font-medium ${getStatusColor(raid.status)}`}>
                  {raid.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {activeGuests.length === 0 && pendingInvites.length === 0 && !isLoading && (
        <div className="text-center py-8 text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No guest streamers yet</p>
          {isHost && (
            <p className="text-sm">Invite other streamers to join your stream</p>
          )}
        </div>
      )}

      {/* Invite Guest Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gray-900 rounded-lg p-6 w-full max-w-md"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Invite Guest Streamer</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Username</label>
                  <input
                    type="text"
                    value={inviteUsername}
                    onChange={(e) => setInviteUsername(e.target.value)}
                    placeholder="Enter username to invite"
                    className="w-full p-2 bg-gray-800 text-white border border-gray-600 rounded-lg"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-300 mb-2">
                    Tip Split ({tipSplitPercentage}% / {100 - tipSplitPercentage}%)
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="90"
                    value={tipSplitPercentage}
                    onChange={(e) => setTipSplitPercentage(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={canRaiders}
                      onChange={(e) => setCanRaiders(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-300">Allow raiders</span>
                  </label>
                  
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={tippingEnabled}
                      onChange={(e) => setTippingEnabled(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-300">Enable tipping</span>
                  </label>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={sendGuestInvite}
                  disabled={isLoading || !inviteUsername.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  {isLoading ? 'Sending...' : 'Send Invite'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Start Raid Modal */}
      <AnimatePresence>
        {showRaidModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gray-900 rounded-lg p-6 w-full max-w-md"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Start Raid</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Target Streamer</label>
                  <input
                    type="text"
                    value={raidTarget}
                    onChange={(e) => setRaidTarget(e.target.value)}
                    placeholder="Enter target streamer username"
                    className="w-full p-2 bg-gray-800 text-white border border-gray-600 rounded-lg"
                  />
                </div>
                
                <div className="p-3 bg-gray-800 rounded-lg">
                  <p className="text-sm text-gray-300">
                    A raid will redirect your viewers to the target streamer's channel, 
                    potentially bringing new viewers and tips.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowRaidModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={startRaid}
                  disabled={isLoading || !raidTarget.trim()}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  {isLoading ? 'Starting...' : 'Start Raid'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GuestStreamerManager;