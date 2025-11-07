#!/bin/bash
# Quick Diagnostic Tool for Token Based Streaming Platform
# Version: 2.0.0
# Usage: ./quick-diagnosis.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "ok")
            echo -e "${GREEN}[✓]${NC} $message"
            ;;
        "warn")
            echo -e "${YELLOW}[!]${NC} $message"
            ;;
        "error")
            echo -e "${RED}[✗]${NC} $message"
            ;;
        "info")
            echo -e "${BLUE}[i]${NC} $message"
            ;;
    esac
}

# Function to check service status
check_service() {
    local service=$1
    if systemctl is-active --quiet $service; then
        print_status "ok" "$service is running"
    else
        print_status "error" "$service is not running"
    fi
}

# Function to check port
check_port() {
    local port=$1
    local service=$2
    if netstat -tlnp 2>/dev/null | grep ":$port " > /dev/null; then
        print_status "ok" "$service port $port is open"
    else
        print_status "error" "$service port $port is not open"
    fi
}

# Function to check database connection
check_database() {
    if psql -h localhost -U postgres -d perilaku -c "SELECT 1;" > /dev/null 2>&1; then
        print_status "ok" "Database connection successful"
        
        # Check active connections
        local connections=$(psql -h localhost -U postgres -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null)
        print_status "info" "Active database connections: $connections"
    else
        print_status "error" "Database connection failed"
    fi
}

# Function to check Redis
check_redis() {
    if redis-cli ping > /dev/null 2>&1; then
        print_status "ok" "Redis connection successful"
        
        # Check memory usage
        local memory=$(redis-cli info memory | grep used_memory_human | cut -d: -f2 | tr -d '\r\n')
        print_status "info" "Redis memory usage: $memory"
    else
        print_status "error" "Redis connection failed"
    fi
}

# Function to check disk space
check_disk_space() {
    local usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ $usage -lt 80 ]; then
        print_status "ok" "Disk usage: $usage%"
    elif [ $usage -lt 90 ]; then
        print_status "warn" "Disk usage: $usage% (approaching limit)"
    else
        print_status "error" "Disk usage: $usage% (critical)"
    fi
}

# Function to check memory
check_memory() {
    local memory_usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
    if [ $memory_usage -lt 70 ]; then
        print_status "ok" "Memory usage: $memory_usage%"
    elif [ $memory_usage -lt 90 ]; then
        print_status "warn" "Memory usage: $memory_usage%"
    else
        print_status "error" "Memory usage: $memory_usage% (critical)"
    fi
}

# Function to check CPU
check_cpu() {
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')
    local cpu_int=${cpu_usage%.*}
    if [ $cpu_int -lt 70 ]; then
        print_status "ok" "CPU usage: $cpu_int%"
    elif [ $cpu_int -lt 90 ]; then
        print_status "warn" "CPU usage: $cpu_int%"
    else
        print_status "error" "CPU usage: $cpu_int% (critical)"
    fi
}

# Function to check network connectivity
check_network() {
    # Check basic connectivity
    if ping -c 1 google.com > /dev/null 2>&1; then
        print_status "ok" "Internet connectivity OK"
    else
        print_status "error" "No internet connectivity"
    fi
    
    # Check DNS resolution
    if nslookup google.com > /dev/null 2>&1; then
        print_status "ok" "DNS resolution OK"
    else
        print_status "error" "DNS resolution failed"
    fi
    
    # Check if website is accessible
    local response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost 2>/dev/null || echo "000")
    if [ "$response" = "200" ] || [ "$response" = "301" ] || [ "$response" = "302" ]; then
        print_status "ok" "Website is accessible (HTTP $response)"
    else
        print_status "error" "Website is not accessible (HTTP $response)"
    fi
}

# Function to check SSL certificate
check_ssl() {
    if command -v openssl > /dev/null 2>&1; then
        local cert_expiry=$(echo | openssl s_client -servername localhost -connect localhost:443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null | grep notAfter | cut -d= -f2)
        if [ -n "$cert_expiry" ]; then
            print_status "info" "SSL certificate expires: $cert_expiry"
        else
            print_status "error" "Could not check SSL certificate"
        fi
    else
        print_status "warn" "OpenSSL not available for SSL check"
    fi
}

# Function to check application logs
check_logs() {
    local log_files=(
        "/var/log/nginx/error.log"
        "/var/log/postgresql/postgresql-*.log"
        "/var/log/application/*.log"
    )
    
    local error_count=0
    for log_pattern in "${log_files[@]}"; do
        for log_file in $log_pattern; do
            if [ -f "$log_file" ]; then
                local recent_errors=$(tail -100 "$log_file" | grep -c "ERROR\|FATAL" 2>/dev/null || echo "0")
                error_count=$((error_count + recent_errors))
            fi
        done
    done
    
    if [ $error_count -eq 0 ]; then
        print_status "ok" "No recent errors in logs"
    elif [ $error_count -lt 10 ]; then
        print_status "warn" "Some errors found in logs: $error_count"
    else
        print_status "error" "Many errors found in logs: $error_count"
    fi
}

# Function to run browser compatibility check
check_browser_compatibility() {
    echo "Browser Compatibility Test:"
    print_status "info" "This test is for client-side issues"
    
    # Check if screen sharing is supported
    if echo "Checking screen sharing support..."
    if echo "const getDisplayMedia = navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia; console.log(getDisplayMedia ? 'Supported' : 'Not supported');" | node > /dev/null 2>&1; then
        print_status "info" "Screen sharing API detected in Node environment"
    else
        print_status "info" "Screen sharing test requires browser environment"
    fi
    
    print_status "info" "To test browser compatibility, visit: https://browserleaks.com/webrtc"
}

# Main diagnostic function
run_diagnostics() {
    echo "============================================"
    echo "  Token Based Streaming Platform - Quick Diagnosis"
    echo "  $(date)"
    echo "============================================"
    echo
    
    echo "1. System Resources:"
    echo "   -------------------"
    check_cpu
    check_memory
    check_disk_space
    echo
    
    echo "2. Services Status:"
    echo "   ----------------"
    check_service "nginx"
    check_service "postgresql"
    check_service "redis-server"
    echo
    
    echo "3. Network & Connectivity:"
    echo "   -----------------------"
    check_network
    check_port 80 "HTTP"
    check_port 443 "HTTPS"
    check_port 3000 "WebSocket"
    check_port 5432 "PostgreSQL"
    check_port 6379 "Redis"
    echo
    
    echo "4. Database & Cache:"
    echo "   ----------------"
    check_database
    check_redis
    echo
    
    echo "5. SSL Certificate:"
    echo "   ---------------"
    check_ssl
    echo
    
    echo "6. Application Logs:"
    echo "   ----------------"
    check_logs
    echo
    
    echo "7. Browser Compatibility:"
    echo "   ---------------------"
    check_browser_compatibility
    echo
    
    echo "============================================"
    echo "  Diagnosis Complete"
    echo "============================================"
}

# Function to generate system report
generate_report() {
    local report_file="system-report-$(date +%Y%m%d-%H%M%S).txt"
    
    {
        echo "System Report - Token Based Streaming Platform"
        echo "Generated: $(date)"
        echo "=============================================="
        echo
        echo "System Information:"
        uname -a
        echo
        echo "CPU Information:"
        cat /proc/cpuinfo | grep -E "model name|processor" | head -2
        echo
        echo "Memory Information:"
        free -h
        echo
        echo "Disk Usage:"
        df -h
        echo
        echo "Running Services:"
        systemctl list-units --type=service --state=running | grep -E "nginx|postgresql|redis"
        echo
        echo "Active Network Connections:"
        ss -tuln | head -20
        echo
        echo "Database Connections:"
        psql -h localhost -U postgres -c "SELECT count(*) as active_connections FROM pg_stat_activity;" 2>/dev/null || echo "Database check failed"
        echo
        echo "Recent Error Log (last 50 lines):"
        tail -50 /var/log/nginx/error.log 2>/dev/null || echo "Log access denied"
        echo
    } > "$report_file"
    
    print_status "ok" "System report generated: $report_file"
}

# Function to fix common issues
fix_common_issues() {
    echo "Attempting to fix common issues..."
    echo
    
    # Fix 1: Clear application cache
    print_status "info" "Clearing application cache..."
    if [ -d "/tmp/app-cache" ]; then
        rm -rf /tmp/app-cache/*
        print_status "ok" "Application cache cleared"
    fi
    
    # Fix 2: Restart services
    print_status "info" "Restarting services..."
    systemctl restart nginx || print_status "error" "Failed to restart nginx"
    systemctl restart postgresql || print_status "error" "Failed to restart postgresql"
    systemctl restart redis-server || print_status "error" "Failed to restart redis"
    
    # Fix 3: Clear browser cache (nginx)
    print_status "info" "Clearing nginx cache..."
    if [ -d "/var/cache/nginx" ]; then
        rm -rf /var/cache/nginx/*
        print_status "ok" "Nginx cache cleared"
    fi
    
    print_status "ok" "Common fixes applied"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTION]"
    echo
    echo "Options:"
    echo "  (no args)    Run full diagnostics"
    echo "  --report     Generate system report"
    echo "  --fix        Fix common issues"
    echo "  --help       Show this help"
    echo
    echo "Examples:"
    echo "  $0           # Run diagnostics"
    echo "  $0 --report  # Generate report"
    echo "  $0 --fix     # Fix common issues"
}

# Main script logic
case "${1:-}" in
    --help|-h)
        show_usage
        exit 0
        ;;
    --report)
        generate_report
        exit 0
        ;;
    --fix)
        fix_common_issues
        echo
        run_diagnostics
        exit 0
        ;;
    "")
        run_diagnostics
        exit 0
        ;;
    *)
        echo "Unknown option: $1"
        echo
        show_usage
        exit 1
        ;;
esac