import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Cpu, 
  Database, 
  HardDrive, 
  MemoryStick, 
  Monitor, 
  Network, 
  RefreshCw, 
  Server, 
  Wifi,
  Zap
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: {
    latency: number;
    download: number;
    upload: number;
  };
  database: {
    connections: number;
    queryTime: number;
    status: 'healthy' | 'warning' | 'critical';
  };
  webSocket: {
    connected: boolean;
    latency: number;
    messageRate: number;
  };
  timestamp: Date;
}

interface PerformanceAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  message: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: Date;
}

const PerformanceMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [monitoringInterval, setMonitoringInterval] = useState<NodeJS.Timeout | null>(null);

  const startMonitoring = () => {
    setIsMonitoring(true);
    collectMetrics();
    
    const interval = setInterval(collectMetrics, 5000); // Collect every 5 seconds
    setMonitoringInterval(interval);
    
    toast({
      title: "Monitoring Started",
      description: "Performance monitoring is now active",
    });
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
      setMonitoringInterval(null);
    }
    
    toast({
      title: "Monitoring Stopped",
      description: "Performance monitoring has been stopped",
    });
  };

  const collectMetrics = async () => {
    try {
      // Simulate performance data collection
      const newMetrics: SystemMetrics = {
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        disk: Math.random() * 100,
        network: {
          latency: Math.random() * 100 + 10, // 10-110ms
          download: Math.random() * 100 + 50, // 50-150 Mbps
          upload: Math.random() * 50 + 10 // 10-60 Mbps
        },
        database: {
          connections: Math.floor(Math.random() * 50) + 5,
          queryTime: Math.random() * 200 + 10, // 10-210ms
          status: Math.random() > 0.9 ? 'warning' : 'healthy'
        },
        webSocket: {
          connected: Math.random() > 0.1,
          latency: Math.random() * 50 + 5, // 5-55ms
          messageRate: Math.random() * 1000 + 100 // 100-1100 messages/min
        },
        timestamp: new Date()
      };

      setMetrics(newMetrics);
      checkThresholds(newMetrics);
      
    } catch (error) {
      console.error('Error collecting metrics:', error);
      toast({
        title: "Collection Error",
        description: "Failed to collect some performance metrics",
        variant: "destructive"
      });
    }
  };

  const checkThresholds = (currentMetrics: SystemMetrics) => {
    const newAlerts: PerformanceAlert[] = [];

    // CPU threshold check
    if (currentMetrics.cpu > 80) {
      newAlerts.push({
        id: `cpu-${Date.now()}`,
        type: currentMetrics.cpu > 95 ? 'critical' : 'warning',
        message: `CPU usage is ${currentMetrics.cpu.toFixed(1)}%`,
        metric: 'CPU',
        value: currentMetrics.cpu,
        threshold: 80,
        timestamp: new Date()
      });
    }

    // Memory threshold check
    if (currentMetrics.memory > 85) {
      newAlerts.push({
        id: `memory-${Date.now()}`,
        type: currentMetrics.memory > 95 ? 'critical' : 'warning',
        message: `Memory usage is ${currentMetrics.memory.toFixed(1)}%`,
        metric: 'Memory',
        value: currentMetrics.memory,
        threshold: 85,
        timestamp: new Date()
      });
    }

    // Disk threshold check
    if (currentMetrics.disk > 90) {
      newAlerts.push({
        id: `disk-${Date.now()}`,
        type: 'critical',
        message: `Disk usage is ${currentMetrics.disk.toFixed(1)}%`,
        metric: 'Disk',
        value: currentMetrics.disk,
        threshold: 90,
        timestamp: new Date()
      });
    }

    // Database threshold check
    if (currentMetrics.database.queryTime > 200) {
      newAlerts.push({
        id: `db-${Date.now()}`,
        type: 'warning',
        message: `Database query time is ${currentMetrics.database.queryTime.toFixed(1)}ms`,
        metric: 'Database',
        value: currentMetrics.database.queryTime,
        threshold: 200,
        timestamp: new Date()
      });
    }

    // Network latency check
    if (currentMetrics.network.latency > 100) {
      newAlerts.push({
        id: `network-${Date.now()}`,
        type: 'warning',
        message: `Network latency is ${currentMetrics.network.latency.toFixed(1)}ms`,
        metric: 'Network',
        value: currentMetrics.network.latency,
        threshold: 100,
        timestamp: new Date()
      });
    }

    if (newAlerts.length > 0) {
      setAlerts(prev => [...newAlerts, ...prev].slice(0, 10)); // Keep last 10 alerts
      
      // Show notification for critical alerts
      const criticalAlerts = newAlerts.filter(alert => alert.type === 'critical');
      if (criticalAlerts.length > 0) {
        toast({
          title: "Critical Performance Alert",
          description: `${criticalAlerts.length} critical issue(s) detected`,
          variant: "destructive"
        });
      }
    }
  };

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  const getMetricColor = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return 'text-red-500';
    if (value >= thresholds.warning) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getMetricStatus = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return 'critical';
    if (value >= thresholds.warning) return 'warning';
    return 'healthy';
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default: return <CheckCircle className="w-4 h-4 text-blue-500" />;
    }
  };

  useEffect(() => {
    return () => {
      if (monitoringInterval) {
        clearInterval(monitoringInterval);
      }
    };
  }, [monitoringInterval]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Performance Monitor</h1>
        <p className="text-muted-foreground">
          Real-time system performance monitoring and alerting
        </p>
      </div>

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            System Monitoring
          </CardTitle>
          <CardDescription>
            Monitor system performance in real-time and receive alerts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button 
              onClick={isMonitoring ? stopMonitoring : startMonitoring}
              className="flex items-center gap-2"
              variant={isMonitoring ? "destructive" : "default"}
            >
              {isMonitoring ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
            </Button>
            
            {metrics && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                Last updated: {metrics.timestamp.toLocaleTimeString()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* CPU Usage */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Cpu className="w-4 h-4" />
                CPU Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-2xl font-bold ${getMetricColor(metrics.cpu, { warning: 70, critical: 90 })}`}>
                    {metrics.cpu.toFixed(1)}%
                  </span>
                  <Badge variant={getMetricStatus(metrics.cpu, { warning: 70, critical: 90 }) === 'critical' ? 'destructive' : 
                                getMetricStatus(metrics.cpu, { warning: 70, critical: 90 }) === 'warning' ? 'warning' : 'success'}>
                    {getMetricStatus(metrics.cpu, { warning: 70, critical: 90 })}
                  </Badge>
                </div>
                <Progress value={metrics.cpu} className="w-full" />
                <div className="text-xs text-muted-foreground">
                  System processor utilization
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Memory Usage */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MemoryStick className="w-4 h-4" />
                Memory Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-2xl font-bold ${getMetricColor(metrics.memory, { warning: 75, critical: 90 })}`}>
                    {metrics.memory.toFixed(1)}%
                  </span>
                  <Badge variant={getMetricStatus(metrics.memory, { warning: 75, critical: 90 }) === 'critical' ? 'destructive' : 
                                getMetricStatus(metrics.memory, { warning: 75, critical: 90 }) === 'warning' ? 'warning' : 'success'}>
                    {getMetricStatus(metrics.memory, { warning: 75, critical: 90 })}
                  </Badge>
                </div>
                <Progress value={metrics.memory} className="w-full" />
                <div className="text-xs text-muted-foreground">
                  RAM utilization
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Disk Usage */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <HardDrive className="w-4 h-4" />
                Disk Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-2xl font-bold ${getMetricColor(metrics.disk, { warning: 80, critical: 95 })}`}>
                    {metrics.disk.toFixed(1)}%
                  </span>
                  <Badge variant={getMetricStatus(metrics.disk, { warning: 80, critical: 95 }) === 'critical' ? 'destructive' : 
                                getMetricStatus(metrics.disk, { warning: 80, critical: 95 }) === 'warning' ? 'warning' : 'success'}>
                    {getMetricStatus(metrics.disk, { warning: 80, critical: 95 })}
                  </Badge>
                </div>
                <Progress value={metrics.disk} className="w-full" />
                <div className="text-xs text-muted-foreground">
                  Storage utilization
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Network Metrics */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Network className="w-4 h-4" />
                Network Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="text-muted-foreground">Latency</div>
                    <div className="font-semibold">{metrics.network.latency.toFixed(1)}ms</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Download</div>
                    <div className="font-semibold">{metrics.network.download.toFixed(1)} Mbps</div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Upload: {metrics.network.upload.toFixed(1)} Mbps
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Database Metrics */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="w-4 h-4" />
                Database Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">
                    {metrics.database.connections}
                  </span>
                  <Badge variant={metrics.database.status === 'critical' ? 'destructive' : 
                                metrics.database.status === 'warning' ? 'warning' : 'success'}>
                    {metrics.database.status}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Active connections
                </div>
                <div className="text-xs">
                  Avg query time: <span className="font-semibold">{metrics.database.queryTime.toFixed(1)}ms</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* WebSocket Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Wifi className="w-4 h-4" />
                WebSocket Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">
                    {metrics.webSocket.connected ? 'Connected' : 'Disconnected'}
                  </span>
                  <Badge variant={metrics.webSocket.connected ? 'success' : 'destructive'}>
                    {metrics.webSocket.connected ? 'Online' : 'Offline'}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Latency: {metrics.webSocket.latency.toFixed(1)}ms
                </div>
                <div className="text-xs">
                  Rate: <span className="font-semibold">{metrics.webSocket.messageRate.toFixed(0)}/min</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Performance Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Performance Alerts
            </CardTitle>
            <CardDescription>
              Recent performance issues requiring attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    {getAlertIcon(alert.type)}
                    <div>
                      <div className="font-medium">{alert.message}</div>
                      <div className="text-sm text-muted-foreground">
                        {alert.metric} threshold exceeded • {alert.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => dismissAlert(alert.id)}
                  >
                    Dismiss
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Status Summary */}
      {metrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              System Health Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-500">
                  {['cpu', 'memory', 'disk'].filter(metric => {
                    const value = (metrics as any)[metric];
                    return value < (metric === 'cpu' ? 70 : metric === 'memory' ? 75 : 80);
                  }).length}
                </div>
                <div className="text-sm text-muted-foreground">Healthy Systems</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-500">
                  {alerts.filter(a => a.type === 'warning').length}
                </div>
                <div className="text-sm text-muted-foreground">Warnings</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-500">
                  {alerts.filter(a => a.type === 'critical').length}
                </div>
                <div className="text-sm text-muted-foreground">Critical Issues</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-500">
                  {Math.round((Date.now() - metrics.timestamp.getTime()) / 1000)}s
                </div>
                <div className="text-sm text-muted-foreground">Uptime</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PerformanceMonitor;