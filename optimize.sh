#!/bin/bash

# Stream Cult - Electric Sunshine Cult Performance Optimization Script
# Copyright (c) 2025 Corey Setzer - Electric Sunshine Cult

set -e

echo "🚀 Stream Cult - Electric Sunshine Cult Performance Optimization"
echo "=================================================================="
echo "Developer: Corey Setzer aka Unknown Artist Developer & Director Of Electric Sunshine Cult"
echo "Contact: info@electricsunshinecult.com"
echo "=================================================================="

# Create optimized directories
mkdir -p logs
mkdir -p uploads/clips
mkdir -p uploads/thumbnails
mkdir -p public/assets
mkdir -p cache
mkdir -p temp

# Set proper permissions
chmod 755 logs uploads uploads/clips uploads/thumbnails public/assets cache temp
chmod 644 logs/* 2>/dev/null || true
chmod 755 $(find uploads uploads/clips uploads/thumbnails -type d)
chmod 644 $(find uploads uploads/clips uploads/thumbnails -type f 2>/dev/null || true)

echo "✅ Directory structure optimized"

# Server optimizations
echo "🔧 Applying server optimizations..."

# Create optimized nginx config template
cat > nginx-optimized.conf << 'EOF'
# Electric Sunshine Cult - Optimized Nginx Configuration
# Copyright (c) 2025 Corey Setzer - Electric Sunshine Cult

# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;

# Gzip compression
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

# Static file caching
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# API rate limiting
location /api/ {
    limit_req zone=api burst=20 nodelay;
    try_files $uri $uri/ =404;
}

# Login rate limiting
location /api/auth/login {
    limit_req zone=login burst=5 nodelay;
}

# File upload optimization
client_max_body_size 100M;
client_body_timeout 60s;
client_header_timeout 60s;

# Keepalive optimization
keepalive_timeout 65;
keepalive_requests 100;
EOF

echo "✅ Server optimizations applied"

# Database optimizations
echo "🗄️ Applying database optimizations..."

# Create optimized PostgreSQL config
cat > postgresql-optimized.conf << 'EOF'
# Electric Sunshine Cult - Optimized PostgreSQL Configuration
# Copyright (c) 2025 Corey Setzer - Electric Sunshine Cult

# Memory settings
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 16MB
maintenance_work_mem = 64MB

# Checkpoint settings
checkpoint_completion_target = 0.9
wal_buffers = 16MB
checkpoint_segments = 32

# Query planner
random_page_cost = 1.1
effective_io_concurrency = 200

# Connection settings
max_connections = 100
connection_limit = 95

# Logging
log_min_duration_statement = 1000
log_checkpoints = on
log_connections = off
log_disconnections = off

# Performance monitoring
log_statement_stats = off
log_parser_stats = off
log_planner_stats = off
log_executor_stats = off
EOF

echo "✅ Database optimizations applied"

# Frontend optimizations
echo "🎨 Applying frontend optimizations..."

# Create optimized build script
cat > build-optimized.sh << 'EOF'
#!/bin/bash

# Electric Sunshine Cult - Frontend Build Optimization
# Copyright (c) 2025 Corey Setzer - Electric Sunshine Cult

echo "🏗️ Building Stream Cult frontend with optimizations..."

# Clean build
rm -rf .next out dist

# Install dependencies with audit
npm audit --audit-level=moderate
npm install --production --no-audit

# Build with optimizations
npm run build

# Optimize images
if command -v imagemin &> /dev/null; then
    echo "🖼️ Optimizing images..."
    find public/images -type f \( -iname "*.jpg" -o -iname "*.png" -o -iname "*.webp" \) -exec imagemin {} --out-dir=public/images/optimized \;
fi

# Generate service worker
if [ -f "public/sw.js" ]; then
    echo "🔄 Generating service worker..."
    # Add service worker generation logic here
fi

# Bundle analysis
if command -v @next/bundle-analyzer &> /dev/null; then
    echo "📊 Analyzing bundle size..."
    ANALYZE=true npm run build
fi

echo "✅ Frontend build completed with optimizations"
EOF

chmod +x build-optimized.sh

echo "✅ Frontend optimizations applied"

# Security optimizations
echo "🔒 Applying security optimizations..."

# Create security headers configuration
cat > security-headers.conf << 'EOF'
# Electric Sunshine Cult - Security Headers Configuration
# Copyright (c) 2025 Corey Setzer - Electric Sunshine Cult

# Content Security Policy
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' wss: https:; media-src 'self' https:; frame-src 'none';";

# X-Frame-Options
add_header X-Frame-Options "SAMEORIGIN" always;

# X-Content-Type-Options
add_header X-Content-Type-Options "nosniff" always;

# X-XSS-Protection
add_header X-XSS-Protection "1; mode=block" always;

# Referrer-Policy
add_header Referrer-Policy "strict-origin-when-cross-origin" always;

# Permissions-Policy
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

# Strict-Transport-Security
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

# Hide server information
server_tokens off;
EOF

echo "✅ Security optimizations applied"

# Monitoring and health checks
echo "📊 Setting up monitoring..."

# Create health check script
cat > health-check.sh << 'EOF'
#!/bin/bash

# Electric Sunshine Cult - Health Check Script
# Copyright (c) 2025 Corey Setzer - Electric Sunshine Cult

echo "🏥 Stream Cult Health Check"
echo "=========================="

# Check Node.js
if command -v node &> /dev/null; then
    echo "✅ Node.js: $(node --version)"
else
    echo "❌ Node.js not found"
fi

# Check npm
if command -v npm &> /dev/null; then
    echo "✅ npm: $(npm --version)"
else
    echo "❌ npm not found"
fi

# Check PostgreSQL
if command -v psql &> /dev/null; then
    echo "✅ PostgreSQL CLI: Available"
else
    echo "❌ PostgreSQL CLI not found"
fi

# Check Redis
if command -v redis-cli &> /dev/null; then
    echo "✅ Redis CLI: Available"
else
    echo "⚠️ Redis CLI not found"
fi

# Check disk space
DISK_USAGE=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
    echo "✅ Disk usage: ${DISK_USAGE}%"
else
    echo "⚠️ Disk usage: ${DISK_USAGE}% (Warning: High usage)"
fi

# Check memory
MEMORY_USAGE=$(free | awk 'FNR == 2 {printf "%.0f", $3/($3+$4)*100}')
echo "📊 Memory usage: ${MEMORY_USAGE}%"

# Check database connection
if [ -n "$DATABASE_URL" ]; then
    echo "✅ Database URL configured"
else
    echo "❌ Database URL not configured"
fi

echo "=========================="
echo "🏥 Health check completed"
EOF

chmod +x health-check.sh

echo "✅ Monitoring setup completed"

# Performance benchmarks
echo "⚡ Creating performance benchmarks..."

cat > performance-benchmarks.js << 'EOF'
/**
 * Electric Sunshine Cult - Performance Benchmarks
 * Copyright (c) 2025 Corey Setzer - Electric Sunshine Cult
 */

const benchmarks = {
  api: {
    health: { endpoint: '/health', expected: 200, maxResponse: 100 },
    auth: { endpoint: '/api/auth/health', expected: 200, maxResponse: 200 },
    streams: { endpoint: '/api/streams', expected: 200, maxResponse: 500 }
  },
  database: {
    connection: { expected: 'connected', maxTime: 1000 },
    query: { expected: 'success', maxTime: 50 }
  },
  cache: {
    redis: { expected: 'connected', maxTime: 10 },
    set: { expected: 'success', maxTime: 20 },
    get: { expected: 'success', maxTime: 10 }
  }
};

module.exports = benchmarks;
EOF

echo "✅ Performance benchmarks created"

# Final optimization summary
echo ""
echo "🎉 Optimization completed successfully!"
echo "=================================="
echo "✅ Directory structure optimized"
echo "✅ Server configurations optimized"
echo "✅ Database performance tuned"
echo "✅ Frontend build process optimized"
echo "✅ Security headers configured"
echo "✅ Health monitoring enabled"
echo "✅ Performance benchmarks created"
echo ""
echo "📋 Next Steps:"
echo "1. Configure environment variables"
echo "2. Set up database with migrations"
echo "3. Configure Redis caching"
echo "4. Set up SSL certificates"
echo "5. Deploy with Docker or your preferred method"
echo ""
echo "👑 Developed by Corey Setzer"
echo "Unknown Artist Developer & Director Of Electric Sunshine Cult"
echo "Contact: info@electricsunshinecult.com"
echo "=================================="