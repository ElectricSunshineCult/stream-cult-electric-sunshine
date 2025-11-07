import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
  Minimize
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

// Browser detection utility
const getBrowserInfo = () => {
  const userAgent = navigator.userAgent;
  const opera = userAgent.indexOf('OPR/') > -1 || !!window.opr;
  const firefox = userAgent.indexOf('Firefox') > -1;
  const safari = userAgent.indexOf('Safari') > -1 && userAgent.indexOf('Chrome') === -1;
  const chrome = userAgent.indexOf('Chrome') > -1 && !opera;
  const edge = userAgent.indexOf('Edg') > -1;
  
  let name = 'Unknown';
  let version = 'Unknown';
  
  if (opera) {
    name = 'Opera';
    const match = userAgent.match(/OPR\/(\d+)/);
    version = match ? match[1] : 'Unknown';
  } else if (firefox) {
    name = 'Firefox';
    const match = userAgent.match(/Firefox\/(\d+)/);
    version = match ? match[1] : 'Unknown';
  } else if (chrome) {
    name = 'Chrome';
    const match = userAgent.match(/Chrome\/(\d+)/);
    version = match ? match[1] : 'Unknown';
  } else if (edge) {
    name = 'Edge';
    const match = userAgent.match(/Edg\/(\d+)/);
    version = match ? match[1] : 'Unknown';
  } else if (safari) {
    name = 'Safari';
    const match = userAgent.match(/Version\/(\d+)/);
    version = match ? match[1] : 'Unknown';
  }
  
  return { name, version, isOpera: opera, isChrome: chrome, isFirefox: firefox, isSafari: safari, isEdge: edge };
};

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
}

// Browser Compatibility Indicator Component
const BrowserCompatibilityIndicator: React.FC = () => {
  const browserInfo = getBrowserInfo();
  
  const getBrowserIcon = (name: string) => {
    // Using Monitor icon as a generic browser icon since we don't have browser-specific icons
    return <Monitor className="h-4 w-4" />;
  };
  
  const getCompatibilityColor = (name: string) => {
    if (name === 'Opera' || name === 'Chrome' || name === 'Edge') return 'bg-green-100 text-green-800';
    if (name === 'Firefox') return 'bg-blue-100 text-blue-800';
    if (name === 'Safari') return 'bg-orange-100 text-orange-800';
    return 'bg-gray-100 text-gray-800';
  };
  
  const getFeatureSupport = (browser: string) => {
    const features = {
      'Opera': { screenShare: true, audioShare: true, fullscreen: true, quality: '4K' },
      'Chrome': { screenShare: true, audioShare: true, fullscreen: true, quality: '4K' },
      'Edge': { screenShare: true, audioShare: true, fullscreen: true, quality: '4K' },
      'Firefox': { screenShare: true, audioShare: true, fullscreen: true, quality: '1080p' },
      'Safari': { screenShare: true, audioShare: false, fullscreen: true, quality: '1080p' }
    };
    
    return features[browser] || { screenShare: false, audioShare: false, fullscreen: false, quality: 'Unknown' };
  };
  
  const support = getFeatureSupport(browserInfo.name);
  
  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getBrowserIcon(browserInfo.name)}
            <div>
              <h3 className="font-medium text-sm">
                {browserInfo.name} {browserInfo.version}
                {browserInfo.isOpera && (
                  <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                    Opera Detected
                  </span>
                )}
              </h3>
              <p className="text-xs text-muted-foreground">
                Screen sharing optimized for your browser
              </p>
            </div>
          </div>
          <Badge className={getCompatibilityColor(browserInfo.name)}>
            Full Support
          </Badge>
        </div>
        
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${support.screenShare ? 'bg-green-500' : 'bg-red-500'}`} />
            <span>Screen Share</span>
          </div>
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${support.audioShare ? 'bg-green-500' : 'bg-red-500'}`} />
            <span>Audio Share</span>
          </div>
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${support.fullscreen ? 'bg-green-500' : 'bg-red-500'}`} />
            <span>Fullscreen</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span>{support.quality}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const ScreenShareControls: React.FC<ScreenShareControlsProps> = ({
  streamId,
  streamerId,
  isStreamer,
  onScreenShareStart,
  onScreenShareStop
}) => {
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
    error: null
  });

  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);

  // Load quality presets
  useEffect(() => {
    const loadQualityPresets = async () => {
      try {
        const response = await fetch(`/api/screen-share/quality-presets`);
        const data = await response.json();
        setState(prev => ({
          ...prev,
          qualityPresets: data.presets,
          selectedQuality: data.presets.find((p: QualityPreset) => p.is_default)?.id || data.presets[0]?.id
        }));
      } catch (error) {
        console.error('Failed to load quality presets:', error);
        toast({
          title: "Error",
          description: "Failed to load quality settings",
          variant: "destructive"
        });
      }
    };

    if (isStreamer) {
      loadQualityPresets();
    }
  }, [isStreamer]);

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

  // Get available screen sharing sources
  const getScreenSources = async () => {
    try {
      const browserInfo = getBrowserInfo();
      
      // Opera/Chrome specific optimizations
      const constraints = browserInfo.isOpera || browserInfo.isChrome ? {
        video: {
          mediaSource: 'screen',
          width: { max: 3840, ideal: 1920 },
          height: { max: 2160, ideal: 1080 },
          frameRate: { max: 60, ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      } : {
        video: true,
        audio: true
      };

      // Request screen sharing permission
      const stream = await navigator.mediaDevices.getDisplayMedia(constraints);

      // Opera-specific enhancements
      if (browserInfo.isOpera) {
        console.log('Opera browser detected - enabling optimized screen sharing');
        // Ensure hardware acceleration is enabled for Opera
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          const settings = videoTrack.getSettings();
          console.log('Opera stream settings:', settings);
        }
      }

      streamRef.current = stream;
      
      // Get stream track information
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      
      if (videoTrack) {
        const settings = videoTrack.getSettings();
        const sessionType = determineSessionType(settings);
        
        setState(prev => ({
          ...prev,
          sessionType,
          includeAudio: !!audioTrack
        }));
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
  };

  const determineSessionType = (settings: MediaTrackSettings): 'screen' | 'application' | 'tab' | 'window' => {
    // This is a simplified approach - in a real implementation,
    // you'd need more sophisticated detection methods
    const { width, height } = settings;
    
    if (width && height) {
      if (width >= 1920 && height >= 1080) return 'screen';
      if (width <= 800 && height <= 600) return 'window';
    }
    
    return 'tab';
  };

  const startScreenShare = async () => {
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
      
      // Get screen share stream
      const stream = await getScreenSources();
      
      // Create session data
      const selectedPreset = state.qualityPresets.find(p => p.id === state.selectedQuality);
      const sessionData = {
        stream_id: streamId,
        streamer_id: streamerId,
        session_type: state.sessionType,
        title: state.streamTitle || 'Screen Share',
        description: state.description,
        quality_settings: {
          preset: selectedPreset,
          includeAudio: state.includeAudio,
          includeMicrophone: state.includeMicrophone
        }
      };

      // Start screen share session
      const response = await fetch('/api/screen-share/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData)
      });

      if (!response.ok) {
        throw new Error('Failed to start screen share session');
      }

      const { session } = await response.json();
      
      setState(prev => ({
        ...prev,
        isSharing: true,
        currentSession: session
      }));

      if (onScreenShareStart) {
        onScreenShareStart(session);
      }

      toast({
        title: "Screen Share Started",
        description: "Your screen share is now live!"
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
  };

  const stopScreenShare = async () => {
    try {
      // Stop local stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      // Stop screen share session
      if (state.currentSession) {
        const response = await fetch(`/api/screen-share/stop/${state.currentSession.id}`, {
          method: 'POST'
        });

        if (!response.ok) {
          throw new Error('Failed to stop screen share session');
        }
      }

      setState(prev => ({
        ...prev,
        isSharing: false,
        currentSession: null
      }));

      if (onScreenShareStop) {
        onScreenShareStop();
      }

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
  };

  const toggleFullscreen = () => {
    if (!previewRef.current) return;

    if (!state.isFullscreen) {
      previewRef.current.requestFullscreen();
      setState(prev => ({ ...prev, isFullscreen: true }));
    } else {
      document.exitFullscreen();
      setState(prev => ({ ...prev, isFullscreen: false }));
    }
  };

  if (!isStreamer) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MonitorShare className="h-5 w-5" />
            Screen Sharing
          </CardTitle>
          <CardDescription>
            Screen sharing controls are only available to streamers
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Browser Compatibility Indicator */}
      <BrowserCompatibilityIndicator />
      
      {/* Screen Share Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MonitorShare className="h-5 w-5" />
            Screen Sharing Controls
          </CardTitle>
          <CardDescription>
            Share your screen or application with viewers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {state.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {state.error}
            </div>
          )}

          {/* Session Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="session-type">Share Type</Label>
              <Select 
                value={state.sessionType} 
                onValueChange={(value: any) => setState(prev => ({ ...prev, sessionType: value }))}
                disabled={state.isSharing}
              >
                <SelectTrigger>
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
              <Label htmlFor="quality">Quality</Label>
              <Select 
                value={state.selectedQuality?.toString() || ''} 
                onValueChange={(value) => setState(prev => ({ ...prev, selectedQuality: parseInt(value) }))}
                disabled={state.isSharing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select quality" />
                </SelectTrigger>
                <SelectContent>
                  {state.qualityPresets.map(preset => (
                    <SelectItem key={preset.id} value={preset.id.toString()}>
                      {preset.name} ({preset.resolution}, {preset.framerate}fps)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Audio Settings */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="include-audio" className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
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
              <Label htmlFor="include-mic" className="flex items-center gap-2">
                {state.includeMicrophone ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
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

          {/* Session Info */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="share-title">Session Title</Label>
              <Input
                id="share-title"
                value={state.streamTitle}
                onChange={(e) => setState(prev => ({ ...prev, streamTitle: e.target.value }))}
                placeholder="What are you sharing?"
                disabled={state.isSharing}
                maxLength={100}
              />
            </div>

            <div>
              <Label htmlFor="share-description">Description (Optional)</Label>
              <Textarea
                id="share-description"
                value={state.description}
                onChange={(e) => setState(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what you're showing..."
                disabled={state.isSharing}
                rows={2}
                maxLength={500}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {!state.isSharing ? (
              <Button onClick={startScreenShare} className="flex-1">
                <Play className="h-4 w-4 mr-2" />
                Start Screen Share
              </Button>
            ) : (
              <Button onClick={stopScreenShare} variant="destructive" className="flex-1">
                <Square className="h-4 w-4 mr-2" />
                Stop Screen Share
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Live Preview */}
      {state.isSharing && state.showPreview && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Live Preview
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setState(prev => ({ ...prev, showPreview: !prev.showPreview }))}
                >
                  {state.showPreview ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                </Button>
                <Button size="sm" variant="outline" onClick={toggleFullscreen}>
                  {state.isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative bg-black rounded-lg overflow-hidden">
              <video
                ref={previewRef}
                autoPlay
                muted
                playsInline
                className="w-full h-auto max-h-96"
                style={{ 
                  transform: 'scaleX(-1)' // Mirror effect for better user experience
                }}
              />
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-sm">
                {state.currentSession?.title || 'Screen Share'} • Live
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ScreenShareControls;