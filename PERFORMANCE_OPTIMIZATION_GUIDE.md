# Performance Optimization Guide

## Overview
This guide provides comprehensive strategies for optimizing the Token-Based Streaming Platform with screen sharing capabilities and multiple theme support.

## Table of Contents
1. [Client-Side Optimizations](#client-side-optimizations)
2. [Server-Side Optimizations](#server-side-optimizations)
3. [Network Optimizations](#network-optimizations)
4. [Database Optimizations](#database-optimizations)
5. [Browser-Specific Optimizations](#browser-specific-optimizations)
6. [Memory Management](#memory-management)
7. [CPU Optimization](#cpu-optimization)
8. [Performance Monitoring](#performance-monitoring)

## Client-Side Optimizations

### React Component Optimization

#### Memoization Strategies
```typescript
// Use React.memo for expensive components
const OptimizedScreenShareControls = React.memo(ScreenShareControls);

// Use useMemo for expensive calculations
const optimizedQualityPresets = useMemo(() => 
  qualityPresets.filter(preset => preset.supported),
  [qualityPresets, browserCapabilities]
);

// Use useCallback for event handlers
const handleQualityChange = useCallback((value: string) => {
  setSelectedQuality(parseInt(value));
}, []);

// Lazy load components
const ThemeSelector = React.lazy(() => import('./ThemeSelector'));
```

#### Virtual Scrolling for Large Lists
```typescript
// For rendering large theme lists
import { FixedSizeList as List } from 'react-window';

const ThemeList = ({ themes }) => (
  <List
    height={400}
    itemCount={themes.length}
    itemSize={120}
    itemData={themes}
  >
    {({ index, style, data }) => (
      <div style={style}>
        <ThemeCard theme={data[index]} />
      </div>
    )}
  </List>
);
```

#### Component Code Splitting
```typescript
// Route-based code splitting
const Dashboard = React.lazy(() => import('./Dashboard'));
const ScreenShare = React.lazy(() => import('./ScreenShare'));

// Dynamic import for theme components
const loadThemeComponent = async (themeId: string) => {
  const themeModule = await import(`./themes/${themeId}Theme.tsx`);
  return themeModule.default;
};
```

### CSS and Styling Optimization

#### CSS-in-JS Optimization
```typescript
// Use CSS custom properties for dynamic themes
const themeStyles = {
  primary: 'var(--theme-primary)',
  background: 'var(--theme-background)',
  // ... other properties
};

// Avoid generating styles dynamically in render
const useCachedStyles = (theme) => {
  return useMemo(() => ({
    containerStyle: {
      backgroundColor: theme.colors.background,
      color: theme.colors.text,
      // ... cached styles
    }
  }), [theme.id]);
};
```

#### Critical CSS Extraction
```css
/* Critical styles loaded inline */
.theme-selector {
  display: flex;
  flex-direction: column;
}

.theme-card {
  border: 1px solid var(--theme-border);
}

/* Non-critical styles loaded asynchronously */
.theme-animations {
  transition: all 0.3s ease;
}

.theme-gradients {
  background: linear-gradient(var(--theme-gradient-1), var(--theme-gradient-2));
}
```

### Asset Optimization

#### Image Optimization
```typescript
// Responsive images with WebP support
const OptimizedImage = ({ src, alt, themeId }) => {
  const webpSrc = src.replace(/\.(jpg|png)$/, '.webp');
  
  return (
    <picture>
      <source srcSet={webpSrc} type="image/webp" />
      <source srcSet={src} type="image/jpeg" />
      <img src={src} alt={alt} loading="lazy" />
    </picture>
  );
};

// Theme-based icon optimization
const getOptimizedIcon = (iconName: string, themeId: string) => {
  const iconPath = `/icons/${iconName}-${themeId}.svg`;
  return (
    <img 
      src={iconPath} 
      alt={iconName}
      loading="lazy"
      width="24"
      height="24"
    />
  );
};
```

#### Font Optimization
```css
/* Font display optimization */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-var.woff2') format('woff2');
  font-display: swap; /* Prevents invisible text during font load */
  font-weight: 100 900;
  font-style: normal;
}

/* Preload critical fonts */
<link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin>
```

## Server-Side Optimizations

### Express.js Performance

#### Middleware Optimization
```typescript
// Use compression for API responses
import compression from 'compression';

app.use(compression({
  filter: (req, res) => {
    // Don't compress responses if client doesn't support it
    return req.headers['x-no-compression'] ? false : compression.filter(req, res);
  },
  threshold: 1024, // Only compress responses > 1KB
  level: 6 // Balanced compression level
}));

// Optimize helmet for performance
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      // Optimized CSP for performance
    }
  }
}));
```

#### Database Query Optimization
```typescript
// Use connection pooling
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Optimized query with proper indexing
const getScreenShareSessions = async (streamId: string, limit: number = 50) => {
  return await pool.query(`
    SELECT 
      sss.*,
      u.username,
      qp.name as quality_name
    FROM screen_sharing_sessions sss
    JOIN users u ON sss.streamer_id = u.id
    LEFT JOIN quality_presets qp ON sss.quality_preset_id = qp.id
    WHERE sss.stream_id = $1 
      AND sss.ended_at IS NULL
    ORDER BY sss.started_at DESC
    LIMIT $2
  `, [streamId, limit]);
};

// Use transactions for complex operations
const createSessionWithOptimisticLock = async (sessionData: any) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Lock the stream for session creation
    const lockResult = await client.query(
      'SELECT * FROM streams WHERE id = $1 FOR UPDATE',
      [sessionData.stream_id]
    );
    
    if (lockResult.rows.length === 0) {
      throw new Error('Stream not found or locked');
    }
    
    // Create session
    const result = await client.query(`
      INSERT INTO screen_sharing_sessions (
        stream_id, streamer_id, session_type, quality_settings, started_at
      ) VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
    `, [
      sessionData.stream_id,
      sessionData.streamer_id,
      sessionData.session_type,
      sessionData.quality_settings
    ]);
    
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
```

#### Caching Strategy
```typescript
// Redis caching for frequently accessed data
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Cache quality presets with TTL
const getQualityPresets = async () => {
  const cacheKey = 'quality_presets:v1';
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const presets = await fetchFromDatabase();
  await redis.setex(cacheKey, 3600, JSON.stringify(presets)); // 1 hour TTL
  
  return presets;
};

// Cache browser compatibility data
const getBrowserCapabilities = (userAgent: string) => {
  const cacheKey = `browser_cap:${userAgent}`;
  return redis.get(cacheKey).then(cached => {
    if (cached) return JSON.parse(cached);
    
    const capabilities = analyzeBrowser(userAgent);
    redis.setex(cacheKey, 86400, JSON.stringify(capabilities)); // 24 hour TTL
    return capabilities;
  });
};
```

### WebSocket Optimization

#### Connection Management
```typescript
// Optimized socket connection handling
io.on('connection', (socket) => {
  // Use rooms for efficient broadcasting
  socket.on('join-stream', (streamId) => {
    socket.join(`stream:${streamId}`);
    socket.data.streamId = streamId;
  });
  
  // Optimized screen share events
  socket.on('screen-share-started', (data) => {
    // Use socket.broadcast.to for room-specific updates
    socket.to(`stream:${data.streamId}`).emit('screen-share-started', {
      sessionId: data.sessionId,
      quality: data.quality,
      timestamp: Date.now()
    });
  });
  
  // Rate limiting for high-frequency events
  const rateLimiter = rateLimit({
    windowMs: 1000, // 1 second
    max: 30, // max 30 events per second
    message: 'Too many events'
  });
  
  socket.on('performance-update', rateLimiter, (data) => {
    // Handle performance metrics
  });
});
```

## Network Optimizations

### CDN Configuration
```nginx
# NGINX configuration for optimal performance
server {
    # Enable compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://backend;
    }
}
```

### HTTP/2 and HTTP/3
```typescript
// HTTP/2 Server Push for critical resources
app.get('/', (req, res) => {
  res.push('/styles/main.css');
  res.push('/scripts/app.js');
  res.push('/fonts/inter-var.woff2');
  
  res.sendFile('index.html');
});

// HTTP/3 support with appropriate headers
app.use((req, res, next) => {
  res.setHeader('Alt-Svc', 'h3=":443"; ma=86400');
  next();
});
```

## Database Optimizations

### Indexing Strategy
```sql
-- Optimized indexes for screen sharing queries
CREATE INDEX CONCURRENTLY idx_screen_sessions_stream_id 
ON screen_sharing_sessions(stream_id) WHERE ended_at IS NULL;

CREATE INDEX CONCURRENTLY idx_screen_sessions_started_at 
ON screen_sharing_sessions(started_at DESC);

CREATE INDEX CONCURRENTLY idx_screen_viewers_session_id 
ON screen_share_viewers(session_id, joined_at);

CREATE INDEX CONCURRENTLY idx_quality_presets_performance_tier 
ON quality_presets(performance_tier, is_default);

-- Composite index for common query patterns
CREATE INDEX CONCURRENTLY idx_screen_sessions_composite 
ON screen_sharing_sessions(stream_id, session_type, started_at DESC) 
WHERE ended_at IS NULL;
```

### Query Optimization
```sql
-- Optimized query with proper joins and filtering
EXPLAIN ANALYZE
SELECT 
  sss.id,
  sss.session_type,
  sss.title,
  sss.started_at,
  qp.name as quality_name,
  qp.resolution,
  qp.framerate,
  COUNT(ssv.id) as viewer_count
FROM screen_sharing_sessions sss
LEFT JOIN quality_presets qp ON sss.quality_preset_id = qp.id
LEFT JOIN screen_share_viewers ssv ON sss.id = ssv.session_id
WHERE sss.stream_id = $1
  AND sss.ended_at IS NULL
GROUP BY sss.id, qp.id
ORDER BY sss.started_at DESC
LIMIT $2;
```

### Connection Pool Optimization
```typescript
// Optimized database configuration
const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  // Connection pool settings
  min: 5,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  
  // Statement timeout
  statement_timeout: 10000,
  query_timeout: 10000,
  
  // SSL configuration
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  
  // Keep connection alive
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
};
```

## Browser-Specific Optimizations

### Chrome/Chromium Optimization
```typescript
const optimizeForChromium = (constraints: MediaStreamConstraints) => {
  return {
    video: {
      mediaSource: 'screen',
      width: { max: 3840, ideal: 1920 },
      height: { max: 2160, ideal: 1080 },
      frameRate: { max: 60, ideal: 30 },
      // Hardware acceleration hints
      hardwareAcceleration: 'prefer'
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      sampleRate: 48000,
      channelCount: 2
    }
  };
};
```

### Firefox Optimization
```typescript
const optimizeForFirefox = (constraints: MediaStreamConstraints) => {
  return {
    video: {
      mediaSource: 'screen',
      width: { max: 1920, ideal: 1280 },
      height: { max: 1080, ideal: 720 },
      frameRate: { max: 30, ideal: 24 }
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      sampleRate: 44100
    }
  };
};
```

### Safari Optimization
```typescript
const optimizeForSafari = (constraints: MediaStreamConstraints) => {
  return {
    video: {
      mediaSource: 'screen',
      width: { max: 1920, ideal: 1280 },
      height: { max: 1080, ideal: 720 },
      frameRate: { max: 30, ideal: 24 },
      // Safari-specific codec preferences
      codec: 'H.264'
    },
    audio: {
      // Safari has limited audio capture for screen sharing
      echoCancellation: true,
      sampleRate: 44100
    }
  };
};
```

## Memory Management

### Client-Side Memory Management
```typescript
// React component memory management
const useMemoryOptimizedState = <T>(initialValue: T) => {
  const [state, setState] = useState<T>(() => {
    // Lazy initialization to avoid memory leaks
    return typeof initialValue === 'function' ? initialValue() : initialValue;
  });
  
  const setOptimizedState = useCallback((newValue: T | ((prev: T) => T)) => {
    setState(prev => {
      const nextValue = typeof newValue === 'function' 
        ? (newValue as (prev: T) => T)(prev)
        : newValue;
      
      // Force garbage collection trigger for large objects
      if (typeof nextValue === 'object' && nextValue !== null) {
        // Trigger GC hint in some environments
        if (window.gc) {
          window.gc();
        }
      }
      
      return nextValue;
    });
  }, []);
  
  return [state, setOptimizedState];
};

// WebRTC stream cleanup
const cleanupMediaStream = (stream: MediaStream | null) => {
  if (stream) {
    stream.getTracks().forEach(track => {
      track.stop();
      // Remove event listeners to prevent memory leaks
      track.removeEventListener('ended', handleTrackEnd);
    });
  }
};
```

### Server-Side Memory Management
```typescript
// Memory-efficient data structures
class MemoryEfficientBuffer {
  private buffer: Buffer;
  private position: number;
  private size: number;
  
  constructor(initialSize: number = 1024) {
    this.buffer = Buffer.alloc(initialSize);
    this.position = 0;
    this.size = initialSize;
  }
  
  write(data: any) {
    const dataStr = JSON.stringify(data);
    const dataBuffer = Buffer.from(dataStr);
    
    if (this.position + dataBuffer.length > this.size) {
      this.resize();
    }
    
    dataBuffer.copy(this.buffer, this.position);
    this.position += dataBuffer.length;
  }
  
  private resize() {
    const newSize = this.size * 2;
    const newBuffer = Buffer.alloc(newSize);
    this.buffer.copy(newBuffer);
    this.buffer = newBuffer;
    this.size = newSize;
  }
}
```

## CPU Optimization

### WebRTC Performance
```typescript
// CPU-optimized screen sharing
const getCPUOptimizedConstraints = (performanceLevel: 'LOW' | 'MEDIUM' | 'HIGH') => {
  switch (performanceLevel) {
    case 'LOW':
      return {
        video: {
          width: { max: 1280, ideal: 854 },
          height: { max: 720, ideal: 480 },
          frameRate: { max: 15, ideal: 15 },
          bitrate: 1000000
        },
        audio: {
          sampleRate: 22050,
          channelCount: 1
        }
      };
    case 'MEDIUM':
      return {
        video: {
          width: { max: 1920, ideal: 1280 },
          height: { max: 1080, ideal: 720 },
          frameRate: { max: 30, ideal: 24 },
          bitrate: 3000000
        },
        audio: {
          sampleRate: 44100,
          channelCount: 2
        }
      };
    case 'HIGH':
      return {
        video: {
          width: { max: 3840, ideal: 1920 },
          height: { max: 2160, ideal: 1080 },
          frameRate: { max: 60, ideal: 30 },
          bitrate: 8000000
        },
        audio: {
          sampleRate: 48000,
          channelCount: 2
        }
      };
  }
};
```

### Background Processing
```typescript
// Web Workers for CPU-intensive tasks
const workerCode = `
  self.onmessage = function(e) {
    const { type, data } = e.data;
    
    switch (type) {
      case 'ANALYZE_PERFORMANCE':
        const result = analyzePerformanceMetrics(data);
        self.postMessage({ type: 'PERFORMANCE_ANALYZED', data: result });
        break;
        
      case 'OPTIMIZE_QUALITY':
        const optimized = optimizeQualitySettings(data);
        self.postMessage({ type: 'QUALITY_OPTIMIZED', data: optimized });
        break;
    }
  };
  
  function analyzePerformanceMetrics(metrics) {
    // CPU-intensive analysis
    return metrics.map(m => ({
      ...m,
      efficiency: calculateEfficiency(m),
      recommendations: generateRecommendations(m)
    }));
  }
`;

// Create worker
const workerBlob = new Blob([workerCode], { type: 'application/javascript' });
const workerUrl = URL.createObjectURL(workerBlob);
const performanceWorker = new Worker(workerUrl);

// Use worker for performance analysis
const analyzePerformance = (metrics) => {
  return new Promise((resolve) => {
    performanceWorker.postMessage({ type: 'ANALYZE_PERFORMANCE', data: metrics });
    performanceWorker.onmessage = (e) => {
      if (e.data.type === 'PERFORMANCE_ANALYZED') {
        resolve(e.data.data);
      }
    };
  });
};
```

## Performance Monitoring

### Real-time Performance Tracking
```typescript
// Performance observer for Web Vitals
if (typeof PerformanceObserver !== 'undefined') {
  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      switch (entry.entryType) {
        case 'largest-contentful-paint':
          console.log('LCP:', entry.startTime);
          // Send to analytics
          sendPerformanceMetric('lcp', entry.startTime);
          break;
          
        case 'first-input':
          console.log('FID:', entry.processingStart - entry.startTime);
          sendPerformanceMetric('fid', entry.processingStart - entry.startTime);
          break;
          
        case 'layout-shift':
          if (!entry.hadRecentInput) {
            console.log('CLS:', entry.value);
            sendPerformanceMetric('cls', entry.value);
          }
          break;
      }
    });
  });
  
  observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
}

// Custom performance marks
performance.mark('screen-share-start');
const stream = await navigator.mediaDevices.getDisplayMedia(constraints);
performance.mark('screen-share-end');
performance.measure('screen-share-duration', 'screen-share-start', 'screen-share-end');
```

### Memory Monitoring
```typescript
// Monitor memory usage
const monitorMemoryUsage = () => {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    console.log('Memory Usage:', {
      used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
      total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
      limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
    });
    
    // Trigger garbage collection if memory usage is high
    if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.8) {
      console.warn('High memory usage detected');
      if (window.gc) {
        window.gc();
      }
    }
  }
};

// Set up periodic memory monitoring
setInterval(monitorMemoryUsage, 5000);
```

### Network Performance
```typescript
// Monitor network quality
const getNetworkQuality = () => {
  const connection = (navigator as any).connection;
  
  if (connection) {
    return {
      effectiveType: connection.effectiveType, // '4g', '3g', '2g', 'slow-2g'
      downlink: connection.downlink, // Mbps
      rtt: connection.rtt, // Round trip time in ms
      saveData: connection.saveData // Boolean
    };
  }
  
  return null;
};

// Adaptive quality based on network
const adaptToNetworkQuality = () => {
  const quality = getNetworkQuality();
  
  if (!quality) return 'MEDIUM';
  
  if (quality.saveData || quality.effectiveType === 'slow-2g') {
    return 'LOW';
  } else if (quality.effectiveType === '2g' || quality.downlink < 1) {
    return 'LOW';
  } else if (quality.effectiveType === '3g' || quality.downlink < 5) {
    return 'MEDIUM';
  } else {
    return 'HIGH';
  }
};
```

## Optimization Checklist

### Before Deployment
- [ ] Code splitting implemented
- [ ] Assets optimized and compressed
- [ ] Database queries optimized with proper indexes
- [ ] CDN configured for static assets
- [ ] Gzip/Brotli compression enabled
- [ ] Image optimization (WebP format)
- [ ] Critical CSS inlined
- [ ] Service worker for caching
- [ ] Performance monitoring implemented
- [ ] Memory leaks tested and fixed

### For Screen Sharing
- [ ] Browser capability detection
- [ ] Adaptive quality selection
- [ ] Hardware acceleration enabled
- [ ] Frame rate optimization
- [ ] Memory cleanup for media streams
- [ ] Error handling for network issues
- [ ] Performance-based quality adjustment
- [ ] Bandwidth usage monitoring

### For Theme System
- [ ] CSS custom properties for theme switching
- [ ] Lazy loading of theme assets
- [ ] Optimized color calculations
- [ ] Theme preloading for smooth transitions
- [ ] Memory-efficient theme storage

### Performance Testing
- [ ] Load testing with concurrent users
- [ ] Memory profiling during screen sharing
- [ ] Network condition testing (3G, 4G, WiFi)
- [ ] Browser compatibility testing
- [ ] Mobile device performance testing
- [ ] Long-running session stability

---

**Document Version**: 1.0
**Last Updated**: November 7, 2025
**Next Review**: December 7, 2025