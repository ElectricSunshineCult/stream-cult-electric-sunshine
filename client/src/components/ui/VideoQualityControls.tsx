import React, { useState, useEffect } from 'react';
import { Monitor, Smartphone, Tablet, Settings, Wifi, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface VideoQualitySettings {
  id?: string;
  user_id: string;
  quality_preference: 'auto' | 'low' | 'medium' | 'high' | 'ultra';
  resolution: 'auto' | '360p' | '480p' | '720p' | '1080p' | '1440p' | '4k';
  bitrate_kbps: number;
  framerate: 30 | 60 | 120;
  device_type: 'desktop' | 'tablet' | 'mobile';
  network_speed: 'slow' | 'medium' | 'fast' | 'unknown';
  auto_quality: boolean;
  adaptive_streaming: boolean;
}

interface VideoQualityControlsProps {
  userId: string;
  currentViewers?: number;
  isLive?: boolean;
}

const VideoQualityControls: React.FC<VideoQualityControlsProps> = ({
  userId,
  currentViewers = 0,
  isLive = true
}) => {
  const [settings, setSettings] = useState<VideoQualitySettings>({
    user_id: userId,
    quality_preference: 'auto',
    resolution: 'auto',
    bitrate_kbps: 0,
    framerate: 30,
    device_type: 'desktop',
    network_speed: 'unknown',
    auto_quality: true,
    adaptive_streaming: true
  });
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor'>('unknown');

  // Detect device type
  useEffect(() => {
    const detectDeviceType = () => {
      const userAgent = navigator.userAgent;
      if (/mobile/i.test(userAgent)) {
        setSettings(prev => ({ ...prev, device_type: 'mobile' }));
      } else if (/tablet|ipad/i.test(userAgent)) {
        setSettings(prev => ({ ...prev, device_type: 'tablet' }));
      } else {
        setSettings(prev => ({ ...prev, device_type: 'desktop' }));
      }
    };

    detectDeviceType();
    loadSettings();
  }, [userId]);

  // Test connection speed
  useEffect(() => {
    testConnectionSpeed();
  }, []);

  const testConnectionSpeed = async () => {
    try {
      const startTime = performance.now();
      const testImage = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
      const img = new Image();
      
      img.onload = () => {
        const endTime = performance.now();
        const duration = (endTime - startTime) / 1000;
        const bitsLoaded = 1024 * 8; // 1KB test
        const speedMbps = (bitsLoaded / duration / 1024 / 1024);
        
        if (speedMbps > 10) {
          setConnectionQuality('excellent');
          setSettings(prev => ({ ...prev, network_speed: 'fast' }));
        } else if (speedMbps > 3) {
          setConnectionQuality('good');
          setSettings(prev => ({ ...prev, network_speed: 'medium' }));
        } else {
          setConnectionQuality('poor');
          setSettings(prev => ({ ...prev, network_speed: 'slow' }));
        }
      };
      
      img.onerror = () => {
        setConnectionQuality('poor');
        setSettings(prev => ({ ...prev, network_speed: 'slow' }));
      };
      
      img.src = testImage;
    } catch (error) {
      console.error('Connection speed test failed:', error);
      setSettings(prev => ({ ...prev, network_speed: 'unknown' }));
    }
  };

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/video-quality/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Failed to load video quality settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (newSettings: VideoQualitySettings) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/video-quality/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newSettings)
      });
      
      if (response.ok) {
        setSettings(newSettings);
        setIsOpen(false);
        // Show success toast
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg z-50';
        toast.textContent = 'Video quality settings saved!';
        document.body.appendChild(toast);
        setTimeout(() => document.body.removeChild(toast), 3000);
      }
    } catch (error) {
      console.error('Failed to save video quality settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getQualityRecommendation = () => {
    if (settings.auto_quality) return 'Auto';
    
    const recommendations = {
      excellent: { resolution: '1080p', framerate: 60 },
      good: { resolution: '720p', framerate: 30 },
      poor: { resolution: '480p', framerate: 30 }
    };
    
    return recommendations[connectionQuality as keyof typeof recommendations] || 'Auto';
  };

  const getDeviceIcon = () => {
    switch (settings.device_type) {
      case 'mobile': return <Smartphone className="w-4 h-4" />;
      case 'tablet': return <Tablet className="w-4 h-4" />;
      default: return <Monitor className="w-4 h-4" />;
    }
  };

  const getConnectionIcon = () => {
    switch (connectionQuality) {
      case 'excellent': return <Zap className="w-4 h-4 text-green-500" />;
      case 'good': return <Wifi className="w-4 h-4 text-yellow-500" />;
      case 'poor': return <Wifi className="w-4 h-4 text-red-500" />;
      default: return <Wifi className="w-4 h-4 text-gray-500" />;
    }
  };

  const handleSettingChange = (key: keyof VideoQualitySettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
      >
        {getDeviceIcon()}
        {getConnectionIcon()}
        <Settings className="w-4 h-4" />
        {settings.quality_preference !== 'auto' && (
          <span className="text-sm font-medium">
            {settings.resolution}@{settings.framerate}
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 top-full mt-2 w-80 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50"
          >
            <div className="p-4">
              <h3 className="text-lg font-semibold text-white mb-4">Video Quality Settings</h3>
              
              {/* Connection Status */}
              <div className="mb-4 p-3 bg-gray-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-300">Connection Quality</span>
                  {getConnectionIcon()}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white capitalize">{connectionQuality}</span>
                  <span className="text-xs text-gray-400">
                    {settings.network_speed} network
                  </span>
                </div>
              </div>

              {/* Auto Quality Toggle */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-gray-300">Auto Quality</label>
                  <button
                    onClick={() => handleSettingChange('auto_quality', !settings.auto_quality)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.auto_quality ? 'bg-blue-600' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.auto_quality ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                <p className="text-xs text-gray-400">
                  Automatically adjust quality based on your connection
                </p>
              </div>

              {/* Quality Selection (only if not auto) */}
              {!settings.auto_quality && (
                <>
                  <div className="mb-4">
                    <label className="text-sm text-gray-300 block mb-2">Quality</label>
                    <select
                      value={settings.quality_preference}
                      onChange={(e) => handleSettingChange('quality_preference', e.target.value)}
                      className="w-full p-2 bg-gray-800 text-white border border-gray-600 rounded-lg"
                    >
                      <option value="low">Low (480p)</option>
                      <option value="medium">Medium (720p)</option>
                      <option value="high">High (1080p)</option>
                      <option value="ultra">Ultra (1440p)</option>
                    </select>
                  </div>

                  <div className="mb-4">
                    <label className="text-sm text-gray-300 block mb-2">Frame Rate</label>
                    <select
                      value={settings.framerate}
                      onChange={(e) => handleSettingChange('framerate', Number(e.target.value))}
                      className="w-full p-2 bg-gray-800 text-white border border-gray-600 rounded-lg"
                    >
                      <option value={30}>30 FPS</option>
                      <option value={60}>60 FPS</option>
                      <option value={120}>120 FPS</option>
                    </select>
                  </div>
                </>
              )}

              {/* Adaptive Streaming */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-gray-300">Adaptive Streaming</label>
                  <button
                    onClick={() => handleSettingChange('adaptive_streaming', !settings.adaptive_streaming)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.adaptive_streaming ? 'bg-blue-600' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.adaptive_streaming ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                <p className="text-xs text-gray-400">
                  Continuously optimize quality during playback
                </p>
              </div>

              {/* Stream Info */}
              {isLive && (
                <div className="mb-4 p-3 bg-gray-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Stream Info</span>
                    <span className="text-sm text-green-400">LIVE</span>
                  </div>
                  <div className="mt-2 text-xs text-gray-400">
                    <div>Viewers: {currentViewers}</div>
                    <div>Device: {settings.device_type}</div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={testConnectionSpeed}
                  disabled={isLoading}
                  className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
                >
                  Test Speed
                </button>
                <button
                  onClick={() => saveSettings(settings)}
                  disabled={isLoading}
                  className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                >
                  {isLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VideoQualityControls;