'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { ChatMessage, Stream, Tip } from '@/lib/api';
import { toast } from 'react-hot-toast';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinStream: (streamId: number) => void;
  leaveStream: (streamId: number) => void;
  sendMessage: (streamId: number, content: string, messageType?: string) => void;
  sendTip: (streamId: number, streamerId: number, amount: number, message?: string, actionType?: string, actionData?: any) => void;
  startStream: (streamId: number, streamKey: string, rtmpUrl: string) => void;
  stopStream: (streamId: number) => void;
  sendWhisper: (targetUserId: number, streamId: number, content: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

interface SocketProviderProps {
  children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      // Create socket connection with auth token
      const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000', {
        auth: {
          token: localStorage.getItem('accessToken'),
        },
        transports: ['websocket', 'polling'],
      });

      // Connection events
      socketInstance.on('connect', () => {
        console.log('✅ Socket connected');
        setIsConnected(true);
      });

      socketInstance.on('disconnect', () => {
        console.log('❌ Socket disconnected');
        setIsConnected(false);
      });

      socketInstance.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setIsConnected(false);
      });

      // Stream events
      socketInstance.on('stream-live', (data) => {
        toast.success(`${data.streamerName} is now live!`);
      });

      socketInstance.on('stream-offline', (data) => {
        toast.info('Stream went offline');
      });

      socketInstance.on('viewer-count-update', (data) => {
        // Handle viewer count updates - this could update UI
        console.log('Viewer count updated:', data.count);
      });

      // Chat events
      socketInstance.on('new-message', (message: ChatMessage) => {
        // Handle new messages - this will be managed by components
        console.log('New message:', message);
      });

      socketInstance.on('whisper-received', (data) => {
        toast.info(`Whisper from ${data.from.username}`);
      });

      // Tip events
      socketInstance.on('tip-received', (tip: Tip) => {
        toast.success(`💥 You received a ${tip.amount} CULT tip!`);
      });

      // Error events
      socketInstance.on('error', (data) => {
        toast.error(data.message || 'An error occurred');
      });

      setSocket(socketInstance);

      return () => {
        socketInstance.disconnect();
        setSocket(null);
        setIsConnected(false);
      };
    } else {
      // Clean up socket if not authenticated
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
    }
  }, [isAuthenticated, user]);

  const joinStream = (streamId: number) => {
    if (socket && isConnected) {
      socket.emit('join-stream', { streamId });
    }
  };

  const leaveStream = (streamId: number) => {
    if (socket && isConnected) {
      socket.emit('leave-stream', { streamId });
    }
  };

  const sendMessage = (streamId: number, content: string, messageType: string = 'chat') => {
    if (socket && isConnected) {
      socket.emit('send-message', { streamId, content, messageType });
    }
  };

  const sendTip = (
    streamId: number,
    streamerId: number,
    amount: number,
    message?: string,
    actionType?: string,
    actionData?: any
  ) => {
    if (socket && isConnected) {
      socket.emit('send-tip', {
        streamId,
        streamerId,
        amount,
        message,
        actionType,
        actionData,
      });
    }
  };

  const startStream = (streamId: number, streamKey: string, rtmpUrl: string) => {
    if (socket && isConnected) {
      socket.emit('stream-status', {
        streamId,
        status: 'start',
        streamKey,
        rtmpUrl,
      });
    }
  };

  const stopStream = (streamId: number) => {
    if (socket && isConnected) {
      socket.emit('stream-status', {
        streamId,
        status: 'stop',
      });
    }
  };

  const sendWhisper = (targetUserId: number, streamId: number, content: string) => {
    if (socket && isConnected) {
      socket.emit('send-whisper', { targetUserId, streamId, content });
    }
  };

  const value = {
    socket,
    isConnected,
    joinStream,
    leaveStream,
    sendMessage,
    sendTip,
    startStream,
    stopStream,
    sendWhisper,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}