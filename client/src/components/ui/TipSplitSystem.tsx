import React, { useState, useEffect } from 'react';
import { DollarSign, Users, Split, TrendingUp, Gift, Settings, PieChart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TipSplit {
  id: string;
  original_tip_id: string;
  session_id: string;
  recipient_id: string;
  amount: number;
  percentage: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processed_at?: string;
  recipient_info?: {
    username: string;
    is_host: boolean;
    avatar_url?: string;
  };
  original_tip?: {
    sender_username: string;
    message: string;
    total_amount: number;
    category: string;
  };
}

interface TipSplitSettings {
  auto_split: boolean;
  default_host_percentage: number;
  default_guest_percentage: number;
  minimum_tip_to_split: number;
  split_rules: {
    host_gets_bonus: boolean;
    guest_engagement_multiplier: boolean;
    raider_bonus: boolean;
  };
}

interface TipSplitSystemProps {
  userId: string;
  sessionId: string;
  isHost: boolean;
  activeGuests: Array<{ id: string; username: string; tip_split_percentage: number }>;
  onSplitUpdate?: (splits: TipSplit[]) => void;
}

const TipSplitSystem: React.FC<TipSplitSystemProps> = ({
  userId,
  sessionId,
  isHost,
  activeGuests,
  onSplitUpdate
}) => {
  const [tipSplits, setTipSplits] = useState<TipSplit[]>([]);
  const [settings, setSettings] = useState<TipSplitSettings>({
    auto_split: true,
    default_host_percentage: 50,
    default_guest_percentage: 50,
    minimum_tip_to_split: 1,
    split_rules: {
      host_gets_bonus: true,
      guest_engagement_multiplier: false,
      raider_bonus: false
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSplitDetails, setShowSplitDetails] = useState(false);
  const [splitAnalytics, setSplitAnalytics] = useState({
    total_tips: 0,
    total_split_amount: 0,
    host_revenue: 0,
    guest_revenue: 0,
    pending_splits: 0
  });

  useEffect(() => {
    loadTipSplits();
    loadSettings();
  }, [userId, sessionId]);

  useEffect(() => {
    calculateAnalytics();
  }, [tipSplits]);

  const loadTipSplits = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/tip-splits/session/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const splits = await response.json();
        setTipSplits(splits);
        onSplitUpdate?.(splits);
      }
    } catch (error) {
      console.error('Failed to load tip splits:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const response = await fetch(`/api/tip-splits/settings/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const userSettings = await response.json();
        setSettings({ ...settings, ...userSettings });
      }
    } catch (error) {
      console.error('Failed to load tip split settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/tip-splits/settings/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        // Show success toast
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg z-50';
        toast.textContent = 'Tip split settings saved!';
        document.body.appendChild(toast);
        setTimeout(() => document.body.removeChild(toast), 3000);
        setShowSettings(false);
      }
    } catch (error) {
      console.error('Failed to save tip split settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateSplit = (totalAmount: number, recipientId: string): number => {
    const guest = activeGuests.find(g => g.id === recipientId);
    if (!guest) return 0;
    
    let hostPercentage = 100 - guest.tip_split_percentage;
    let guestPercentage = guest.tip_split_percentage;
    
    // Apply split rules
    if (settings.split_rules.host_gets_bonus && isHost && hostPercentage < 50) {
      hostPercentage = 50;
      guestPercentage = 50;
    }
    
    if (settings.split_rules.guest_engagement_multiplier && !isHost) {
      guestPercentage *= 1.1; // 10% bonus for guest engagement
    }
    
    return (totalAmount * guestPercentage) / 100;
  };

  const processTipSplit = async (tipId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/tip-splits/process/${tipId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          session_id: sessionId,
          auto_split: settings.auto_split
        })
      });

      if (response.ok) {
        const newSplits = await response.json();
        setTipSplits(prev => [...prev, ...newSplits]);
        onSplitUpdate?.([...tipSplits, ...newSplits]);
      }
    } catch (error) {
      console.error('Failed to process tip split:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const forceSplit = async (tipId: string, customSplit: { [guestId: string]: number }) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/tip-splits/force/${tipId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          session_id: sessionId,
          custom_split: customSplit
        })
      });

      if (response.ok) {
        const newSplits = await response.json();
        setTipSplits(prev => [...prev, ...newSplits]);
        onSplitUpdate?.([...tipSplits, ...newSplits]);
      }
    } catch (error) {
      console.error('Failed to force tip split:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateAnalytics = () => {
    const totalTips = tipSplits.reduce((sum, split) => sum + split.amount, 0);
    const hostRevenue = tipSplits
      .filter(split => split.recipient_info?.is_host)
      .reduce((sum, split) => sum + split.amount, 0);
    const guestRevenue = tipSplits
      .filter(split => !split.recipient_info?.is_host)
      .reduce((sum, split) => sum + split.amount, 0);
    const pendingSplits = tipSplits.filter(split => split.status === 'pending').length;

    setSplitAnalytics({
      total_tips: tipSplits.length,
      total_split_amount: totalTips,
      host_revenue: hostRevenue,
      guest_revenue: guestRevenue,
      pending_splits: pendingSplits
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-500';
      case 'processing': return 'text-yellow-500';
      case 'pending': return 'text-blue-500';
      case 'failed': return 'text-red-500';
      default: return 'text-gray-400';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Split className="w-5 h-5" />
          Tip Split System
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSplitDetails(true)}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
          >
            View Details
          </button>
          {isHost && (
            <button
              onClick={() => setShowSettings(true)}
              className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Analytics Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Gift className="w-4 h-4 text-green-500" />
            <span className="text-sm text-gray-300">Total Tips</span>
          </div>
          <div className="text-xl font-bold text-white">
            {splitAnalytics.total_tips}
          </div>
        </div>
        
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-gray-300">Total Amount</span>
          </div>
          <div className="text-xl font-bold text-white">
            {formatCurrency(splitAnalytics.total_split_amount)}
          </div>
        </div>
        
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-purple-500" />
            <span className="text-sm text-gray-300">Host Revenue</span>
          </div>
          <div className="text-xl font-bold text-white">
            {formatCurrency(splitAnalytics.host_revenue)}
          </div>
        </div>
        
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-orange-500" />
            <span className="text-sm text-gray-300">Pending</span>
          </div>
          <div className="text-xl font-bold text-white">
            {splitAnalytics.pending_splits}
          </div>
        </div>
      </div>

      {/* Active Guests and Splits */}
      {activeGuests.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-blue-500" />
            Current Splits
          </h4>
          <div className="space-y-3">
            {activeGuests.map((guest) => {
              const guestSplits = tipSplits.filter(split => split.recipient_id === guest.id);
              const totalGuestAmount = guestSplits.reduce((sum, split) => sum + split.amount, 0);
              const hostSplits = tipSplits.filter(split => split.recipient_info?.is_host);
              const totalHostAmount = hostSplits.reduce((sum, split) => sum + split.amount, 0);
              
              return (
                <div key={guest.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <div>
                    <div className="font-medium text-white">{guest.username}</div>
                    <div className="text-sm text-gray-400">
                      Split: {100 - guest.tip_split_percentage}% host / {guest.tip_split_percentage}% guest
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-500">
                      {formatCurrency(totalGuestAmount)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {guestSplits.length} tips received
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Host Total */}
            <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg border border-gray-600">
              <div>
                <div className="font-medium text-white">Host Total</div>
                <div className="text-sm text-gray-400">
                  {activeGuests.length} active guests
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-blue-500">
                  {formatCurrency(splitAnalytics.host_revenue)}
                </div>
                <div className="text-xs text-gray-400">
                  {hostSplits.length} tips received
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Splits */}
      {tipSplits.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-300 mb-3">Recent Tip Splits</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {tipSplits.slice(0, 10).map((split) => (
              <div key={split.id} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                <div>
                  <div className="text-sm text-white">
                    {split.recipient_info?.username}
                    {split.recipient_info?.is_host && ' (Host)'}
                  </div>
                  <div className="text-xs text-gray-400">
                    From: {split.original_tip?.sender_username} • 
                    {formatCurrency(split.amount)} ({split.percentage}%)
                  </div>
                </div>
                <div className={`text-xs font-medium ${getStatusColor(split.status)}`}>
                  {split.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
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
              className="bg-gray-900 rounded-lg p-6 w-full max-w-lg"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Tip Split Settings</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-300">Auto Split Tips</label>
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, auto_split: !prev.auto_split }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.auto_split ? 'bg-blue-600' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.auto_split ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                
                <div>
                  <label className="block text-sm text-gray-300 mb-2">
                    Minimum Tip to Split: {formatCurrency(settings.minimum_tip_to_split)}
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="10"
                    step="0.5"
                    value={settings.minimum_tip_to_split}
                    onChange={(e) => setSettings(prev => ({ 
                      ...prev, 
                      minimum_tip_to_split: Number(e.target.value) 
                    }))}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm text-gray-300">Split Rules</label>
                  
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.split_rules.host_gets_bonus}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        split_rules: { ...prev.split_rules, host_gets_bonus: e.target.checked }
                      }))}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-300">Host gets minimum 50% bonus</span>
                  </label>
                  
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.split_rules.guest_engagement_multiplier}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        split_rules: { ...prev.split_rules, guest_engagement_multiplier: e.target.checked }
                      }))}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-300">Guest engagement multiplier (10%)</span>
                  </label>
                  
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.split_rules.raider_bonus}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        split_rules: { ...prev.split_rules, raider_bonus: e.target.checked }
                      }))}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-300">Raider bonus</span>
                  </label>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowSettings(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveSettings}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  {isLoading ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Split Details Modal */}
      <AnimatePresence>
        {showSplitDetails && (
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
              className="bg-gray-900 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Tip Split Details</h3>
              
              {tipSplits.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Split className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No tip splits yet</p>
                  <p className="text-sm">Tip splits will appear here when tips are received</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tipSplits.map((split) => (
                    <div key={split.id} className="p-4 bg-gray-800 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="font-medium text-white">
                            {split.recipient_info?.username}
                            {split.recipient_info?.is_host && ' (Host)'}
                          </div>
                          <div className="text-sm text-gray-400">
                            From: {split.original_tip?.sender_username}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-500">
                            {formatCurrency(split.amount)}
                          </div>
                          <div className="text-xs text-gray-400">
                            {split.percentage}% of {formatCurrency(split.original_tip?.total_amount || 0)}
                          </div>
                        </div>
                      </div>
                      
                      {split.original_tip?.message && (
                        <div className="text-sm text-gray-300 bg-gray-700 p-2 rounded">
                          "{split.original_tip.message}"
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                        <span>Status: <span className={getStatusColor(split.status)}>{split.status}</span></span>
                        <span>Processed: {split.processed_at ? new Date(split.processed_at).toLocaleString() : 'Pending'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowSplitDetails(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TipSplitSystem;