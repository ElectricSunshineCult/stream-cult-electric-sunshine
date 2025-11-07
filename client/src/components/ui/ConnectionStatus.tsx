import React, { useState, useEffect, useRef } from 'react';
import { Wifi, WifiOff, Signal, Clock, Users, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConnectionStats {
  user_id: string;
  session_id: string;
  connection_type: 'websocket' | 'polling' | 'sse';
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  latency_ms: number;
  bandwidth_mbps: number;
  last_ping: string;
  disconnect_reason?: string;
  reconnect_attempts: number;
}

interface ConnectionStatusProps {
  userId: string;
  onStatusChange?: (status: string) => void;
  showDetails?: boolean;
  className?: string;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  userId,
  onStatusChange,
  showDetails = false,
  className = ""
}) => {
  const [connection, setConnection] = useState<ConnectionStats | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [realtimeStats, setRealtimeStats] = useState({
    uptime: 0,
    packetsLost: 0,
    jitter: 0,
    videoQuality: 'auto'
  });
  const [connectionHistory, setConnectionHistory] = useState<Array<{
    timestamp: string;
    event: string;
    details: string;
  }>>([]);
  
  const socketRef = useRef<WebSocket | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    initializeConnection();
    startHeartbeat();
    return () => {
      cleanup();
    };
  }, [userId]);

  const initializeConnection = async () => {
    try {
      // Check WebSocket support
      if ('WebSocket' in window) {
        connectWebSocket();
      } else {
        connectPolling();
      }
    } catch (error) {
      console.error('Connection initialization failed:', error);
    }
  };

  const connectWebSocket = () => {
    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5000'}/connection/${userId}`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      const connectionData: ConnectionStats = {
        user_id: userId,
        session_id: generateSessionId(),
        connection_type: 'websocket',
        status: 'connected',
        latency_ms: 0,
        bandwidth_mbps: 0,
        last_ping: new Date().toISOString(),
        reconnect_attempts: 0
      };
      
      setConnection(connectionData);
      onStatusChange?.('connected');
      addToHistory('Connected', 'WebSocket connection established');
      
      // Start latency testing
      startLatencyTest();
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };

    socket.onclose = (event) => {
      const disconnectReason = event.reason || 'Connection closed';
      setConnection(prev => prev ? {
        ...prev,
        status: 'disconnected',
        disconnect_reason: disconnectReason
      } : null);
      
      onStatusChange?.('disconnected');
      addToHistory('Disconnected', disconnectReason);
      
      // Attempt reconnection
      attemptReconnection();
    };

    socket.onerror = (error) => {
      setConnection(prev => prev ? {
        ...prev,
        status: 'error'
      } : null);
      
      onStatusChange?.('error');
      addToHistory('Error', 'WebSocket connection error');
    };

    socketRef.current = socket;
  };

  const connectPolling = () => {
    const pollConnection = async () => {
      try {
        const response = await fetch(`/api/connection/status/${userId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setConnection(data);
          onStatusChange?.(data.status);
        }
      } catch (error) {
        console.error('Polling connection failed:', error);
      }
    };

    // Initial poll
    pollConnection();
    
    // Set up polling interval
    intervalRef.current = setInterval(pollConnection, 5000);
  };

  const startHeartbeat = () => {
    intervalRef.current = setInterval(() => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'ping',
          timestamp: Date.now()
        }));
        
        updateUptime();
        testBandwidth();
      }
    }, 30000); // Every 30 seconds
  };

  const startLatencyTest = () => {
    const testLatency = async () => {
      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
      
      const startTime = performance.now();
      socketRef.current.send(JSON.stringify({
        type: 'latency_test',
        timestamp: startTime
      }));
    };

    // Test latency every 10 seconds
    const latencyInterval = setInterval(testLatency, 10000);
    
    // Cleanup function
    return () => clearInterval(latencyInterval);
  };

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'pong':
        const latency = performance.now() - data.timestamp;
        setConnection(prev => prev ? {
          ...prev,
          latency_ms: Math.round(latency),
          last_ping: new Date().toISOString()
        } : null);
        break;
        
      case 'latency_response':
        const responseLatency = performance.now() - data.timestamp;
        setConnection(prev => prev ? {
          ...prev,
          latency_ms: Math.round(responseLatency)
        } : null);
        break;
        
      case 'bandwidth_test':
        setRealtimeStats(prev => ({
          ...prev,
          videoQuality: data.quality || 'auto'
        }));
        break;
        
      default:
        console.log('Unknown WebSocket message:', data);
    }
  };

  const attemptReconnection = () => {
    setConnection(prev => prev ? {
      ...prev,
      reconnect_attempts: prev.reconnect_attempts + 1
    } : null);

    if (socketRef.current) {
      socketRef.current.close();
    }

    // Exponential backoff reconnection
    const delay = Math.min(1000 * Math.pow(2, connection?.reconnect_attempts || 0), 30000);
    
    setTimeout(() => {
      connectWebSocket();
    }, delay);
  };

  const testBandwidth = async () => {
    try {
      const startTime = performance.now();
      const testData = '1'.repeat(1024 * 100); // 100KB
      
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'bandwidth_test',
          data: testData
        }));
      }
      
      const endTime = performance.now();
      const duration = (endTime - startTime) / 1000;
      const bandwidthMbps = (1024 * 100 * 8) / (duration * 1024 * 1024);
      
      setConnection(prev => prev ? {
        ...prev,
        bandwidth_mbps: Math.round(bandwidthMbps * 100) / 100
      } : null);
    } catch (error) {
      console.error('Bandwidth test failed:', error);
    }
  };

  const updateUptime = () => {
    const uptime = Math.floor((Date.now() - startTimeRef.current) / 1000);
    setRealtimeStats(prev => ({
      ...prev,
      uptime
    }));
  };

  const addToHistory = (event: string, details: string) => {
    setConnectionHistory(prev => [
      {
        timestamp: new Date().toISOString(),
        event,
        details
      },
      ...prev.slice(0, 9) // Keep only last 10 events
    ]);
  };

  const generateSessionId = () => {
    return 'session_' + Math.random().toString(36).substr(2, 9);
  };

  const getStatusIcon = () => {
    switch (connection?.status) {
      case 'connected':
        return <Wifi className="w-4 h-4 text-green-500" />;
      case 'connecting':
        return <Signal className="w-4 h-4 text-yellow-500 animate-pulse" />;
      case 'disconnected':
      case 'error':
        return <WifiOff className="w-4 h-4 text-red-500" />;
      default:
        return <WifiOff className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (connection?.status) {
      case 'connected': return 'text-green-500';
      case 'connecting': return 'text-yellow-500';
      case 'disconnected': return 'text-red-500';
      case 'error': return 'text-red-600';
      default: return 'text-gray-500';
    }
  };

  const formatUptime = (seconds: number) => {
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

  const cleanup = () => {
    if (socketRef.current) {
      socketRef.current.close();
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
      >
        {getStatusIcon()}
        <span className={`text-sm font-medium ${getStatusColor()}`}>
          {connection?.status || 'Unknown'}
        </span>
        {connection?.latency_ms > 0 && (
          <span className="text-xs text-gray-400">
            {connection.latency_ms}ms
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {isExpanded && showDetails && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 top-full mt-2 w-96 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50"
          >
            <div className="p-4">
              <h3 className="text-lg font-semibold text-white mb-4">Connection Status</h3>
              
              {/* Connection Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-800 p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-gray-300">Latency</span>
                  </div>
                  <span className="text-xl font-bold text-white">
                    {connection?.latency_ms || 0}ms
                  </span>
                </div>
                
                <div className="bg-gray-800 p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Signal className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-gray-300">Bandwidth</span>
                  </div>
                  <span className="text-xl font-bold text-white">
                    {connection?.bandwidth_mbps || 0} Mbps
                  </span>
                </div>
                
                <div className="bg-gray-800 p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm text-gray-300">Uptime</span>
                  </div>
                  <span className="text-xl font-bold text-white">
                    {formatUptime(realtimeStats.uptime)}
                  </span>
                </div>
                
                <div className="bg-gray-800 p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-purple-500" />
                    <span className="text-sm text-gray-300">Quality</span>
                  </div>
                  <span className="text-xl font-bold text-white">
                    {realtimeStats.videoQuality}
                  </span>
                </div>
              </div>

              {/* Connection Details */}
              <div className="mb-4 p-3 bg-gray-800 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-300 mb-2">Connection Details</h4>
                <div className="space-y-1 text-xs text-gray-400">
                  <div>Type: {connection?.connection_type || 'Unknown'}</div>
                  <div>Status: <span className={getStatusColor()}>{connection?.status}</span></div>
                  <div>Last Ping: {connection?.last_ping ? new Date(connection.last_ping).toLocaleTimeString() : 'Never'}</div>
                  <div>Reconnect Attempts: {connection?.reconnect_attempts || 0}</div>
                </div>
              </div>

              {/* Connection History */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-300 mb-2">Recent Activity</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {connectionHistory.map((event, index) => (
                    <div key={index} className="text-xs text-gray-400">
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-300">{event.event}</span>
                        <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div className="text-gray-500">{event.details}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={testBandwidth}
                  disabled={connection?.status !== 'connected'}
                  className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
                >
                  Test Speed
                </button>
                <button
                  onClick={() => {
                    cleanup();
                    initializeConnection();
                  }}
                  className="flex-1 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors"
                >
                  Reconnect
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ConnectionStatus;