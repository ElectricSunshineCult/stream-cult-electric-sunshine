const { v4: uuidv4 } = require('uuid');

class ErrorService {
  constructor() {
    this.errorLog = [];
    this.errorCounts = new Map();
    this.userErrorMap = new Map();
  }

  /**
   * Log an error with comprehensive details
   */
  logError(error, context = {}) {
    const errorId = uuidv4();
    const errorData = {
      id: errorId,
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      context: context,
      type: this.categorizeError(error),
      severity: this.determineSeverity(error, context)
    };

    // Add to in-memory log (in production, this would go to a database)
    this.errorLog.push(errorData);

    // Track error counts
    const errorKey = `${errorData.type}:${error.message}`;
    this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1);

    // Log to console based on severity
    this.logToConsole(errorData);

    // Send alerts for critical errors
    if (errorData.severity === 'critical') {
      this.sendCriticalAlert(errorData);
    }

    return errorId;
  }

  /**
   * Categorize errors for better handling
   */
  categorizeError(error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return 'NETWORK_ERROR';
    }
    if (error.name === 'ValidationError') {
      return 'VALIDATION_ERROR';
    }
    if (error.name === 'UnauthorizedError' || error.message.includes('unauthorized')) {
      return 'AUTHENTICATION_ERROR';
    }
    if (error.code === 11000 || error.message.includes('duplicate')) {
      return 'DUPLICATE_ERROR';
    }
    if (error.name === 'JsonWebTokenError') {
      return 'JWT_ERROR';
    }
    if (error.name === 'CastError') {
      return 'DATA_TYPE_ERROR';
    }
    if (error.message.includes('timeout')) {
      return 'TIMEOUT_ERROR';
    }
    if (error.message.includes('rate limit')) {
      return 'RATE_LIMIT_ERROR';
    }
    if (error.message.includes('permission') || error.message.includes('forbidden')) {
      return 'PERMISSION_ERROR';
    }
    return 'UNKNOWN_ERROR';
  }

  /**
   * Determine error severity
   */
  determineSeverity(error, context) {
    // Critical errors that affect multiple users
    if (error.message.includes('database') || error.message.includes('server')) {
      return 'critical';
    }

    // High severity for authentication/authorization failures
    if (context.userId && (error.name === 'UnauthorizedError' || context.statusCode === 401 || context.statusCode === 403)) {
      return 'high';
    }

    // Medium severity for validation errors
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return 'medium';
    }

    // Low severity for minor issues
    if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      return 'low';
    }

    return 'medium';
  }

  /**
   * Create user-friendly error messages
   */
  createUserFriendlyError(error, context = {}) {
    const errorType = this.categorizeError(error);
    
    const errorMessages = {
      NETWORK_ERROR: {
        title: 'Connection Error',
        message: 'Unable to connect to the server. Please check your internet connection and try again.',
        userMessage: 'Please check your internet connection and refresh the page.'
      },
      VALIDATION_ERROR: {
        title: 'Invalid Data',
        message: 'The provided data is invalid. Please check your input and try again.',
        userMessage: 'Please check your input and ensure all required fields are filled correctly.'
      },
      AUTHENTICATION_ERROR: {
        title: 'Authentication Required',
        message: 'You need to be logged in to perform this action.',
        userMessage: 'Please log in to your account to continue.'
      },
      DUPLICATE_ERROR: {
        title: 'Already Exists',
        message: 'This item already exists. Please try with different data.',
        userMessage: 'This item already exists. Please choose different information.'
      },
      JWT_ERROR: {
        title: 'Session Expired',
        message: 'Your session has expired. Please log in again.',
        userMessage: 'Your session has expired. Please log in again.'
      },
      DATA_TYPE_ERROR: {
        title: 'Invalid Format',
        message: 'The data format is incorrect.',
        userMessage: 'Please check the format of your input and try again.'
      },
      TIMEOUT_ERROR: {
        title: 'Request Timeout',
        message: 'The request took too long to complete.',
        userMessage: 'The request timed out. Please try again.'
      },
      RATE_LIMIT_ERROR: {
        title: 'Too Many Requests',
        message: 'You are making requests too quickly. Please wait before trying again.',
        userMessage: 'You are making requests too quickly. Please wait a moment and try again.'
      },
      PERMISSION_ERROR: {
        title: 'Access Denied',
        message: 'You do not have permission to perform this action.',
        userMessage: 'You do not have permission to perform this action.'
      },
      UNKNOWN_ERROR: {
        title: 'Something Went Wrong',
        message: 'An unexpected error occurred. Please try again.',
        userMessage: 'Something went wrong. Please try again or contact support if the problem persists.'
      }
    };

    const errorInfo = errorMessages[errorType] || errorMessages.UNKNOWN_ERROR;
    const errorId = this.logError(error, context);

    return {
      ...errorInfo,
      errorId,
      timestamp: new Date().toISOString(),
      canRetry: this.canRetryError(error, context),
      suggestedActions: this.getSuggestedActions(error, context)
    };
  }

  /**
   * Determine if error can be retried
   */
  canRetryError(error, context) {
    const retryableErrors = [
      'NETWORK_ERROR',
      'TIMEOUT_ERROR',
      'RATE_LIMIT_ERROR',
      'UNKNOWN_ERROR'
    ];

    return retryableErrors.includes(this.categorizeError(error)) && 
           context.statusCode !== 401 && 
           context.statusCode !== 403;
  }

  /**
   * Get suggested actions for error resolution
   */
  getSuggestedActions(error, context) {
    const errorType = this.categorizeError(error);
    const actions = [];

    switch (errorType) {
      case 'NETWORK_ERROR':
        actions.push('Check your internet connection', 'Refresh the page', 'Try again later');
        break;
      case 'VALIDATION_ERROR':
        actions.push('Check your input data', 'Review required fields', 'Contact support if unsure');
        break;
      case 'AUTHENTICATION_ERROR':
        actions.push('Log in to your account', 'Check your credentials', 'Create a new account if needed');
        break;
      case 'TIMEOUT_ERROR':
        actions.push('Wait a moment and try again', 'Check your internet connection');
        break;
      case 'RATE_LIMIT_ERROR':
        actions.push('Wait a few minutes before trying again', 'Slow down your requests');
        break;
      default:
        actions.push('Try again', 'Contact support if the problem persists');
    }

    return actions;
  }

  /**
   * Log error to console based on severity
   */
  logToConsole(errorData) {
    const { severity, message, context, timestamp } = errorData;
    
    const logPrefix = `[${timestamp}] [${severity.toUpperCase()}]`;
    
    switch (severity) {
      case 'critical':
        console.error(`${logPrefix} 🚨 CRITICAL:`, message, context);
        break;
      case 'high':
        console.error(`${logPrefix} ⚠️  HIGH:`, message, context);
        break;
      case 'medium':
        console.warn(`${logPrefix} 🟡 MEDIUM:`, message, context);
        break;
      case 'low':
        console.log(`${logPrefix} 🟢 LOW:`, message, context);
        break;
      default:
        console.log(`${logPrefix} INFO:`, message, context);
    }
  }

  /**
   * Send critical error alerts (in production, this would send emails/Slack alerts)
   */
  sendCriticalAlert(errorData) {
    console.log('🚨 CRITICAL ALERT:', {
      message: errorData.message,
      context: errorData.context,
      timestamp: errorData.timestamp,
      stack: errorData.stack
    });

    // In production, implement:
    // - Send email to development team
    // - Send Slack/Discord alert
    // - Create incident ticket
    // - Trigger monitoring alerts
  }

  /**
   * Get error statistics
   */
  getErrorStats(timeRange = '24h') {
    const cutoffTime = this.getCutoffTime(timeRange);
    const recentErrors = this.errorLog.filter(error => 
      new Date(error.timestamp) > cutoffTime
    );

    const stats = {
      total: recentErrors.length,
      byType: {},
      bySeverity: {},
      recent: recentErrors.slice(-10), // Last 10 errors
      topErrors: this.getTopErrors(recentErrors),
      trends: this.analyzeTrends(recentErrors)
    };

    recentErrors.forEach(error => {
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
    });

    return stats;
  }

  /**
   * Get cutoff time based on time range
   */
  getCutoffTime(timeRange) {
    const now = new Date();
    switch (timeRange) {
      case '1h':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Get top errors by frequency
   */
  getTopErrors(errors) {
    const errorMap = new Map();
    
    errors.forEach(error => {
      const key = `${error.type}:${error.message}`;
      if (!errorMap.has(key)) {
        errorMap.set(key, {
          type: error.type,
          message: error.message,
          count: 0,
          lastOccurrence: error.timestamp
        });
      }
      const entry = errorMap.get(key);
      entry.count++;
      if (new Date(error.timestamp) > new Date(entry.lastOccurrence)) {
        entry.lastOccurrence = error.timestamp;
      }
    });

    return Array.from(errorMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  /**
   * Analyze error trends
   */
  analyzeTrends(errors) {
    const hourlyErrors = new Map();
    const now = new Date();
    
    // Group errors by hour
    for (let i = 0; i < 24; i++) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourKey = hour.toISOString().slice(0, 13); // YYYY-MM-DDTHH
      hourlyErrors.set(hourKey, 0);
    }

    errors.forEach(error => {
      const errorHour = new Date(error.timestamp).toISOString().slice(0, 13);
      if (hourlyErrors.has(errorHour)) {
        hourlyErrors.set(errorHour, hourlyErrors.get(errorHour) + 1);
      }
    });

    return {
      hourly: Array.from(hourlyErrors.entries()).map(([hour, count]) => ({
        hour,
        count
      })),
      peakHour: this.getPeakHour(hourlyErrors),
      trend: this.calculateTrend(hourlyErrors)
    };
  }

  /**
   * Get peak error hour
   */
  getPeakHour(hourlyErrors) {
    let maxCount = 0;
    let peakHour = null;
    
    for (const [hour, count] of hourlyErrors.entries()) {
      if (count > maxCount) {
        maxCount = count;
        peakHour = hour;
      }
    }
    
    return { hour: peakHour, count: maxCount };
  }

  /**
   * Calculate error trend
   */
  calculateTrend(hourlyErrors) {
    const values = Array.from(hourlyErrors.values());
    const recent = values.slice(0, 12); // Last 12 hours
    const previous = values.slice(12, 24); // Previous 12 hours
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const previousAvg = previous.reduce((a, b) => a + b, 0) / previous.length;
    
    if (previousAvg === 0) return 'stable';
    if (recentAvg > previousAvg * 1.2) return 'increasing';
    if (recentAvg < previousAvg * 0.8) return 'decreasing';
    return 'stable';
  }

  /**
   * Express.js error handling middleware
   */
  expressErrorHandler() {
    return (error, req, res, next) => {
      const context = {
        userId: req.user?.id,
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        statusCode: error.statusCode || 500
      };

      const userFriendlyError = this.createUserFriendlyError(error, context);

      // Don't expose internal error details in production
      if (process.env.NODE_ENV === 'production' && error.statusCode !== 401) {
        delete userFriendlyError.stack;
      }

      res.status(error.statusCode || 500).json({
        success: false,
        error: userFriendlyError
      });
    };
  }
}

module.exports = new ErrorService();