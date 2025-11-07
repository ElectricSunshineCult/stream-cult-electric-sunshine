import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  UserIcon,
  Cog6ToothIcon,
  LinkIcon,
  PhotoIcon,
  GiftIcon,
  ShieldCheckIcon,
  SwatchIcon
} from '@heroicons/react/24/outline';

// Import all new components
import StatusIndicator, { UserStatus } from '../components/ui/StatusIndicator';
import EnhancedProfile from '../components/ui/EnhancedProfile';
import CustomEmoteManager from '../components/ui/CustomEmoteManager';
import CustomUrlManager from '../components/ui/CustomUrlManager';
import OfflineTipSystem from '../components/ui/OfflineTipSystem';
import BlockedAccounts from '../components/ui/BlockedAccounts';
import ColorCustomization from '../components/ui/ColorCustomization';

interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  socialLinks: SocialLink[];
  goals: UserGoal[];
  friendsCount: number;
  isOnline: boolean;
  status: UserStatus;
  customUrl?: string;
  level: number;
  experience: number;
  totalTips: number;
  followerCount: number;
  followingCount: number;
}

interface SocialLink {
  id: string;
  platform: string;
  url: string;
  label: string;
}

interface UserGoal {
  id: string;
  title: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  isPublic: boolean;
  createdAt: string;
}

interface EnhancedProfilePageProps {
  userId: string;
  currentUserId: string;
  isOwner: boolean;
}

type TabType = 'profile' | 'emotes' | 'urls' | 'tips' | 'blocking' | 'customization' | 'settings';

const tabs = [
  { id: 'profile', label: 'Profile', icon: UserIcon },
  { id: 'emotes', label: 'Emotes', icon: PhotoIcon },
  { id: 'urls', label: 'URLs', icon: LinkIcon },
  { id: 'tips', label: 'Tips', icon: GiftIcon },
  { id: 'blocking', label: 'Blocking', icon: ShieldCheckIcon },
  { id: 'customization', label: 'Customization', icon: SwatchIcon },
  { id: 'settings', label: 'Settings', icon: Cog6ToothIcon }
];

export const EnhancedProfilePage: React.FC<EnhancedProfilePageProps> = ({
  userId,
  currentUserId,
  isOwner
}) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUserProfile();
  }, [userId]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      // TODO: Implement API call to fetch user profile
      // const response = await fetch(`/api/profiles/${userId}`);
      // const data = await response.json();
      
      // Mock data for demonstration
      const mockProfile: UserProfile = {
        id: userId,
        username: 'streamer123',
        displayName: 'Awesome Streamer',
        avatar: '/default-avatar.png',
        bio: 'Welcome to my stream! I love gaming and creating content for this amazing community.',
        socialLinks: [
          { id: '1', platform: 'twitter', url: 'https://twitter.com/streamer123', label: 'Follow me on Twitter' },
          { id: '2', platform: 'youtube', url: 'https://youtube.com/streamer123', label: 'My YouTube Channel' }
        ],
        goals: [
          {
            id: '1',
            title: 'Reach 1000 Followers',
            description: 'Building an amazing community of supporters',
            targetAmount: 1000,
            currentAmount: 750,
            isPublic: true,
            createdAt: new Date().toISOString()
          }
        ],
        friendsCount: 42,
        isOnline: true,
        status: 'online',
        customUrl: 'awesome-streamer',
        level: 15,
        experience: 5420,
        totalTips: 1250,
        followerCount: 890,
        followingCount: 156
      };
      
      setUserProfile(mockProfile);
      setError(null);
    } catch (err) {
      setError('Failed to load profile');
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (updates: Partial<UserProfile>) => {
    try {
      // TODO: Implement API call to update profile
      setUserProfile(prev => prev ? { ...prev, ...updates } : null);
    } catch (err) {
      console.error('Error updating profile:', err);
    }
  };

  const handleAddFriend = async (userId: string) => {
    try {
      // TODO: Implement API call to add friend
      console.log('Adding friend:', userId);
    } catch (err) {
      console.error('Error adding friend:', err);
    }
  };

  const handleRemoveFriend = async (userId: string) => {
    try {
      // TODO: Implement API call to remove friend
      console.log('Removing friend:', userId);
    } catch (err) {
      console.error('Error removing friend:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Profile</h2>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={loadUserProfile}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile Not Found</h2>
          <p className="text-gray-600">The user profile could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-start gap-6">
            <div className="relative">
              <img
                src={userProfile.avatar || '/default-avatar.png'}
                alt={userProfile.username}
                className="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover"
              />
              <div className="absolute -bottom-2 -right-2">
                <StatusIndicator status={userProfile.status} size="lg" />
              </div>
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold">{userProfile.displayName}</h1>
                <div className="flex items-center gap-1">
                  <span className="bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-sm font-medium">
                    Level {userProfile.level}
                  </span>
                  <span className="text-white/80">({userProfile.experience} XP)</span>
                </div>
              </div>
              
              <p className="text-white/80 text-xl mb-3">@{userProfile.username}</p>
              
              {userProfile.customUrl && (
                <p className="text-white/70 text-sm mb-4">
                  {window.location.origin}/{userProfile.customUrl}
                </p>
              )}
              
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <div className="text-2xl font-bold">{userProfile.followerCount.toLocaleString()}</div>
                  <div className="text-white/70 text-sm">Followers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{userProfile.followingCount.toLocaleString()}</div>
                  <div className="text-white/70 text-sm">Following</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{userProfile.totalTips.toLocaleString()}</div>
                  <div className="text-white/70 text-sm">Total Tips</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{userProfile.friendsCount}</div>
                  <div className="text-white/70 text-sm">Friends</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center gap-2 px-3 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'profile' && (
            <EnhancedProfile
              user={{
                id: userProfile.id,
                username: userProfile.username,
                displayName: userProfile.displayName,
                avatar: userProfile.avatar,
                bio: userProfile.bio,
                socialLinks: userProfile.socialLinks,
                goals: userProfile.goals,
                friendsCount: userProfile.friendsCount,
                isOnline: userProfile.isOnline,
                customUrl: userProfile.customUrl
              }}
              isOwner={isOwner}
              currentUserId={currentUserId}
              onUpdateProfile={handleUpdateProfile}
              onAddFriend={handleAddFriend}
              onRemoveFriend={handleRemoveFriend}
            />
          )}

          {activeTab === 'emotes' && (
            <CustomEmoteManager
              streamerId={userProfile.id}
              streamerUsername={userProfile.username}
              isOwner={isOwner}
              onEmoteSelect={(emoteName) => {
                // TODO: Handle emote selection in chat
                console.log('Selected emote:', emoteName);
              }}
            />
          )}

          {activeTab === 'urls' && (
            <CustomUrlManager
              currentUserId={currentUserId}
              onCreateUrl={async (url) => {
                // TODO: Implement URL creation
                console.log('Creating URL:', url);
              }}
              onUpdateUrl={async (id, updates) => {
                // TODO: Implement URL update
                console.log('Updating URL:', id, updates);
              }}
              onDeleteUrl={async (id) => {
                // TODO: Implement URL deletion
                console.log('Deleting URL:', id);
              }}
              onCheckAvailability={async (url) => {
                // TODO: Check URL availability
                return true;
              }}
            />
          )}

          {activeTab === 'tips' && (
            <OfflineTipSystem
              currentUserId={currentUserId}
              onSendOfflineTip={async (tip) => {
                // TODO: Send offline tip
                console.log('Sending offline tip:', tip);
              }}
              onSendQueuedTip={async (tipId) => {
                // TODO: Send queued tip
                console.log('Sending queued tip:', tipId);
              }}
              onCancelQueuedTip={async (tipId) => {
                // TODO: Cancel queued tip
                console.log('Cancelling queued tip:', tipId);
              }}
              onMarkAsRead={async (tipId) => {
                // TODO: Mark tip as read
                console.log('Marking tip as read:', tipId);
              }}
              onRespondToTip={async (tipId, message) => {
                // TODO: Respond to tip
                console.log('Responding to tip:', tipId, message);
              }}
            />
          )}

          {activeTab === 'blocking' && (
            <BlockedAccounts
              currentUserId={currentUserId}
              onBlockUser={async (userId, reason, isMute) => {
                // TODO: Block user
                console.log('Blocking user:', userId, reason, isMute);
              }}
              onUnblockUser={async (userId) => {
                // TODO: Unblock user
                console.log('Unblocking user:', userId);
              }}
              onMuteUser={async (userId, isMuted) => {
                // TODO: Mute/unmute user
                console.log('Muting user:', userId, isMuted);
              }}
              onUpdateSettings={async (settings) => {
                // TODO: Update spam settings
                console.log('Updating spam settings:', settings);
              }}
            />
          )}

          {activeTab === 'customization' && (
            <ColorCustomization
              userId={userProfile.id}
              isOwner={isOwner}
              currentUserId={currentUserId}
              onUpdateTheme={async (theme) => {
                // TODO: Update color theme
                console.log('Updating theme:', theme);
              }}
              onUpdateStatusMessages={async (messages) => {
                // TODO: Update status messages
                console.log('Updating status messages:', messages);
              }}
              onUpdateTabColors={async (overlay) => {
                // TODO: Update tab colors
                console.log('Updating tab colors:', overlay);
              }}
            />
          )}

          {activeTab === 'settings' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Settings</h2>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900">Privacy Settings</h3>
                  <p className="text-sm text-gray-600">Manage your privacy and security preferences</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900">Notification Settings</h3>
                  <p className="text-sm text-gray-600">Configure how you receive notifications</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900">Account Security</h3>
                  <p className="text-sm text-gray-600">Change password and security options</p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default EnhancedProfilePage;