import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GiftIcon,
  ClockIcon,
  CheckCircleIcon,
  XMarkIcon,
  HeartIcon,
  BanknotesIcon,
  StarIcon,
  BellIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon, StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';

interface OfflineTip {
  id: string;
  streamerId: string;
  streamerUsername: string;
  tipperId: string;
  tipperUsername: string;
  amount: number;
  message?: string;
  isAnonymous: boolean;
  timestamp: string;
  status: 'pending' | 'delivered' | 'read' | 'responded';
  category: 'support' | 'encouragement' | 'congratulations' | 'thank_you' | 'other';
  isSpecialOccasion?: boolean;
  occasionType?: 'birthday' | 'anniversary' | 'milestone' | 'holiday';
}

interface TipQueue {
  streamerId: string;
  streamerUsername: string;
  tips: OfflineTip[];
  isOnline: boolean;
  lastSeen: string;
}

interface OfflineTipSystemProps {
  currentUserId: string;
  onSendOfflineTip?: (tip: Omit<OfflineTip, 'id' | 'timestamp' | 'status'>) => void;
  onSendQueuedTip?: (tipId: string) => void;
  onCancelQueuedTip?: (tipId: string) => void;
  onMarkAsRead?: (tipId: string) => void;
  onRespondToTip?: (tipId: string, message: string) => void;
}

const tipCategories = [
  { 
    value: 'support', 
    label: 'Support', 
    icon: HeartIcon, 
    color: 'text-red-500 bg-red-50 border-red-200',
    description: 'Encouragement during tough times'
  },
  { 
    value: 'encouragement', 
    label: 'Encouragement', 
    icon: StarIcon, 
    color: 'text-yellow-500 bg-yellow-50 border-yellow-200',
    description: 'Motivation to keep going'
  },
  { 
    value: 'congratulations', 
    label: 'Congratulations', 
    icon: CheckCircleIcon, 
    color: 'text-green-500 bg-green-50 border-green-200',
    description: 'Celebrating achievements'
  },
  {
    value: 'thank_you', 
    label: 'Thank You', 
    icon: GiftIcon, 
    color: 'text-purple-500 bg-purple-50 border-purple-200',
    description: 'Expressing gratitude'
  },
  { 
    value: 'other', 
    label: 'Other', 
    icon: BanknotesIcon, 
    color: 'text-blue-500 bg-blue-50 border-blue-200',
    description: 'General support'
  }
];

const tipAmounts = [5, 10, 25, 50, 100, 250, 500, 1000];

const specialOccasions = [
  { value: 'birthday', label: '🎂 Birthday', color: 'bg-pink-100 text-pink-800' },
  { value: 'anniversary', label: '💑 Anniversary', color: 'bg-red-100 text-red-800' },
  { value: 'milestone', label: '🏆 Milestone', color: 'bg-gold-100 text-yellow-800' },
  { value: 'holiday', label: '🎄 Holiday', color: 'bg-green-100 text-green-800' }
];

export const OfflineTipSystem: React.FC<OfflineTipSystemProps> = ({
  currentUserId,
  onSendOfflineTip,
  onSendQueuedTip,
  onCancelQueuedTip,
  onMarkAsRead,
  onRespondToTip
}) => {
  const [tipQueues, setTipQueues] = useState<TipQueue[]>([]);
  const [showSendTip, setShowSendTip] = useState(false);
  const [selectedStreamer, setSelectedStreamer] = useState<{
    id: string;
    username: string;
    displayName: string;
  } | null>(null);
  const [tipForm, setTipForm] = useState({
    amount: 10,
    message: '',
    category: 'support' as OfflineTip['category'],
    isAnonymous: false,
    isSpecialOccasion: false,
    occasionType: 'birthday' as OfflineTip['occasionType']
  });
  const [showQueuedTips, setShowQueuedTips] = useState(false);

  useEffect(() => {
    // Load tip queues and queued tips
    loadTipQueues();
    loadQueuedTips();
  }, [currentUserId]);

  const loadTipQueues = async () => {
    // TODO: API call to load offline tip queues
    console.log('Loading tip queues...');
  };

  const loadQueuedTips = async () => {
    // TODO: API call to load user's queued tips
    console.log('Loading queued tips...');
  };

  const handleSendOfflineTip = async () => {
    if (!selectedStreamer || !tipForm.amount) return;

    const newTip: Omit<OfflineTip, 'id' | 'timestamp' | 'status'> = {
      streamerId: selectedStreamer.id,
      streamerUsername: selectedStreamer.username,
      tipperId: currentUserId,
      tipperUsername: 'CurrentUser', // TODO: Get from API
      amount: tipForm.amount,
      message: tipForm.message || undefined,
      isAnonymous: tipForm.isAnonymous,
      category: tipForm.category,
      isSpecialOccasion: tipForm.isSpecialOccasion,
      occasionType: tipForm.isSpecialOccasion ? tipForm.occasionType : undefined
    };

    onSendOfflineTip?.(newTip);
    
    // Reset form
    setTipForm({
      amount: 10,
      message: '',
      category: 'support',
      isAnonymous: false,
      isSpecialOccasion: false,
      occasionType: 'birthday'
    });
    setShowSendTip(false);
  };

  const getStatusIcon = (status: OfflineTip['status']) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="w-4 h-4 text-yellow-500" />;
      case 'delivered':
        return <CheckCircleIcon className="w-4 h-4 text-blue-500" />;
      case 'read':
        return <EyeIcon className="w-4 h-4 text-green-500" />;
      case 'responded':
        return <HeartSolidIcon className="w-4 h-4 text-red-500" />;
      default:
        return <ClockIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: OfflineTip['status']) => {
    switch (status) {
      case 'pending':
        return 'Queued (Streamer Offline)';
      case 'delivered':
        return 'Delivered (Streamer Online)';
      case 'read':
        return 'Read by Streamer';
      case 'responded':
        return 'Responded by Streamer';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Offline Tips</h2>
            <p className="text-gray-600">Support your favorite streamers even when they're offline</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowQueuedTips(!showQueuedTips)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              <GiftIcon className="w-4 h-4" />
              Queued Tips ({tipQueues.reduce((acc, q) => acc + q.tips.length, 0)})
            </button>
            <button
              onClick={() => setShowSendTip(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <BanknotesIcon className="w-4 h-4" />
              Send Tip
            </button>
          </div>
        </div>
      </div>

      {/* Queued Tips Overview */}
      {tipQueues.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Offline Tip Queues</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tipQueues.map((queue) => (
              <div key={queue.streamerId} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{queue.streamerUsername}</h4>
                    <p className="text-sm text-gray-500">
                      {queue.isOnline ? (
                        <span className="text-green-600">● Online</span>
                      ) : (
                        <span className="text-gray-400">● Offline</span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-purple-600">
                      {queue.tips.reduce((acc, tip) => acc + tip.amount, 0)}
                    </div>
                    <div className="text-xs text-gray-500">total tokens</div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    {queue.tips.length} tip{queue.tips.length !== 1 ? 's' : ''} queued
                  </span>
                  {queue.isOnline && (
                    <button
                      onClick={() => {/* Send queued tips */}}
                      className="text-purple-600 hover:text-purple-700"
                    >
                      Send Now
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Queued Tips Detail */}
      <AnimatePresence>
        {showQueuedTips && tipQueues.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Queued Tips Details</h3>
            <div className="space-y-4">
              {tipQueues.map((queue) => (
                <div key={queue.streamerId}>
                  <h4 className="font-medium text-gray-900 mb-2">{queue.streamerUsername}</h4>
                  <div className="space-y-2">
                    {queue.tips.map((tip) => (
                      <div key={tip.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(tip.status)}
                          <div>
                            <div className="font-medium text-gray-900">
                              {tip.isAnonymous ? 'Anonymous' : tip.tipperUsername}
                            </div>
                            <div className="text-sm text-gray-500">
                              {tip.amount} tokens - {tip.message || 'No message'}
                            </div>
                            <div className="text-xs text-gray-400">
                              {new Date(tip.timestamp).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">{getStatusText(tip.status)}</span>
                          {tip.status === 'pending' && (
                            <button
                              onClick={() => onCancelQueuedTip?.(tip.id)}
                              className="p-1 text-red-600 hover:bg-red-100 rounded"
                            >
                              <XMarkIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Send Tip Modal */}
      <AnimatePresence>
        {showSendTip && (
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
              className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Send Offline Tip</h3>
                <button
                  onClick={() => setShowSendTip(false)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Streamer Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Streamer
                  </label>
                  <input
                    type="text"
                    value={selectedStreamer?.username || ''}
                    onChange={(e) => {
                      // TODO: Implement streamer search
                      const username = e.target.value;
                      if (username) {
                        setSelectedStreamer({
                          id: 'streamer-id', // TODO: Get from search
                          username,
                          displayName: username
                        });
                      }
                    }}
                    placeholder="Enter streamer username"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Tip Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Tip Amount
                  </label>
                  <div className="grid grid-cols-4 gap-3">
                    {tipAmounts.map((amount) => (
                      <button
                        key={amount}
                        onClick={() => setTipForm({ ...tipForm, amount })}
                        className={`p-3 border-2 rounded-lg text-center transition-colors ${
                          tipForm.amount === amount
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-bold">{amount}</div>
                        <div className="text-xs text-gray-500">tokens</div>
                      </button>
                    ))}
                  </div>
                  
                  <div className="mt-3">
                    <input
                      type="number"
                      value={tipForm.amount}
                      onChange={(e) => setTipForm({ ...tipForm, amount: parseInt(e.target.value) || 0 })}
                      placeholder="Custom amount"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      min="1"
                    />
                  </div>
                </div>

                {/* Tip Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Tip Category
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {tipCategories.map((category) => {
                      const IconComponent = category.icon;
                      return (
                        <button
                          key={category.value}
                          onClick={() => setTipForm({ ...tipForm, category: category.value as any })}
                          className={`p-3 border-2 rounded-lg text-left transition-colors ${
                            tipForm.category === category.value
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <IconComponent className="w-4 h-4" />
                            <span className="font-medium">{category.label}</span>
                          </div>
                          <p className="text-xs text-gray-500">{category.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message (Optional)
                  </label>
                  <textarea
                    value={tipForm.message}
                    onChange={(e) => setTipForm({ ...tipForm, message: e.target.value })}
                    placeholder="Add a personal message to your tip..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    rows={3}
                    maxLength={200}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {tipForm.message.length}/200 characters
                  </div>
                </div>

                {/* Special Occasion */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="specialOccasion"
                    checked={tipForm.isSpecialOccasion}
                    onChange={(e) => setTipForm({ ...tipForm, isSpecialOccasion: e.target.checked })}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <label htmlFor="specialOccasion" className="text-sm font-medium text-gray-700">
                    This is a special occasion
                  </label>
                </div>

                {tipForm.isSpecialOccasion && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Occasion Type
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {specialOccasions.map((occasion) => (
                        <button
                          key={occasion.value}
                          onClick={() => setTipForm({ 
                            ...tipForm, 
                            occasionType: occasion.value as any 
                          })}
                          className={`p-2 border rounded-lg text-sm ${
                            tipForm.occasionType === occasion.value
                              ? 'border-purple-500 bg-purple-50 text-purple-700'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {occasion.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Anonymous Option */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="anonymous"
                    checked={tipForm.isAnonymous}
                    onChange={(e) => setTipForm({ ...tipForm, isAnonymous: e.target.checked })}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <label htmlFor="anonymous" className="text-sm font-medium text-gray-700">
                    Send anonymously
                  </label>
                </div>

                {/* Submit Button */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleSendOfflineTip}
                    disabled={!selectedStreamer || !tipForm.amount}
                    className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    Send Offline Tip ({tipForm.amount} tokens)
                  </button>
                  <button
                    onClick={() => setShowSendTip(false)}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {tipQueues.length === 0 && !showSendTip && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <GiftIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Offline Tips Yet</h3>
          <p className="text-gray-600 mb-6">
            Show your support to streamers even when they're offline. Your tips will be delivered when they come back online.
          </p>
          <button
            onClick={() => setShowSendTip(true)}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Send Your First Tip
          </button>
        </div>
      )}
    </div>
  );
};

export default OfflineTipSystem;