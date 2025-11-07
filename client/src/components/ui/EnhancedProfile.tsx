import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserIcon, 
  LinkIcon, 
  PlusIcon,
  CheckIcon,
  XMarkIcon,
  TrophyIcon,
  HeartIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';

interface SocialLink {
  id: string;
  platform: string;
  url: string;
  label: string;
}

interface UserGoal {
  id: string;
  title: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  isPublic: boolean;
  createdAt: string;
}

interface FriendRequest {
  id: string;
  fromUser: {
    id: string;
    username: string;
    avatar?: string;
  };
  createdAt: string;
}

interface ProfileUser {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  socialLinks: SocialLink[];
  goals: UserGoal[];
  friendsCount: number;
  isOnline: boolean;
  customUrl?: string;
}

interface EnhancedProfileProps {
  user: ProfileUser;
  isOwner: boolean;
  currentUserId?: string;
  onUpdateProfile?: (updates: Partial<ProfileUser>) => void;
  onAddFriend?: (userId: string) => void;
  onRemoveFriend?: (userId: string) => void;
}

const platformOptions = [
  { value: 'twitter', label: 'Twitter', icon: '🐦' },
  { value: 'instagram', label: 'Instagram', icon: '📷' },
  { value: 'youtube', label: 'YouTube', icon: '📺' },
  { value: 'tiktok', label: 'TikTok', icon: '🎵' },
  { value: 'discord', label: 'Discord', icon: '💬' },
  { value: 'twitch', label: 'Twitch', icon: '🎮' },
  { value: 'custom', label: 'Custom', icon: '🔗' }
];

export const EnhancedProfile: React.FC<EnhancedProfileProps> = ({
  user,
  isOwner,
  currentUserId,
  onUpdateProfile,
  onAddFriend,
  onRemoveFriend
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingBio, setEditingBio] = useState('');
  const [editingDisplayName, setEditingDisplayName] = useState('');
  const [showAddLink, setShowAddLink] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [friendStatus, setFriendStatus] = useState<'none' | 'pending' | 'friends'>('none');

  useEffect(() => {
    setEditingBio(user.bio || '');
    setEditingDisplayName(user.displayName || user.username);
    
    // TODO: Check friend status with current user
    // setFriendStatus(checkFriendStatus(currentUserId, user.id));
  }, [user, currentUserId]);

  const handleSaveProfile = () => {
    onUpdateProfile?.({
      displayName: editingDisplayName,
      bio: editingBio
    });
    setIsEditing(false);
  };

  const handleAddSocialLink = (link: Omit<SocialLink, 'id'>) => {
    const newLink: SocialLink = {
      ...link,
      id: Date.now().toString()
    };
    
    onUpdateProfile?.({
      socialLinks: [...user.socialLinks, newLink]
    });
    setShowAddLink(false);
  };

  const handleDeleteSocialLink = (linkId: string) => {
    onUpdateProfile?.({
      socialLinks: user.socialLinks.filter(link => link.id !== linkId)
    });
  };

  const handleAddGoal = (goal: Omit<UserGoal, 'id' | 'createdAt' | 'currentAmount'>) => {
    const newGoal: UserGoal = {
      ...goal,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      currentAmount: 0
    };
    
    onUpdateProfile?.({
      goals: [...user.goals, newGoal]
    });
    setShowAddGoal(false);
  };

  const handleDeleteGoal = (goalId: string) => {
    onUpdateProfile?.({
      goals: user.goals.filter(goal => goal.id !== goalId)
    });
  };

  const handleAddFriend = () => {
    onAddFriend?.(user.id);
    setFriendStatus('pending');
  };

  const handleRemoveFriend = () => {
    onRemoveFriend?.(user.id);
    setFriendStatus('none');
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 p-6 text-white">
        <div className="flex items-start gap-6">
          <div className="relative">
            <img
              src={user.avatar || '/default-avatar.png'}
              alt={user.username}
              className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover"
            />
            {user.isOnline && (
              <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 border-2 border-white rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            )}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">
                {isEditing ? (
                  <input
                    type="text"
                    value={editingDisplayName}
                    onChange={(e) => setEditingDisplayName(e.target.value)}
                    className="bg-white/20 text-white placeholder-white/70 border-white/30 rounded px-2 py-1"
                    placeholder="Display name"
                  />
                ) : (
                  user.displayName
                )}
              </h1>
              
              {isOwner && (
                <button
                  onClick={() => {
                    if (isEditing) {
                      handleSaveProfile();
                    } else {
                      setIsEditing(true);
                    }
                  }}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  {isEditing ? (
                    <CheckIcon className="w-5 h-5" />
                  ) : (
                    <PencilIcon className="w-5 h-5" />
                  )}
                </button>
              )}
            </div>
            
            <p className="text-white/80 mb-3">@{user.username}</p>
            
            {user.customUrl && (
              <p className="text-white/70 text-sm mb-3">
                {window.location.origin}/{user.customUrl}
              </p>
            )}
            
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold">{user.friendsCount}</div>
                <div className="text-white/70 text-sm">Friends</div>
              </div>
              
              {!isOwner && currentUserId && (
                <div className="flex gap-2">
                  {friendStatus === 'none' && (
                    <button
                      onClick={handleAddFriend}
                      className="px-4 py-2 bg-white text-purple-600 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    >
                      Add Friend
                    </button>
                  )}
                  {friendStatus === 'pending' && (
                    <span className="px-4 py-2 bg-yellow-500 text-white rounded-lg font-medium">
                      Pending
                    </span>
                  )}
                  {friendStatus === 'friends' && (
                    <button
                      onClick={handleRemoveFriend}
                      className="px-4 py-2 border border-white text-white rounded-lg font-medium hover:bg-white/20 transition-colors"
                    >
                      Remove Friend
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Bio Section */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">About</h3>
          {isEditing ? (
            <div>
              <textarea
                value={editingBio}
                onChange={(e) => setEditingBio(e.target.value)}
                placeholder="Tell us about yourself..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                rows={4}
              />
            </div>
          ) : (
            <p className="text-gray-700">
              {user.bio || (
                <span className="text-gray-400 italic">
                  {isOwner ? "Add a bio to tell people about yourself" : "No bio added yet"}
                </span>
              )}
            </p>
          )}
        </div>

        {/* Social Links */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">Social Links</h3>
            {isOwner && (
              <button
                onClick={() => setShowAddLink(true)}
                className="flex items-center gap-2 text-purple-600 hover:text-purple-700"
              >
                <PlusIcon className="w-4 h-4" />
                Add Link
              </button>
            )}
          </div>
          
          <div className="space-y-2">
            {user.socialLinks.map((link) => (
              <div key={link.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-lg">
                    {platformOptions.find(p => p.value === link.platform)?.icon || '🔗'}
                  </span>
                  <div>
                    <div className="font-medium text-gray-900">{link.label}</div>
                    <div className="text-sm text-gray-500">{link.url}</div>
                  </div>
                </div>
                {isOwner && (
                  <button
                    onClick={() => handleDeleteSocialLink(link.id)}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            
            {user.socialLinks.length === 0 && (
              <p className="text-gray-400 text-center py-4">
                {isOwner ? "Add your social media links" : "No social links added"}
              </p>
            )}
          </div>
        </div>

        {/* Goals */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">Goals</h3>
            {isOwner && (
              <button
                onClick={() => setShowAddGoal(true)}
                className="flex items-center gap-2 text-purple-600 hover:text-purple-700"
              >
                <PlusIcon className="w-4 h-4" />
                Add Goal
              </button>
            )}
          </div>
          
          <div className="space-y-3">
            {user.goals.map((goal) => (
              <div key={goal.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-gray-900">{goal.title}</h4>
                    {goal.description && (
                      <p className="text-sm text-gray-600 mt-1">{goal.description}</p>
                    )}
                  </div>
                  {isOwner && (
                    <button
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="p-1 text-gray-400 hover:text-red-500"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>
                      {goal.currentAmount} / {goal.targetAmount} tokens
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          (goal.currentAmount / goal.targetAmount) * 100,
                          100
                        )}%`
                      }}
                    ></div>
                  </div>
                  {goal.isPublic && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <TrophyIcon className="w-3 h-3" />
                      Public goal
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {user.goals.length === 0 && (
              <p className="text-gray-400 text-center py-4">
                {isOwner ? "Set your first goal to stay motivated" : "No goals set yet"}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Add Link Modal */}
      <AnimatePresence>
        {showAddLink && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg p-6 w-full max-w-md"
            >
              <h3 className="text-lg font-semibold mb-4">Add Social Link</h3>
              <SocialLinkForm onSubmit={handleAddSocialLink} onCancel={() => setShowAddLink(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Goal Modal */}
      <AnimatePresence>
        {showAddGoal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg p-6 w-full max-w-md"
            >
              <h3 className="text-lg font-semibold mb-4">Add Goal</h3>
              <GoalForm onSubmit={handleAddGoal} onCancel={() => setShowAddGoal(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SocialLinkForm: React.FC<{
  onSubmit: (link: Omit<SocialLink, 'id'>) => void;
  onCancel: () => void;
}> = ({ onSubmit, onCancel }) => {
  const [platform, setPlatform] = useState('twitter');
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (label && url) {
      onSubmit({ platform, url, label });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Platform
        </label>
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          {platformOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.icon} {option.label}
            </option>
          ))}
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Label
        </label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g., Follow me on Twitter"
          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          URL
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>
      
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
        >
          Add Link
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

const GoalForm: React.FC<{
  onSubmit: (goal: Omit<UserGoal, 'id' | 'createdAt' | 'currentAmount'>) => void;
  onCancel: () => void;
}> = ({ onSubmit, onCancel }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title && targetAmount) {
      onSubmit({
        title,
        description: description || undefined,
        targetAmount: parseInt(targetAmount),
        isPublic
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Goal Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Reach 1000 followers"
          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description (Optional)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your goal..."
          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          rows={3}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Target Amount (Tokens)
        </label>
        <input
          type="number"
          value={targetAmount}
          onChange={(e) => setTargetAmount(e.target.value)}
          placeholder="1000"
          min="1"
          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>
      
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isPublic"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
        />
        <label htmlFor="isPublic" className="text-sm text-gray-700">
          Make this goal public
        </label>
      </div>
      
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
        >
          Add Goal
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default EnhancedProfile;