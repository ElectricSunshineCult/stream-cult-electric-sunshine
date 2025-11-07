import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheckIcon,
  UserMinusIcon,
  EyeSlashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  BellSlashIcon
} from '@heroicons/react/24/outline';

interface BlockedUser {
  id: string;
  username: string;
  avatar?: string;
  reason: 'spam' | 'harassment' | 'inappropriate' | 'custom';
  customReason?: string;
  blockedAt: string;
  isMuted: boolean;
}

interface SpamFilterSettings {
  enabled: boolean;
  maxMessageLength: number;
  maxMessagesPerMinute: number;
  blockedKeywords: string[];
  suspiciousPatterns: string[];
  autoDeleteSpam: boolean;
  notifyOnSpam: boolean;
}

interface BlockedAccountsProps {
  currentUserId: string;
  onBlockUser?: (userId: string, reason: string, isMute?: boolean) => void;
  onUnblockUser?: (userId: string) => void;
  onMuteUser?: (userId: string, isMuted: boolean) => void;
  onUpdateSettings?: (settings: SpamFilterSettings) => void;
}

const reasonOptions = [
  { value: 'spam', label: 'Spam', icon: '📧' },
  { value: 'harassment', label: 'Harassment', icon: '😠' },
  { value: 'inappropriate', label: 'Inappropriate Content', icon: '🚫' },
  { value: 'custom', label: 'Custom Reason', icon: '✏️' }
];

const commonSpamKeywords = [
  'free money', 'click here', 'buy now', 'limited time', 'act fast',
  'guaranteed', 'no risk', 'earn money', 'make money fast', 'investment',
  'crypto', 'bitcoin', 'lottery', 'prize', 'winner', 'congratulations'
];

const suspiciousPatterns = [
  /^.{100,}$/, // Very long messages
  /(.)\1{10,}/, // Same character repeated
  /!{3,}/, // Multiple exclamation marks
  /\?{5,}/, // Multiple question marks
  /[A-Z]{20,}/, // Too many capital letters
  /http[s]?:\/\/[^ ]+/, // URLs
  /@[a-zA-Z0-9_]+/, // Mentions
  /#[a-zA-Z0-9_]+/, // Hashtags
];

export const BlockedAccounts: React.FC<BlockedAccountsProps> = ({
  currentUserId,
  onBlockUser,
  onUnblockUser,
  onMuteUser,
  onUpdateSettings
}) => {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [spamSettings, setSpamSettings] = useState<SpamFilterSettings>({
    enabled: true,
    maxMessageLength: 500,
    maxMessagesPerMinute: 10,
    blockedKeywords: [...commonSpamKeywords],
    suspiciousPatterns: ['^(.)\\1{5,}$', '^.{200,}$'],
    autoDeleteSpam: true,
    notifyOnSpam: true
  });
  const [showAddKeyword, setShowAddKeyword] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [showBlockedList, setShowBlockedList] = useState(false);

  useEffect(() => {
    // TODO: Load blocked users and settings from API
    loadBlockedUsers();
    loadSpamSettings();
  }, [currentUserId]);

  const loadBlockedUsers = async () => {
    // TODO: Implement API call
    console.log('Loading blocked users...');
  };

  const loadSpamSettings = async () => {
    // TODO: Implement API call
    console.log('Loading spam settings...');
  };

  const handleBlockUser = (userId: string, reason: string, customReason?: string, isMute = false) => {
    onBlockUser?.(userId, customReason || reason, isMute);
    
    const blockedUser: BlockedUser = {
      id: userId,
      username: 'User', // TODO: Get from API
      blockedAt: new Date().toISOString(),
      reason: reason as any,
      customReason,
      isMuted: isMute
    };
    
    setBlockedUsers([...blockedUsers, blockedUser]);
  };

  const handleUnblockUser = (userId: string) => {
    onUnblockUser?.(userId);
    setBlockedUsers(blockedUsers.filter(user => user.id !== userId));
  };

  const handleMuteUser = (userId: string, isMuted: boolean) => {
    onMuteUser?.(userId, isMuted);
    setBlockedUsers(blockedUsers.map(user => 
      user.id === userId ? { ...user, isMuted } : user
    ));
  };

  const handleAddKeyword = () => {
    if (newKeyword.trim()) {
      const updatedKeywords = [...spamSettings.blockedKeywords, newKeyword.trim()];
      const updatedSettings = { ...spamSettings, blockedKeywords: updatedKeywords };
      setSpamSettings(updatedSettings);
      onUpdateSettings?.(updatedSettings);
      setNewKeyword('');
      setShowAddKeyword(false);
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    const updatedKeywords = spamSettings.blockedKeywords.filter(k => k !== keyword);
    const updatedSettings = { ...spamSettings, blockedKeywords: updatedKeywords };
    setSpamSettings(updatedSettings);
    onUpdateSettings?.(updatedSettings);
  };

  return (
    <div className="space-y-6">
      {/* Spam Filter Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <ShieldCheckIcon className="w-6 h-6 text-purple-600" />
          <h2 className="text-xl font-semibold text-gray-900">Spam Protection</h2>
        </div>

        <div className="space-y-4">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900">Enable Spam Protection</h3>
              <p className="text-sm text-gray-600">Automatically filter and block spam messages</p>
            </div>
            <button
              onClick={() => {
                const updated = { ...spamSettings, enabled: !spamSettings.enabled };
                setSpamSettings(updated);
                onUpdateSettings?.(updated);
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                spamSettings.enabled ? 'bg-purple-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  spamSettings.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Settings Options */}
          {spamSettings.enabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4"
            >
              {/* Max Message Length */}
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <label className="font-medium text-gray-900">Max Message Length</label>
                  <p className="text-sm text-gray-600">Maximum characters per message</p>
                </div>
                <input
                  type="number"
                  value={spamSettings.maxMessageLength}
                  onChange={(e) => {
                    const updated = { ...spamSettings, maxMessageLength: parseInt(e.target.value) };
                    setSpamSettings(updated);
                    onUpdateSettings?.(updated);
                  }}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                  min="50"
                  max="1000"
                />
              </div>

              {/* Max Messages Per Minute */}
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <label className="font-medium text-gray-900">Max Messages Per Minute</label>
                  <p className="text-sm text-gray-600">Rate limit for message frequency</p>
                </div>
                <input
                  type="number"
                  value={spamSettings.maxMessagesPerMinute}
                  onChange={(e) => {
                    const updated = { ...spamSettings, maxMessagesPerMinute: parseInt(e.target.value) };
                    setSpamSettings(updated);
                    onUpdateSettings?.(updated);
                  }}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                  min="1"
                  max="60"
                />
              </div>

              {/* Auto Delete Spam */}
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Auto-Delete Spam</h4>
                  <p className="text-sm text-gray-600">Automatically remove detected spam messages</p>
                </div>
                <button
                  onClick={() => {
                    const updated = { ...spamSettings, autoDeleteSpam: !spamSettings.autoDeleteSpam };
                    setSpamSettings(updated);
                    onUpdateSettings?.(updated);
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    spamSettings.autoDeleteSpam ? 'bg-purple-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      spamSettings.autoDeleteSpam ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Notify on Spam */}
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Notify on Spam</h4>
                  <p className="text-sm text-gray-600">Show notifications when spam is detected</p>
                </div>
                <button
                  onClick={() => {
                    const updated = { ...spamSettings, notifyOnSpam: !spamSettings.notifyOnSpam };
                    setSpamSettings(updated);
                    onUpdateSettings?.(updated);
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    spamSettings.notifyOnSpam ? 'bg-purple-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      spamSettings.notifyOnSpam ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Blocked Keywords */}
              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">Blocked Keywords</h4>
                  <button
                    onClick={() => setShowAddKeyword(true)}
                    className="text-purple-600 hover:text-purple-700 text-sm"
                  >
                    Add Keyword
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {spamSettings.blockedKeywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm"
                    >
                      {keyword}
                      <button
                        onClick={() => handleRemoveKeyword(keyword)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <XMarkIcon className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                
                {/* Add Keyword Input */}
                <AnimatePresence>
                  {showAddKeyword && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 flex gap-2"
                    >
                      <input
                        type="text"
                        value={newKeyword}
                        onChange={(e) => setNewKeyword(e.target.value)}
                        placeholder="Enter keyword"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
                      />
                      <button
                        onClick={handleAddKeyword}
                        className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => {
                          setShowAddKeyword(false);
                          setNewKeyword('');
                        }}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Blocked Users */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <UserMinusIcon className="w-6 h-6 text-red-600" />
            <h2 className="text-xl font-semibold text-gray-900">Blocked Accounts</h2>
          </div>
          <button
            onClick={() => setShowBlockedList(!showBlockedList)}
            className="text-purple-600 hover:text-purple-700"
          >
            {showBlockedList ? 'Hide' : 'Show'} ({blockedUsers.length})
          </button>
        </div>

        <AnimatePresence>
          {showBlockedList && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3"
            >
              {blockedUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <UserMinusIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No blocked accounts</p>
                  <p className="text-sm">Blocked users won't be able to contact you</p>
                </div>
              ) : (
                blockedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={user.avatar || '/default-avatar.png'}
                        alt={user.username}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{user.username}</div>
                        <div className="text-sm text-gray-500">
                          {user.customReason || reasonOptions.find(r => r.value === user.reason)?.label}
                        </div>
                        <div className="text-xs text-gray-400">
                          Blocked {new Date(user.blockedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {user.isMuted && (
                        <BellSlashIcon className="w-5 h-5 text-yellow-500" title="Muted" />
                      )}
                      <button
                        onClick={() => handleMuteUser(user.id, !user.isMuted)}
                        className={`p-2 rounded-full ${
                          user.isMuted
                            ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        title={user.isMuted ? 'Unmute' : 'Mute'}
                      >
                        <BellSlashIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleUnblockUser(user.id)}
                        className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                      >
                        Unblock
                      </button>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Spam Detection Service
export class SpamDetectionService {
  private settings: SpamFilterSettings;

  constructor(settings: SpamFilterSettings) {
    this.settings = settings;
  }

  updateSettings(settings: SpamFilterSettings) {
    this.settings = settings;
  }

  analyzeMessage(message: string, userId: string, timestamp: number): {
    isSpam: boolean;
    reasons: string[];
    confidence: number;
  } {
    if (!this.settings.enabled) {
      return { isSpam: false, reasons: [], confidence: 0 };
    }

    const reasons: string[] = [];
    let confidence = 0;

    // Check message length
    if (message.length > this.settings.maxMessageLength) {
      reasons.push('Message too long');
      confidence += 0.3;
    }

    // Check blocked keywords
    const lowerMessage = message.toLowerCase();
    const foundKeywords = this.settings.blockedKeywords.filter(keyword =>
      lowerMessage.includes(keyword.toLowerCase())
    );
    
    if (foundKeywords.length > 0) {
      reasons.push(`Contains blocked keywords: ${foundKeywords.join(', ')}`);
      confidence += 0.5;
    }

    // Check suspicious patterns
    this.settings.suspiciousPatterns.forEach(pattern => {
      const regex = new RegExp(pattern);
      if (regex.test(message)) {
        reasons.push('Matches suspicious pattern');
        confidence += 0.2;
      }
    });

    // Check for excessive punctuation
    const exclamationCount = (message.match(/!/g) || []).length;
    const questionCount = (message.match(/\?/g) || []).length;
    
    if (exclamationCount > 3) {
      reasons.push('Excessive exclamation marks');
      confidence += 0.2;
    }
    
    if (questionCount > 3) {
      reasons.push('Excessive question marks');
      confidence += 0.2;
    }

    // Check for all caps
    const letters = message.replace(/[^a-zA-Z]/g, '');
    if (letters.length > 10 && letters === letters.toUpperCase()) {
      reasons.push('Message in all caps');
      confidence += 0.3;
    }

    // Check for excessive repetition
    const words = message.split(/\s+/);
    const wordCount: { [key: string]: number } = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    const maxRepeatCount = Math.max(...Object.values(wordCount));
    if (maxRepeatCount > 3) {
      reasons.push('Excessive word repetition');
      confidence += 0.4;
    }

    // Check for URLs (basic detection)
    const urlPattern = /https?:\/\/[^\s]+/;
    if (urlPattern.test(message)) {
      reasons.push('Contains URLs');
      confidence += 0.3;
    }

    return {
      isSpam: confidence >= 0.5,
      reasons,
      confidence: Math.min(confidence, 1)
    };
  }

  shouldRateLimit(userId: string, messages: number[], timeWindow: number = 60000): boolean {
    const now = Date.now();
    const recentMessages = messages.filter(timestamp => now - timestamp < timeWindow);
    return recentMessages.length >= this.settings.maxMessagesPerMinute;
  }
}

export default BlockedAccounts;