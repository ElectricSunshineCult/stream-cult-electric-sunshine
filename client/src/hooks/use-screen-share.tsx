import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '@/hooks/use-socket';
import { toast } from '@/hooks/use-toast';

interface ScreenShareSession {
  id: number;
  stream_id: number;
  streamer_id: number;
  session_type: 'screen' | 'application' | 'tab' | 'window';
  title: string;
  description: string;
  is_active: boolean;
  quality_settings: any;
  started_at: string;
  ended_at?: string;
  streamer_name?: string;
  viewer_count?: number;
}

interface UseScreenShareReturn {
  isScreenSharing: boolean;
  currentSession: ScreenShareSession | null;
  availableSessions: ScreenShareSession[];
  isJoining: boolean;
  joinSession: (sessionId: number, streamId: number) => Promise<void>;
  leaveSession: (sessionId: number) => Promise<void>;
  refreshSessions: () => Promise<void>;
  getActiveSession: (streamId: number) => Promise<ScreenShareSession | null>;
}

export const useScreenShare = (): UseScreenShareReturn => {
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [currentSession, setCurrentSession] = useState<ScreenShareSession | null>(null);
  const [availableSessions, setAvailableSessions] = useState<ScreenShareSession[]>([]);
  const [isJoining, setIsJoining] = useState(false);
  
  const socket = useSocket();

  // Screen share event handlers
  useEffect(() => {
    if (!socket) return;

    const handleScreenShareStarted = (data: any) => {
      console.log('Screen share started:', data);
      setIsScreenSharing(true);
      
      // Add to available sessions if not already there
      const newSession: ScreenShareSession = {
        id: data.sessionId,
        stream_id: 0, // Will be updated when joining
        streamer_id: 0,
        session_type: data.sessionType,
        title: data.title,
        description: data.description,
        is_active: true,
        quality_settings: {},
        started_at: new Date().toISOString(),
        streamer_name: data.streamerName
      };
      
      setAvailableSessions(prev => {
        const exists = prev.find(s => s.id === data.sessionId);
        if (!exists) {
          return [...prev, newSession];
        }
        return prev;
      });

      toast({
        title: "Screen Share Started",
        description: `${data.streamerName} is now sharing their screen`
      });
    };

    const handleScreenShareStopped = (data: any) => {
      console.log('Screen share stopped:', data);
      setIsScreenSharing(false);
      setCurrentSession(null);
      
      // Remove from available sessions
      setAvailableSessions(prev => prev.filter(s => s.id !== data.sessionId));

      toast({
        title: "Screen Share Ended",
        description: "The screen sharing session has ended"
      });
    };

    const handleScreenShareData = (data: any) => {
      console.log('Screen share data received:', data);
      setCurrentSession(prev => ({
        ...prev,
        id: data.sessionId,
        title: data.title,
        description: data.description,
        session_type: data.sessionType,
        quality_settings: data.qualitySettings,
        started_at: data.startedAt,
        streamer_name: data.streamerName
      }));
    };

    const handleScreenShareViewerJoined = (data: any) => {
      console.log('Screen share viewer joined:', data);
      // You can add participant list management here
    };

    const handleScreenShareViewerLeft = (data: any) => {
      console.log('Screen share viewer left:', data);
      // Update participant list
    };

    const handleScreenShareSettingsUpdated = (data: any) => {
      console.log('Screen share settings updated:', data);
      setCurrentSession(prev => prev ? {
        ...prev,
        quality_settings: data.settings
      } : null);

      toast({
        title: "Settings Updated",
        description: "Screen share settings have been updated"
      });
    };

    // Register event listeners
    socket.on('screen-share-started', handleScreenShareStarted);
    socket.on('screen-share-stopped', handleScreenShareStopped);
    socket.on('screen-share-data', handleScreenShareData);
    socket.on('screen-share-viewer-joined', handleScreenShareViewerJoined);
    socket.on('screen-share-viewer-left', handleScreenShareViewerLeft);
    socket.on('screen-share-settings-updated', handleScreenShareSettingsUpdated);

    // Cleanup function
    return () => {
      socket.off('screen-share-started', handleScreenShareStarted);
      socket.off('screen-share-stopped', handleScreenShareStopped);
      socket.off('screen-share-data', handleScreenShareData);
      socket.off('screen-share-viewer-joined', handleScreenShareViewerJoined);
      socket.off('screen-share-viewer-left', handleScreenShareViewerLeft);
      socket.off('screen-share-settings-updated', handleScreenShareSettingsUpdated);
    };
  }, [socket]);

  const joinSession = useCallback(async (sessionId: number, streamId: number) => {
    if (!socket) {
      toast({
        title: "Connection Error",
        description: "Not connected to server",
        variant: "destructive"
      });
      return;
    }

    setIsJoining(true);

    try {
      // Join via WebSocket
      socket.emit('join-screen-share', { sessionId, streamId });

      // Also make HTTP request to update database
      const response = await fetch(`/api/screen-share/join/${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to join screen share session');
      }

      // Find session in available sessions and set as current
      const session = availableSessions.find(s => s.id === sessionId);
      if (session) {
        setCurrentSession(session);
      }

      toast({
        title: "Joined Screen Share",
        description: "You are now viewing the screen share"
      });

    } catch (error) {
      console.error('Failed to join screen share:', error);
      toast({
        title: "Error",
        description: "Failed to join screen share session",
        variant: "destructive"
      });
    } finally {
      setIsJoining(false);
    }
  }, [socket, availableSessions]);

  const leaveSession = useCallback(async (sessionId: number) => {
    if (!socket) return;

    try {
      // Leave via WebSocket
      socket.emit('leave-screen-share', { sessionId });

      // Also make HTTP request to update database
      const response = await fetch(`/api/screen-share/leave/${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to leave screen share session');
      }

      setCurrentSession(null);

      toast({
        title: "Left Screen Share",
        description: "You have left the screen share session"
      });

    } catch (error) {
      console.error('Failed to leave screen share:', error);
      toast({
        title: "Error",
        description: "Failed to leave screen share session",
        variant: "destructive"
      });
    }
  }, [socket]);

  const refreshSessions = useCallback(async () => {
    try {
      // Get all active sessions for the current stream or user
      const response = await fetch('/api/screen-share/active-sessions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Failed to refresh screen share sessions:', error);
    }
  }, []);

  const getActiveSession = useCallback(async (streamId: number): Promise<ScreenShareSession | null> => {
    try {
      const response = await fetch(`/api/screen-share/active/${streamId}`);
      
      if (response.ok) {
        const data = await response.json();
        return data.session;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get active session:', error);
      return null;
    }
  }, []);

  // Auto-refresh available sessions on mount
  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  return {
    isScreenSharing,
    currentSession,
    availableSessions,
    isJoining,
    joinSession,
    leaveSession,
    refreshSessions,
    getActiveSession
  };
};