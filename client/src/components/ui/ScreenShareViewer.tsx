import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Monitor, 
  MonitorShare, 
  Users, 
  Clock, 
  Volume2, 
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  Play,
  Square,
  Loader2
} from "lucide-react";
import { useScreenShare } from '@/hooks/use-screen-share';
import { toast } from "@/hooks/use-toast";

interface ScreenShareViewerProps {
  streamId: string;
  isLive: boolean;
}

const ScreenShareViewer: React.FC<ScreenShareViewerProps> = ({
  streamId,
  isLive
}) => {
  const {
    isScreenSharing,
    currentSession,
    availableSessions,
    isJoining,
    joinSession,
    leaveSession
  } = useScreenShare();

  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'fair' | 'poor'>('good');
  const [isLoading, setIsLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-join active screen share when component loads
  useEffect(() => {
    const autoJoinActiveSession = async () => {
      if (isLive && availableSessions.length > 0 && !currentSession) {
        const activeSession = availableSessions.find(s => s.is_active);
        if (activeSession) {
          setSelectedSession(activeSession);
          await handleJoinSession(activeSession);
        }
      }
    };

    autoJoinActiveSession();
  }, [isLive, availableSessions, currentSession]);

  // Monitor connection quality
  useEffect(() => {
    if (currentSession && videoRef.current) {
      const video = videoRef.current;
      
      const handleLoadStart = () => setIsLoading(true);
      const handleCanPlay = () => setIsLoading(false);
      const handleError = () => {
        setIsLoading(false);
        setConnectionQuality('poor');
        toast({
          title: "Connection Issue",
          description: "Having trouble loading the screen share",
          variant: "destructive"
        });
      };

      video.addEventListener('loadstart', handleLoadStart);
      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('error', handleError);

      return () => {
        video.removeEventListener('loadstart', handleLoadStart);
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('error', handleError);
      };
    }
  }, [currentSession]);

  const handleJoinSession = async (session: any) => {
    if (!session || isJoining) return;

    try {
      await joinSession(session.id, streamId);
      setSelectedSession(session);
    } catch (error) {
      console.error('Failed to join session:', error);
    }
  };

  const handleLeaveSession = async () => {
    if (!currentSession) return;

    try {
      await leaveSession(currentSession.id);
      setSelectedSession(null);
    } catch (error) {
      console.error('Failed to leave session:', error);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
  };

  const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    if (videoRef.current) {
      videoRef.current.muted = newMutedState;
    }
  };

  const getSessionTypeIcon = (type: string) => {
    switch (type) {
      case 'screen': return <Monitor className="h-4 w-4" />;
      case 'application': return <MonitorShare className="h-4 w-4" />;
      case 'tab': return <MonitorShare className="h-4 w-4" />;
      case 'window': return <MonitorShare className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  const getSessionTypeName = (type: string) => {
    switch (type) {
      case 'screen': return 'Entire Screen';
      case 'application': return 'Application';
      case 'tab': return 'Browser Tab';
      case 'window': return 'Window';
      default: return 'Unknown';
    }
  };

  const getConnectionQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'bg-green-500';
      case 'good': return 'bg-yellow-500';
      case 'fair': return 'bg-orange-500';
      case 'poor': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (!isLive) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MonitorShare className="h-5 w-5" />
            Screen Sharing
          </CardTitle>
          <CardDescription>
            Screen sharing is only available during live streams
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div ref={containerRef} className="space-y-4">
      {/* Screen Share Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <MonitorShare className="h-5 w-5" />
              Screen Sharing
            </span>
            {isScreenSharing && (
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                Live
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isScreenSharing ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Active Sessions:</span>
                <span className="font-medium">{availableSessions.length}</span>
              </div>
              
              {availableSessions.length > 0 && (
                <div className="space-y-2">
                  <span className="text-sm font-medium">Available Sessions:</span>
                  {availableSessions.map((session) => (
                    <div 
                      key={session.id}
                      className="flex items-center justify-between p-2 border rounded-md"
                    >
                      <div className="flex items-center gap-2">
                        {getSessionTypeIcon(session.session_type)}
                        <div>
                          <p className="font-medium text-sm">{session.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {getSessionTypeName(session.session_type)} • {session.streamer_name}
                          </p>
                        </div>
                      </div>
                      
                      {currentSession?.id === session.id ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleLeaveSession}
                        >
                          <Square className="h-3 w-3 mr-1" />
                          Leave
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleJoinSession(session)}
                          disabled={isJoining}
                        >
                          {isJoining ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <Play className="h-3 w-3 mr-1" />
                          )}
                          Join
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No active screen sharing sessions
            </p>
          )}
        </CardContent>
      </Card>

      {/* Screen Share Display */}
      {currentSession && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                {currentSession.title}
              </span>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getConnectionQualityColor(connectionQuality)}`} />
                <span className="text-xs text-muted-foreground capitalize">
                  {connectionQuality}
                </span>
              </div>
            </CardTitle>
            <CardDescription>
              {currentSession.description || `${getSessionTypeName(currentSession.session_type)} sharing by ${currentSession.streamer_name}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Video Display */}
            <div className="relative bg-black rounded-lg overflow-hidden">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-10">
                  <div className="text-center text-white">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p className="text-sm">Loading screen share...</p>
                  </div>
                </div>
              )}
              
              {/* Placeholder for actual video stream */}
              <div className="aspect-video bg-gray-800 flex items-center justify-center">
                <div className="text-center text-white">
                  <Monitor className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">{currentSession.title}</p>
                  <p className="text-sm opacity-75">
                    Shared by {currentSession.streamer_name}
                  </p>
                  <p className="text-xs opacity-50 mt-2">
                    Screen sharing video would be displayed here
                  </p>
                </div>
              </div>

              {/* Video Controls Overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={toggleMute}
                      className="text-white hover:bg-white/20"
                    >
                      {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </Button>
                    
                    <div className="flex items-center gap-2">
                      <Volume2 className="h-3 w-3 text-white" />
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={volume}
                        onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                        className="w-16 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={toggleFullscreen}
                      className="text-white hover:bg-white/20"
                    >
                      {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Session Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>Viewers: {currentSession.viewer_count || 0}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  Started: {new Date(currentSession.started_at).toLocaleTimeString()}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <MonitorShare className="h-4 w-4 text-muted-foreground" />
                <span>Type: {getSessionTypeName(currentSession.session_type)}</span>
              </div>

              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span>Quality: Auto</span>
              </div>
            </div>

            {/* Leave Button */}
            <Button
              onClick={handleLeaveSession}
              variant="outline"
              className="w-full"
            >
              <Square className="h-4 w-4 mr-2" />
              Leave Screen Share
            </Button>
          </CardContent>
        </Card>
      )}

      {/* No Active Session Message */}
      {isScreenSharing && !currentSession && availableSessions.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <MonitorShare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No Active Sessions</h3>
            <p className="text-muted-foreground text-sm">
              The streamer may be setting up screen sharing. Please wait...
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ScreenShareViewer;