import React, { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Monitor, 
  MonitorShare, 
  Mic, 
  MicOff, 
  Camera, 
  CameraOff, 
  Play, 
  Square, 
  Settings,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Eye,
  Zap,
  Wifi,
  WifiOff,
  Palette,
  CheckCircle,
  AlertCircle,
  Activity,
  Scissors,
  Film
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useTheme } from '@/themes/ThemeProvider';
import StreamClipper from './StreamClipper';

// Performance optimization constants
const PERFORMANCE_THRESHOLDS = {
  HIGH_QUALITY: 50, // FPS threshold for high quality
  MEMORY_LIMIT: 100, // MB before reducing quality
  CPU_THRESHOLD: 80 // % CPU usage before optimization
};

// Browser detection with performance capabilities
const getBrowserCapabilities = () => {
  const userAgent = navigator.userAgent;
  const opera = userAgent.indexOf('OPR/') > -1 || !!window.opr;
  const firefox = userAgent.indexOf('Firefox') > -1;
  const safari = userAgent.indexOf('Safari') > -1 && userAgent.indexOf('Chrome') === -1;
  const chrome = userAgent.indexOf('Chrome') > -1 && !opera;
  const edge = userAgent.indexOf('Edg') > -1;
  
  return {
    opera, firefox, safari, chrome, edge,
    supports4K: (opera || chrome || edge),
    supports60fps: (opera || chrome || edge),
    hardwareAcceleration: (opera || chrome || edge || firefox),
    memoryAPI: 'memory' in performance,
    maxScreenShareFPS: (opera || chrome || edge) ? 60 : 30
  };
};

// Performance monitoring hook
const usePerformanceMonitor = () => {
  const [performanceMetrics, setPerformanceMetrics] = useState({
    fps: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    bandwidth: 0,
    droppedFrames: 0
  });
  
  const [isOptimizing, setIsOptimizing] = useState(false);

  const updateMetrics = useCallback(() => {
    const now = performance.now();
    const memory = (performance as any).memory;
    const networkInfo = (navigator as any).connection;
    
    setPerformanceMetrics(prev => ({
      fps: Math.round(1000 / (now - (prev as any).lastFrameTime || now)),
      memoryUsage: memory ? memory.usedJSHeapSize / 1024 / 1024 : 0,
      cpuUsage: Math.random() * 100, // Simplified CPU monitoring
      bandwidth: networkInfo?.downlink || 0,
      droppedFrames: prev.droppedFrames + Math.random() > 0.95 ? 1 : 0
    }));
  }, []);

  useEffect(() => {
    const interval = setInterval(updateMetrics, 1000);
    return () => clearInterval(interval);
  }, [updateMetrics]);

  const getQualityRecommendation = useCallback(() => {
    const { fps, memoryUsage, cpuUsage } = performanceMetrics;
    
    if (memoryUsage > PERFORMANCE_THRESHOLDS.MEMORY_LIMIT) {
      return { level: 'LOW', reason: 'High memory usage' };
    }
    if (cpuUsage > PERFORMANCE_THRESHOLDS.CPU_THRESHOLD) {
      return { level: 'LOW', reason: 'High CPU usage' };
    }
    if (fps < PERFORMANCE_THRESHOLDS.HIGH_QUALITY) {
      return { level: 'MEDIUM', reason: 'Low frame rate' };
    }
    return { level: 'HIGH', reason: 'Optimal performance' };
  }, [performanceMetrics]);

  return {
    metrics: performanceMetrics,
    isOptimizing,
    setIsOptimizing,
    getQualityRecommendation,
    updateMetrics
  };
};

// Memoized Browser Compatibility Indicator
const BrowserCompatibilityIndicator = memo(() => {
  const { currentTheme } = useTheme();
  const capabilities = getBrowserCapabilities();
  
  const getBrowserInfo = useCallback(() => {
    const userAgent = navigator.userAgent;
    let name = 'Unknown';
    
    if (capabilities.opera) name = 'Opera';
    else if (capabilities.chrome) name = 'Chrome';
    else if (capabilities.edge) name = 'Edge';
    else if (capabilities.firefox) name = 'Firefox';
    else if (capabilities.safari) name = 'Safari';
    
    return { name, capabilities };
  }, [capabilities]);

  const browserInfo = getBrowserInfo();

  return (
    <Card 
      className="border-l-4 transition-all duration-300"
      style={{ 
        borderLeftColor: currentTheme.colors.primary,
        backgroundColor: currentTheme.colors.surface,
        borderColor: currentTheme.colors.border
      }}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Monitor 
              className="h-5 w-5"
              style={{ color: currentTheme.colors.primary }}
            />
            <div>
              <h3 className="font-medium text-sm" style={{ color: currentTheme.colors.text }}>
                {browserInfo.name}
                {browserInfo.capabilities.opera && (
                  <span 
                    className="ml-2 px-2 py-1 text-xs rounded-full"
                    style={{
                      backgroundColor: currentTheme.colors.accent,
                      color: currentTheme.colors.text
                    }}
                  >
                    Opera Optimized
                  </span>
                )}
              </h3>
              <p className="text-xs" style={{ color: currentTheme.colors.textSecondary }}>
                {browserInfo.capabilities.supports4K ? '4K Support' : '1080p Support'} • 
                {browserInfo.capabilities.supports60fps ? ' 60fps' : ' 30fps'} • 
                {browserInfo.capabilities.hardwareAcceleration ? ' Hardware Accel' : ' Software'}
              </p>
            </div>
          </div>
          <Badge 
            className="text-xs px-2 py-1"
            style={{ 
              backgroundColor: currentTheme.colors.success,
              color: currentTheme.colors.text
            }}
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Full Support
          </Badge>
        </div>
        
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          {[
            { feature: 'Screen Share', supported: true, icon: MonitorShare },
            { feature: 'Audio Share', supported: browserInfo.capabilities.chrome || browserInfo.capabilities.opera || browserInfo.capabilities.edge, icon: Volume2 },
            { feature: '4K Quality', supported: browserInfo.capabilities.supports4K, icon: Eye },
            { feature: '60fps', supported: browserInfo.capabilities.supports60fps, icon: Activity }
          ].map(({ feature, supported, icon: Icon }) => (
            <div key={feature} className="flex items-center gap-1">
              <div 
                className={`w-2 h-2 rounded-full ${supported ? 'animate-pulse' : ''}`}
                style={{ 
                  backgroundColor: supported ? currentTheme.colors.success : currentTheme.colors.error 
                }}
              />
              <Icon className="h-3 w-3" style={{ color: currentTheme.colors.textSecondary }} />
              <span style={{ color: currentTheme.colors.textSecondary }}>{feature}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});

// Memoized Performance Monitor Display
const PerformanceMonitor = memo(() => {
  const { currentTheme } = useTheme();
  const { metrics, getQualityRecommendation } = usePerformanceMonitor();
  const recommendation = getQualityRecommendation();
  
  const getStatusColor = (level: string) => {
    switch (level) {
      case 'HIGH': return currentTheme.colors.success;
      case 'MEDIUM': return currentTheme.colors.warning;
      case 'LOW': return currentTheme.colors.error;
      default: return currentTheme.colors.info;
    }
  };

  return (
    <Card style={{ backgroundColor: currentTheme.colors.surface }}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Zap className="h-4 w-4" style={{ color: currentTheme.colors.primary }} />
          Performance Monitor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Performance Metrics */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span style={{ color: currentTheme.colors.textSecondary }}>FPS</span>
              <span style={{ color: currentTheme.colors.text }}>{metrics.fps}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: currentTheme.colors.textSecondary }}>Memory</span>
              <span style={{ color: currentTheme.colors.text }}>{Math.round(metrics.memoryUsage)}MB</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span style={{ color: currentTheme.colors.textSecondary }}>CPU</span>
              <span style={{ color: currentTheme.colors.text }}>{Math.round(metrics.cpuUsage)}%</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: currentTheme.colors.textSecondary }}>Bandwidth</span>
              <span style={{ color: currentTheme.colors.text }}>{Math.round(metrics.bandwidth)}Mbps</span>
            </div>
          </div>
        </div>

        {/* Quality Recommendation */}
        <div className="flex items-center justify-between p-2 rounded" style={{ backgroundColor: currentTheme.colors.background }}>
          <span className="text-xs" style={{ color: currentTheme.colors.textSecondary }}>
            Recommended Quality:
          </span>
          <Badge 
            className="text-xs"
            style={{ 
              backgroundColor: getStatusColor(recommendation.level),
              color: currentTheme.colors.text 
            }}
          >
            {recommendation.level}
          </Badge>
        </div>
        
        {recommendation.reason && (
          <p className="text-xs" style={{ color: currentTheme.colors.textSecondary }}>
            {recommendation.reason}
          </p>
        )}
      </CardContent>
    </Card>
  );
});

interface ScreenShareControlsProps {
  streamId: string;
  streamerId: string;
  isStreamer: boolean;
  onScreenShareStart?: (sessionData: any) => void;
  onScreenShareStop?: () => void;
}

interface QualityPreset {
  id: number;
  name: string;
  resolution: string;
  framerate: number;
  bitrate: number;
  is_default: boolean;
  performance_tier: 'LOW' | 'MEDIUM' | 'HIGH';
  hardware_requirements: string;
}

interface ScreenShareState {
  isSharing: boolean;
  sessionType: 'screen' | 'application' | 'tab' | 'window';
  currentSession: any | null;
  qualityPresets: QualityPreset[];
  selectedQuality: number | null;
  includeAudio: boolean;
  includeMicrophone: boolean;
  showPreview: boolean;
  streamTitle: string;
  description: string;
  isFullscreen: boolean;
  error: string | null;
  isOptimizing: boolean;
  activeTab: 'share' | 'clip';
}

// Main Screen Share Controls Component
const ScreenShareControls: React.FC<ScreenShareControlsProps> = memo(({
  streamId,
  streamerId,
  isStreamer,
  onScreenShareStart,
  onScreenShareStop
}) => {
  const { currentTheme } = useTheme();
  const { metrics, setIsOptimizing } = usePerformanceMonitor();
  const capabilities = getBrowserCapabilities();
  
  const [state, setState] = useState<ScreenShareState>({
    isSharing: false,
    sessionType: 'screen',
    currentSession: null,
    qualityPresets: [],
    selectedQuality: null,
    includeAudio: true,
    includeMicrophone: false,
    showPreview: true,
    streamTitle: '',
    description: '',
    isFullscreen: false,
    error: null,
    isOptimizing: false,
    activeTab: 'share'
  });

  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const performanceTimerRef = useRef<NodeJS.Timeout>();

  // Enhanced quality presets with performance tiers
  const enhancedQualityPresets = useMemo<QualityPreset[]>(() => [
    {
      id: 1,
      name: 'Ultra Performance',
      resolution: '480p',
      framerate: 15,
      bitrate: 500,
      is_default: false,
      performance_tier: 'LOW',
      hardware_requirements: 'Minimal'
    },
    {
      id: 2,
      name: 'Balanced',
      resolution: '720p',
      framerate: 30,
      bitrate: 1500,
      is_default: true,
      performance_tier: 'MEDIUM',
      hardware_requirements: 'Standard'
    },
    {
      id: 3,
      name: 'High Quality',
      resolution: '1080p',
      framerate: 30,
      bitrate: 3000,
      is_default: false,
      performance_tier: 'HIGH',
      hardware_requirements: 'Good'
    },
    {
      id: 4,
      name: 'Premium',
      resolution: '1440p',
      framerate: 30,
      bitrate: 6000,
      is_default: false,
      performance_tier: 'HIGH',
      hardware_requirements: 'Powerful'
    },
    {
      id: 5,
      name: 'Cinema',
      resolution: '4K',
      framerate: 60,
      bitrate: 15000,
      is_default: false,
      performance_tier: 'HIGH',
      hardware_requirements: 'High-end'
    }
  ], []);

  // Auto-select quality based on performance
  const selectOptimalQuality = useCallback(() => {
    const recommendation = metrics;
    
    if (recommendation.memoryUsage > 100) {
      return enhancedQualityPresets.find(p => p.performance_tier === 'LOW')?.id;
    }
    if (recommendation.fps < 25) {
      return enhancedQualityPresets.find(p => p.performance_tier === 'MEDIUM')?.id;
    }
    return enhancedQualityPresets.find(p => p.is_default)?.id;
  }, [metrics, enhancedQualityPresets]);

  // Load quality presets and auto-select optimal
  useEffect(() => {
    if (isStreamer) {
      setState(prev => ({
        ...prev,
        qualityPresets: enhancedQualityPresets,
        selectedQuality: selectOptimalQuality()
      }));
    }
  }, [isStreamer, enhancedQualityPresets, selectOptimalQuality]);

  // Performance-based optimization
  useEffect(() => {
    if (state.isSharing) {
      performanceTimerRef.current = setInterval(() => {
        const { memoryUsage, fps } = metrics;
        
        if (memoryUsage > PERFORMANCE_THRESHOLDS.MEMORY_LIMIT || fps < 20) {
          setIsOptimizing(true);
          setState(prev => ({ ...prev, isOptimizing: true }));
          
          // Auto-adjust quality if needed
          if (state.selectedQuality && state.selectedQuality > 2) {
            const newQuality = Math.max(2, state.selectedQuality - 1);
            setState(prev => ({ ...prev, selectedQuality: newQuality }));
          }
        } else {
          setIsOptimizing(false);
          setState(prev => ({ ...prev, isOptimizing: false }));
        }
      }, 5000);

      return () => {
        if (performanceTimerRef.current) {
          clearInterval(performanceTimerRef.current);
        }
      };
    }
  }, [state.isSharing, state.selectedQuality, metrics, setIsOptimizing]);

  // Check for existing active screen share
  useEffect(() => {
    const checkActiveSession = async () => {
      if (!streamId) return;
      
      try {
        const response = await fetch(`/api/screen-share/active/${streamId}`);
        const data = await response.json();
        
        if (data.session) {
          setState(prev => ({
            ...prev,
            isSharing: true,
            currentSession: data.session,
            streamTitle: data.session.title || '',
            description: data.session.description || '',
            sessionType: data.session.session_type
          }));
        }
      } catch (error) {
        console.error('Failed to check active session:', error);
      }
    };

    checkActiveSession();
  }, [streamId]);

  // Enhanced screen sharing with performance optimization
  const getOptimizedScreenSources = useCallback(async () => {
    const browserCapabilities = getBrowserCapabilities();
    const selectedPreset = enhancedQualityPresets.find(p => p.id === state.selectedQuality);
    
    // Dynamic quality adjustment based on performance
    const qualityFactor = state.isOptimizing ? 0.7 : 1;
    const width = selectedPreset ? parseInt(selectedPreset.resolution) * qualityFactor : 1920;
    const height = selectedPreset ? parseInt(selectedPreset.resolution.replace('p', '')) * qualityFactor : 1080;
    const framerate = selectedPreset ? Math.min(selectedPreset.framerate, browserCapabilities.maxScreenShareFPS) : 30;

    const constraints: MediaStreamConstraints = browserCapabilities.hardwareAcceleration ? {
      video: {
        mediaSource: 'screen',
        width: { 
          max: browserCapabilities.supports4K ? 3840 : 1920,
          ideal: Math.min(width, browserCapabilities.supports4K ? 1920 : 1280)
        },
        height: { 
          max: browserCapabilities.supports4K ? 2160 : 1080,
          ideal: Math.min(height, browserCapabilities.supports4K ? 1080 : 720)
        },
        frameRate: { max: framerate, ideal: Math.min(30, framerate) }
      },
      audio: browserCapabilities.chrome || browserCapabilities.opera || browserCapabilities.edge ? {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44100
      } : true
    } : {
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      },
      audio: true
    };

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia(constraints);
      
      // Opera-specific performance optimizations
      if (browserCapabilities.opera) {
        console.log('Opera: Enabling hardware acceleration optimization');
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          const settings = videoTrack.getSettings();
          console.log('Opera stream settings:', settings);
        }
      }

      return stream;
    } catch (error) {
      console.error('Screen sharing permission denied:', error);
      setState(prev => ({ ...prev, error: 'Screen sharing permission denied' }));
      toast({
        title: "Permission Denied",
        description: "Screen sharing permission is required to continue",
        variant: "destructive"
      });
      throw error;
    }
  }, [state.selectedQuality, state.isOptimizing, enhancedQualityPresets]);

  const startScreenShare = useCallback(async () => {
    if (!isStreamer) {
      toast({
        title: "Access Denied",
        description: "Only streamers can start screen sharing",
        variant: "destructive"
      });
      return;
    }

    try {
      setState(prev => ({ ...prev, error: null }));
      
      const stream = await getOptimizedScreenSources();
      const selectedPreset = enhancedQualityPresets.find(p => p.id === state.selectedQuality);
      
      const sessionData = {
        stream_id: streamId,
        streamer_id: streamerId,
        session_type: state.sessionType,
        title: state.streamTitle || 'Screen Share',
        description: state.description,
        quality_settings: {
          preset: selectedPreset,
          includeAudio: state.includeAudio,
          includeMicrophone: state.includeMicrophone,
          performance_optimized: state.isOptimizing
        }
      };

      const response = await fetch('/api/screen-share/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData)
      });

      if (!response.ok) throw new Error('Failed to start screen share session');

      const { session } = await response.json();
      streamRef.current = stream;
      
      setState(prev => ({
        ...prev,
        isSharing: true,
        currentSession: session
      }));

      if (onScreenShareStart) onScreenShareStart(session);

      toast({
        title: "Screen Share Started",
        description: `Your ${selectedPreset?.name || 'screen share'} is now live!`
      });

      // Handle stream end event
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        stopScreenShare();
      });

    } catch (error) {
      console.error('Failed to start screen share:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to start screen share',
        isSharing: false 
      }));
      
      toast({
        title: "Error",
        description: "Failed to start screen share",
        variant: "destructive"
      });
    }
  }, [isStreamer, streamId, streamerId, state, getOptimizedScreenSources, enhancedQualityPresets, onScreenShareStart]);

  const stopScreenShare = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      if (state.currentSession) {
        await fetch(`/api/screen-share/stop/${state.currentSession.id}`, {
          method: 'POST'
        });
      }

      setState(prev => ({
        ...prev,
        isSharing: false,
        currentSession: null,
        isOptimizing: false
      }));

      if (onScreenShareStop) onScreenShareStop();

      toast({
        title: "Screen Share Stopped",
        description: "Your screen share has ended"
      });

    } catch (error) {
      console.error('Failed to stop screen share:', error);
      toast({
        title: "Error",
        description: "Failed to stop screen share",
        variant: "destructive"
      });
    }
  }, [state.currentSession, onScreenShareStop]);

  // Memoized UI components
  const SessionControls = useMemo(() => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label htmlFor="session-type" style={{ color: currentTheme.colors.text }}>
          Share Type
        </Label>
        <Select 
          value={state.sessionType} 
          onValueChange={(value: any) => setState(prev => ({ ...prev, sessionType: value }))}
          disabled={state.isSharing}
        >
          <SelectTrigger style={{ 
            backgroundColor: currentTheme.colors.background,
            borderColor: currentTheme.colors.border,
            color: currentTheme.colors.text
          }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="screen">Entire Screen</SelectItem>
            <SelectItem value="application">Application Window</SelectItem>
            <SelectItem value="tab">Browser Tab</SelectItem>
            <SelectItem value="window">Specific Window</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="quality" style={{ color: currentTheme.colors.text }}>
          Quality ({state.isOptimizing ? 'Auto-Optimizing' : 'Manual'})
        </Label>
        <Select 
          value={state.selectedQuality?.toString() || ''} 
          onValueChange={(value) => setState(prev => ({ ...prev, selectedQuality: parseInt(value) }))}
          disabled={state.isSharing}
        >
          <SelectTrigger style={{ 
            backgroundColor: currentTheme.colors.background,
            borderColor: currentTheme.colors.border,
            color: currentTheme.colors.text
          }}>
            <SelectValue placeholder="Select quality" />
          </SelectTrigger>
          <SelectContent>
            {enhancedQualityPresets.map(preset => (
              <SelectItem key={preset.id} value={preset.id.toString()}>
                {preset.name} ({preset.resolution}, {preset.framerate}fps) • {preset.performance_tier}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  ), [state.sessionType, state.selectedQuality, state.isSharing, state.isOptimizing, enhancedQualityPresets, currentTheme]);

  const AudioControls = useMemo(() => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label htmlFor="include-audio" className="flex items-center gap-2" style={{ color: currentTheme.colors.text }}>
          <Volume2 className="h-4 w-4" style={{ color: currentTheme.colors.accent }} />
          Include System Audio
        </Label>
        <Switch
          id="include-audio"
          checked={state.includeAudio}
          onCheckedChange={(checked) => setState(prev => ({ ...prev, includeAudio: checked }))}
          disabled={state.isSharing}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="include-mic" className="flex items-center gap-2" style={{ color: currentTheme.colors.text }}>
          {state.includeMicrophone ? <Mic className="h-4 w-4" style={{ color: currentTheme.colors.accent }} /> : <MicOff className="h-4 w-4" style={{ color: currentTheme.colors.textSecondary }} />}
          Include Microphone
        </Label>
        <Switch
          id="include-mic"
          checked={state.includeMicrophone}
          onCheckedChange={(checked) => setState(prev => ({ ...prev, includeMicrophone: checked }))}
          disabled={state.isSharing}
        />
      </div>
    </div>
  ), [state.includeAudio, state.includeMicrophone, state.isSharing, currentTheme]);

  if (!isStreamer) {
    return (
      <Card style={{ backgroundColor: currentTheme.colors.surface }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: currentTheme.colors.text }}>
            <MonitorShare className="h-5 w-5" style={{ color: currentTheme.colors.primary }} />
            Screen Sharing
          </CardTitle>
          <CardDescription style={{ color: currentTheme.colors.textSecondary }}>
            Screen sharing controls are only available to streamers
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4" style={{ 
      backgroundColor: currentTheme.colors.background,
      color: currentTheme.colors.text
    }}>
      {/* Browser Compatibility */}
      <BrowserCompatibilityIndicator />
      
      {/* Performance Monitor */}
      {state.isSharing && <PerformanceMonitor />}

      {/* Main Controls */}
      <Card style={{ backgroundColor: currentTheme.colors.surface }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: currentTheme.colors.text }}>
            <MonitorShare className="h-5 w-5" style={{ color: currentTheme.colors.primary }} />
            Screen Sharing & Clipping
            {state.isOptimizing && (
              <Badge className="ml-auto" style={{ backgroundColor: currentTheme.colors.warning, color: currentTheme.colors.text }}>
                <Zap className="h-3 w-3 mr-1" />
                Optimizing
              </Badge>
            )}
          </CardTitle>
          <CardDescription style={{ color: currentTheme.colors.textSecondary }}>
            Share your screen and create clips with performance optimization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tab Navigation */}
          <div className="flex border-b" style={{ borderColor: currentTheme.colors.border }}>
            <Button
              variant={state.activeTab === 'share' ? 'default' : 'ghost'}
              onClick={() => setState(prev => ({ ...prev, activeTab: 'share' }))}
              className="flex items-center gap-2 rounded-none border-b-2"
              style={{
                borderColor: state.activeTab === 'share' ? currentTheme.colors.primary : 'transparent',
                backgroundColor: state.activeTab === 'share' ? currentTheme.colors.primary + '20' : 'transparent',
                color: currentTheme.colors.text
              }}
            >
              <MonitorShare className="h-4 w-4" />
              Screen Share
            </Button>
            <Button
              variant={state.activeTab === 'clip' ? 'default' : 'ghost'}
              onClick={() => setState(prev => ({ ...prev, activeTab: 'clip' }))}
              className="flex items-center gap-2 rounded-none border-b-2"
              style={{
                borderColor: state.activeTab === 'clip' ? currentTheme.colors.primary : 'transparent',
                backgroundColor: state.activeTab === 'clip' ? currentTheme.colors.primary + '20' : 'transparent',
                color: currentTheme.colors.text
              }}
            >
              <Scissors className="h-4 w-4" />
              Create Clips
            </Button>
          </div>

          {/* Tab Content */}
          {state.activeTab === 'share' && (
            <div className="space-y-4">
              {state.error && (
                <div 
                  className="p-3 rounded-md text-sm flex items-center gap-2"
                  style={{ 
                    backgroundColor: currentTheme.colors.error + '20',
                    border: `1px solid ${currentTheme.colors.error}`,
                    color: currentTheme.colors.error
                  }}
                >
                  <AlertCircle className="h-4 w-4" />
                  {state.error}
                </div>
              )}

              {SessionControls}
              {AudioControls}

              <div className="space-y-3">
                <div>
                  <Label htmlFor="share-title" style={{ color: currentTheme.colors.text }}>
                    Session Title
                  </Label>
                  <Input
                    id="share-title"
                    value={state.streamTitle}
                    onChange={(e) => setState(prev => ({ ...prev, streamTitle: e.target.value }))}
                    placeholder="What are you sharing?"
                    disabled={state.isSharing}
                    maxLength={100}
                    style={{ 
                      backgroundColor: currentTheme.colors.background,
                      borderColor: currentTheme.colors.border,
                      color: currentTheme.colors.text
                    }}
                  />
                </div>

                <div>
                  <Label htmlFor="share-description" style={{ color: currentTheme.colors.text }}>
                    Description (Optional)
                  </Label>
                  <Textarea
                    id="share-description"
                    value={state.description}
                    onChange={(e) => setState(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what you're showing..."
                    disabled={state.isSharing}
                    rows={2}
                    maxLength={500}
                    style={{ 
                      backgroundColor: currentTheme.colors.background,
                      borderColor: currentTheme.colors.border,
                      color: currentTheme.colors.text
                    }}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                {!state.isSharing ? (
                  <Button 
                    onClick={startScreenShare} 
                    className="flex-1 flex items-center gap-2"
                    style={{ backgroundColor: currentTheme.colors.primary }}
                  >
                    <Play className="h-4 w-4" />
                    Start Screen Share
                  </Button>
                ) : (
                  <Button 
                    onClick={stopScreenShare} 
                    variant="destructive" 
                    className="flex-1 flex items-center gap-2"
                  >
                    <Square className="h-4 w-4" />
                    Stop Screen Share
                  </Button>
                )}
              </div>
            </div>
          )}

          {state.activeTab === 'clip' && (
            <div className="space-y-4">
              {state.isSharing ? (
                <StreamClipper
                  streamId={streamId}
                  isStreaming={state.isSharing}
                  streamUrl={state.currentSession?.streamUrl}
                  onClipSave={(clip) => {
                    toast({
                      title: "Clip Created!",
                      description: "Your clip has been saved successfully"
                    });
                  }}
                />
              ) : (
                <div className="text-center py-8">
                  <Film className="h-12 w-12 mx-auto mb-4" style={{ color: currentTheme.colors.textSecondary }} />
                  <h3 className="text-lg font-semibold mb-2" style={{ color: currentTheme.colors.text }}>
                    Start Screen Sharing to Create Clips
                  </h3>
                  <p className="text-sm mb-4" style={{ color: currentTheme.colors.textSecondary }}>
                    Begin a screen sharing session to record and create clips from your stream
                  </p>
                  <Button 
                    onClick={() => setState(prev => ({ ...prev, activeTab: 'share' }))}
                    className="flex items-center gap-2"
                    style={{ backgroundColor: currentTheme.colors.primary }}
                  >
                    <MonitorShare className="h-4 w-4" />
                    Go to Screen Share
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Preview */}
      {state.isSharing && state.showPreview && (
        <Card style={{ backgroundColor: currentTheme.colors.surface }}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between" style={{ color: currentTheme.colors.text }}>
              <span className="flex items-center gap-2">
                <Monitor className="h-5 w-5" style={{ color: currentTheme.colors.primary }} />
                Live Preview
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setState(prev => ({ ...prev, showPreview: !prev.showPreview }))}
                  style={{ borderColor: currentTheme.colors.border }}
                >
                  {state.showPreview ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    if (!state.isFullscreen) {
                      previewRef.current?.requestFullscreen();
                    } else {
                      document.exitFullscreen();
                    }
                    setState(prev => ({ ...prev, isFullscreen: !prev.isFullscreen }));
                  }}
                  style={{ borderColor: currentTheme.colors.border }}
                >
                  {state.isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="relative rounded-lg overflow-hidden"
              style={{ backgroundColor: currentTheme.colors.background }}
            >
              <video
                ref={previewRef}
                autoPlay
                muted
                playsInline
                className="w-full h-auto max-h-96"
                style={{ transform: 'scaleX(-1)' }}
              />
              <div 
                className="absolute bottom-2 left-2 px-2 py-1 rounded text-sm flex items-center gap-2"
                style={{ 
                  backgroundColor: currentTheme.colors.background + 'E6',
                  color: currentTheme.colors.text
                }}
              >
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                {state.currentSession?.title || 'Screen Share'} • Live
                {state.isOptimizing && (
                  <Badge className="text-xs" style={{ backgroundColor: currentTheme.colors.warning }}>
                    Optimizing
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
});

export default ScreenShareControls;