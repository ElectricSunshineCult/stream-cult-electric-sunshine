import React, { useState, useEffect } from 'react';
import { Clock, Lock, Shield, AlertTriangle, CheckCircle, User, MessageCircle, Users, Camera, Link } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Restriction {
  id: string;
  user_id: string;
  restriction_type: string;
  restriction_data: {
    premium_features_blocked: string[];
    allowed_features: string[];
    max_streaming_time: number;
  };
  is_active: boolean;
  start_time: string;
  end_time?: string;
  reason: string;
}

interface NewStreamerRestrictionsProps {
  userId: string;
  onRestrictionChange?: (restriction: Restriction | null) => void;
}

const NewStreamerRestrictions: React.FC<NewStreamerRestrictionsProps> = ({
  userId,
  onRestrictionChange
}) => {
  const [restriction, setRestriction] = useState<Restriction | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [streamingTime, setStreamingTime] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);

  const PREMIUM_FEATURES = [
    { id: 'messaging', name: 'Direct Messaging', icon: MessageCircle, description: 'Send private messages to other users' },
    { id: 'dming', name: 'Private DM', icon: User, description: 'Start private conversations' },
    { id: 'friend_adding', name: 'Add Friends', icon: Users, description: 'Add other users to your friends list' },
    { id: 'emote_uploading', name: 'Upload Emotes', icon: Camera, description: 'Upload custom emoticons' },
    { id: 'custom_url', name: 'Custom URL', icon: Link, description: 'Create a personalized profile URL' },
    { id: 'premium_themes', name: 'Premium Themes', icon: Shield, description: 'Access to premium color themes' },
    { id: 'analytics', name: 'Advanced Analytics', icon: CheckCircle, description: 'Detailed streaming analytics' }
  ];

  const BASIC_FEATURES = [
    { id: 'basic_chat', name: 'Basic Chat', icon: MessageCircle, description: 'Participate in stream chat' },
    { id: 'tipping', name: 'Tipping', icon: CheckCircle, description: 'Send tips to streamers' },
    { id: 'basic_viewing', name: 'Basic Viewing', icon: CheckCircle, description: 'Watch streams' },
    { id: 'reactions', name: 'Reactions', icon: CheckCircle, description: 'Use emotes and reactions' }
  ];

  useEffect(() => {
    loadRestriction();
    startTimer();
  }, [userId]);

  useEffect(() => {
    if (restriction && timeRemaining === 0 && !hasShownWelcome) {
      // Show welcome back message
      showWelcomeMessage();
      setHasShownWelcome(true);
      onRestrictionChange?.(null);
    }
  }, [timeRemaining, restriction]);

  const loadRestriction = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/restrictions/user/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data) {
          setRestriction(data);
          calculateTimeRemaining(data);
          onRestrictionChange?.(data);
        }
      }
    } catch (error) {
      console.error('Failed to load restriction:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTimeRemaining = (restriction: Restriction) => {
    if (!restriction.end_time) return;
    
    const endTime = new Date(restriction.end_time).getTime();
    const now = new Date().getTime();
    const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
    setTimeRemaining(remaining);
  };

  const startTimer = () => {
    const interval = setInterval(() => {
      setTimeRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    
    return () => clearInterval(interval);
  };

  const showWelcomeMessage = () => {
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3';
    toast.innerHTML = `
      <div class="flex items-center gap-3">
        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
        </svg>
        <div>
          <div class="font-semibold">Welcome to the full platform!</div>
          <div class="text-sm">You now have access to all premium features</div>
        </div>
      </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 5000);
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getFeatureStatus = (featureId: string) => {
    if (!restriction) return 'available';
    
    if (restriction.restriction_data.premium_features_blocked.includes(featureId)) {
      return 'blocked';
    }
    
    if (restriction.restriction_data.allowed_features.includes(featureId)) {
      return 'allowed';
    }
    
    return 'blocked';
  };

  const requestFeatureAccess = async (featureId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/restrictions/request-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          user_id: userId,
          feature_id: featureId,
          reason: 'User request for premium feature access'
        })
      });

      if (response.ok) {
        // Show success message
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg z-50';
        toast.textContent = 'Feature access request submitted!';
        document.body.appendChild(toast);
        setTimeout(() => document.body.removeChild(toast), 3000);
      }
    } catch (error) {
      console.error('Failed to request feature access:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!restriction) {
    return null; // No restrictions, show normal interface
  }

  return (
    <div className="space-y-4">
      {/* Header Warning */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-4 rounded-lg">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-lg">New Streamer Protection</h3>
            <p className="text-sm opacity-90">
              You're in your first 30 minutes. Some features are limited to ensure platform safety.
            </p>
          </div>
        </div>
      </div>

      {/* Time Remaining */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Time Remaining
          </h4>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            {showDetails ? 'Hide' : 'Show'} Details
          </button>
        </div>
        
        <div className="text-center">
          <div className="text-3xl font-bold text-white mb-2">
            {formatTime(timeRemaining)}
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-1000"
              style={{ width: `${(timeRemaining / 1800) * 100}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Full access in {formatTime(timeRemaining)}
          </p>
        </div>
      </div>

      {/* Feature Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Available Features */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Available Features
          </h4>
          <div className="space-y-2">
            {BASIC_FEATURES.map((feature) => (
              <div key={feature.id} className="flex items-center gap-3 p-2 bg-gray-700 rounded">
                <feature.icon className="w-4 h-4 text-green-400" />
                <div>
                  <div className="text-sm text-white font-medium">{feature.name}</div>
                  <div className="text-xs text-gray-400">{feature.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Restricted Features */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Coming Soon ({timeRemaining > 0 ? formatTime(timeRemaining) : 'Now!'})
          </h4>
          <div className="space-y-2">
            {PREMIUM_FEATURES.map((feature) => {
              const status = getFeatureStatus(feature.id);
              const isBlocked = status === 'blocked';
              
              return (
                <div 
                  key={feature.id} 
                  className={`flex items-center gap-3 p-2 rounded ${isBlocked ? 'bg-gray-700' : 'bg-green-900 bg-opacity-20'}`}
                >
                  <feature.icon className={`w-4 h-4 ${isBlocked ? 'text-amber-400' : 'text-green-400'}`} />
                  <div className="flex-1">
                    <div className={`text-sm font-medium ${isBlocked ? 'text-gray-300' : 'text-white'}`}>
                      {feature.name}
                    </div>
                    <div className="text-xs text-gray-400">{feature.description}</div>
                  </div>
                  {isBlocked && timeRemaining > 0 && (
                    <button
                      onClick={() => requestFeatureAccess(feature.id)}
                      disabled={isLoading}
                      className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded transition-colors"
                    >
                      Request
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detailed Information */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gray-800 rounded-lg p-4"
          >
            <h4 className="text-sm font-semibold text-gray-300 mb-3">Why These Restrictions?</h4>
            <div className="space-y-2 text-sm text-gray-400">
              <p>
                New streamer restrictions help prevent abuse by requiring users to engage with the 
                platform before accessing premium features. This ensures a better community experience.
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Prevents spam accounts from accessing premium features</li>
                <li>Encourages genuine community engagement</li>
                <li>Protects streamers from potential harassment</li>
                <li>Builds trust through verified user activity</li>
              </ul>
            </div>
            
            <div className="mt-4 p-3 bg-gray-700 rounded-lg">
              <h5 className="text-xs font-semibold text-gray-300 mb-2">Streaming Time Tracking</h5>
              <div className="text-sm text-white">
                Current: {Math.floor(streamingTime / 60)} minutes
              </div>
              <div className="text-xs text-gray-400">
                Maximum: {Math.floor(restriction.restriction_data.max_streaming_time / 60)} minutes
              </div>
              <div className="w-full bg-gray-600 rounded-full h-1 mt-2">
                <div 
                  className="bg-blue-500 h-1 rounded-full"
                  style={{ width: `${Math.min(100, (streamingTime / restriction.restriction_data.max_streaming_time) * 100)}%` }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress towards full access */}
      {timeRemaining > 0 && (
        <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold">Unlock All Features</h4>
              <p className="text-sm opacity-90">
                Keep using the platform and you'll get full access automatically
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">
                {Math.ceil(timeRemaining / 60)}
              </div>
              <div className="text-sm opacity-90">minutes left</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewStreamerRestrictions;