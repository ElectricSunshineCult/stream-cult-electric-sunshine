import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Monitor, 
  Wifi, 
  Database, 
  Settings, 
  AlertCircle, 
  CheckCircle, 
  Info,
  RefreshCw,
  Download,
  Share,
  Shield,
  Zap
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface DiagnosticResult {
  test: string;
  status: 'pass' | 'fail' | 'warning' | 'info';
  message: string;
  details?: any;
}

const BrowserDiagnosticTool: React.FC = () => {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const runDiagnostics = async () => {
    setIsRunning(true);
    setProgress(0);
    setResults([]);

    const tests: DiagnosticResult[] = [];

    // Test 1: Browser Compatibility
    await runTest('Browser Compatibility', async () => {
      const userAgent = navigator.userAgent;
      const isModernBrowser = /Chrome|Firefox|Safari|Edge/i.test(userAgent);
      const isSecure = window.isSecureContext;
      
      return {
        test: 'Browser Compatibility',
        status: isModernBrowser && isSecure ? 'pass' : 'warning',
        message: isModernBrowser && isSecure 
          ? 'Modern secure browser detected'
          : 'Consider using a modern browser with HTTPS',
        details: {
          userAgent,
          isSecure,
          language: navigator.language,
          cookieEnabled: navigator.cookieEnabled
        }
      };
    });

    // Test 2: WebRTC Support
    await runTest('WebRTC Support', async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return {
          test: 'WebRTC Support',
          status: 'fail',
          message: 'WebRTC not supported',
          details: {
            mediaDevices: !!navigator.mediaDevices,
            getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
          }
        };
      }

      if (!navigator.mediaDevices.getDisplayMedia) {
        return {
          test: 'WebRTC Support',
          status: 'warning',
          message: 'Limited WebRTC support (no screen sharing)',
          details: { screenShareSupported: false }
        };
      }

      return {
        test: 'WebRTC Support',
        status: 'pass',
        message: 'Full WebRTC and screen sharing support',
        details: {
          webRTCSupported: true,
          screenShareSupported: true,
          cameraSupported: !!(navigator.mediaDevices.getUserMedia)
        }
      };
    });

    // Test 3: Network Connectivity
    await runTest('Network Connectivity', async () => {
      try {
        const start = performance.now();
        const response = await fetch('/api/health', { 
          method: 'HEAD',
          cache: 'no-cache'
        });
        const end = performance.now();
        const latency = Math.round(end - start);

        return {
          test: 'Network Connectivity',
          status: response.ok ? 'pass' : 'warning',
          message: response.ok 
            ? `Connected successfully (${latency}ms latency)`
            : 'Server might be offline',
          details: {
            status: response.status,
            latency,
            url: '/api/health'
          }
        };
      } catch (error) {
        return {
          test: 'Network Connectivity',
          status: 'fail',
          message: 'Network connection failed',
          details: { error: error.message }
        };
      }
    });

    // Test 4: WebSocket Support
    await runTest('WebSocket Support', async () => {
      if (!window.WebSocket) {
        return {
          test: 'WebSocket Support',
          status: 'fail',
          message: 'WebSocket not supported',
          details: { webSocketSupported: false }
        };
      }

      // Try to create a WebSocket connection
      try {
        const ws = new WebSocket('wss://echo.websocket.org/');
        
        return new Promise<DiagnosticResult>((resolve) => {
          ws.onopen = () => {
            ws.close();
            resolve({
              test: 'WebSocket Support',
              status: 'pass',
              message: 'WebSocket working properly',
              details: { 
                webSocketSupported: true,
                wssSupported: true
              }
            });
          };
          
          ws.onerror = () => {
            resolve({
              test: 'WebSocket Support',
              status: 'warning',
              message: 'WebSocket supported but connection failed',
              details: { 
                webSocketSupported: true,
                wssSupported: false
              }
            });
          };
          
          setTimeout(() => {
            resolve({
              test: 'WebSocket Support',
              status: 'warning',
              message: 'WebSocket connection timeout',
              details: { timeout: true }
            });
          }, 5000);
        });
      } catch (error) {
        return {
          test: 'WebSocket Support',
          status: 'fail',
          message: 'WebSocket error',
          details: { error: error.message }
        };
      }
    });

    // Test 5: Hardware Acceleration
    await runTest('Hardware Acceleration', async () => {
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl');
        const gl2 = canvas.getContext('webgl2');
        
        const hardwareAccel = !!(gl || gl2);
        const vendor = gl ? gl.getParameter(gl.VENDOR) : 'N/A';
        const renderer = gl ? gl.getParameter(gl.RENDERER) : 'N/A';
        
        return {
          test: 'Hardware Acceleration',
          status: hardwareAccel ? 'pass' : 'info',
          message: hardwareAccel 
            ? 'Hardware acceleration available'
            : 'No hardware acceleration detected',
          details: {
            hardwareAccel,
            webGL: !!gl,
            webGL2: !!gl2,
            vendor,
            renderer
          }
        };
      } catch (error) {
        return {
          test: 'Hardware Acceleration',
          status: 'info',
          message: 'Could not detect hardware acceleration',
          details: { error: error.message }
        };
      }
    });

    // Test 6: Performance Metrics
    await runTest('Performance Metrics', async () => {
      const memory = (performance as any).memory;
      const connection = (navigator as any).connection;
      
      const hasMemoryInfo = !!memory;
      const hasConnectionInfo = !!connection;
      
      let status: 'pass' | 'warning' | 'info' = 'info';
      let message = 'Performance data collected';
      
      if (hasMemoryInfo) {
        const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
        const totalMB = Math.round(memory.totalJSHeapSize / 1024 / 1024);
        
        if (usedMB < 100) {
          status = 'pass';
          message = `Good performance (${usedMB}MB/${totalMB}MB used)`;
        } else if (usedMB < 500) {
          status = 'warning';
          message = `Moderate usage (${usedMB}MB/${totalMB}MB used)`;
        } else {
          status = 'warning';
          message = `High memory usage (${usedMB}MB/${totalMB}MB used)`;
        }
      }
      
      return {
        test: 'Performance Metrics',
        status,
        message,
        details: {
          hasMemoryInfo,
          hasConnectionInfo,
          memory: memory ? {
            used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
            total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
            limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
          } : null,
          connection: connection ? {
            effectiveType: connection.effectiveType,
            downlink: connection.downlink,
            rtt: connection.rtt
          } : null
        }
      };
    });

    // Test 7: Permissions
    await runTest('Permissions', async () => {
      try {
        const permissions = await navigator.permissions.query({ name: 'camera' as PermissionName });
        const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        
        return {
          test: 'Permissions',
          status: 'info',
          message: 'Permission status checked',
          details: {
            camera: permissions.state,
            microphone: micPermission.state
          }
        };
      } catch (error) {
        return {
          test: 'Permissions',
          status: 'info',
          message: 'Permission API not fully supported',
          details: { error: error.message }
        };
      }
    });

    // Test 8: Screen Sharing Capabilities
    await runTest('Screen Sharing', async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        return {
          test: 'Screen Sharing',
          status: 'fail',
          message: 'Screen sharing not supported',
          details: { supported: false }
        };
      }

      try {
        // This will prompt for permission - we just check if the API works
        return {
          test: 'Screen Sharing',
          status: 'pass',
          message: 'Screen sharing supported',
          details: {
            supported: true,
            canRequest: true
          }
        };
      } catch (error) {
        return {
          test: 'Screen Sharing',
          status: 'warning',
          message: 'Screen sharing API exists but may fail',
          details: { supported: true, error: error.message }
        };
      }
    });

    setIsRunning(false);
  };

  const runTest = async (testName: string, testFunction: () => Promise<DiagnosticResult>) => {
    const progressStep = 100 / 9; // 9 tests total
    
    try {
      const result = await testFunction();
      setResults(prev => [...prev, result]);
    } catch (error) {
      setResults(prev => [...prev, {
        test: testName,
        status: 'fail',
        message: 'Test failed with error',
        details: { error: error.message }
      }]);
    }
    
    setProgress(prev => prev + progressStep);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'fail': return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'success';
      case 'fail': return 'destructive';
      case 'warning': return 'warning';
      default: return 'secondary';
    }
  };

  const exportResults = () => {
    const data = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      results: results
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diagnostic-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Report Exported",
      description: "Diagnostic report has been downloaded",
    });
  };

  const shareResults = async () => {
    const summary = results.map(r => `${r.test}: ${r.message}`).join('\n');
    const text = `Browser Diagnostic Results for Token Based Streaming Platform\n\n${summary}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Browser Diagnostic Report',
          text: text
        });
      } catch (error) {
        console.log('Share failed:', error);
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(text);
      toast({
        title: "Results Copied",
        description: "Diagnostic results copied to clipboard",
      });
    }
  };

  useEffect(() => {
    if (results.length > 0) {
      const passCount = results.filter(r => r.status === 'pass').length;
      const warnCount = results.filter(r => r.status === 'warning').length;
      const failCount = results.filter(r => r.status === 'fail').length;
      
      if (failCount > 0) {
        toast({
          title: "Diagnostics Complete",
          description: `Found ${failCount} failures. Some issues need attention.`,
          variant: "destructive"
        });
      } else if (warnCount > 0) {
        toast({
          title: "Diagnostics Complete",
          description: `Found ${warnCount} warnings. System is mostly functional.`,
        });
      } else {
        toast({
          title: "Diagnostics Complete",
          description: "All tests passed! System is functioning well.",
        });
      }
    }
  }, [results]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Browser Diagnostic Tool</h1>
        <p className="text-muted-foreground">
          Test your browser compatibility and system requirements for the streaming platform
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            System Diagnostics
          </CardTitle>
          <CardDescription>
            Run comprehensive tests to identify browser and system compatibility issues
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button 
              onClick={runDiagnostics} 
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              {isRunning ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              {isRunning ? 'Running Tests...' : 'Run Diagnostics'}
            </Button>
            
            {results.length > 0 && (
              <>
                <Button 
                  variant="outline" 
                  onClick={exportResults}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export Report
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={shareResults}
                  className="flex items-center gap-2"
                >
                  <Share className="w-4 h-4" />
                  Share Results
                </Button>
              </>
            )}
          </div>

          {isRunning && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="w-5 h-5" />
                Test Results Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-500">
                    {results.filter(r => r.status === 'pass').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Passed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-500">
                    {results.filter(r => r.status === 'warning').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Warnings</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-500">
                    {results.filter(r => r.status === 'fail').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-500">
                    {results.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Tests</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {results.map((result, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {getStatusIcon(result.status)}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{result.test}</h3>
                      <Badge variant={getStatusColor(result.status) as any}>
                        {result.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {result.message}
                    </p>
                    {result.details && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground">
                          View Details
                        </summary>
                        <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default BrowserDiagnosticTool;