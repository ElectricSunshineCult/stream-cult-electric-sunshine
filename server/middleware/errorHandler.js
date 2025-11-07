const errorHandler = (error, req, res, next) => {
  console.error('Error:', error);

  // Default error
  let status = 500;
  let message = 'Internal server error';
  let details = null;

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    status = 401;
    message = 'Invalid token';
  } else if (error.name === 'TokenExpiredError') {
    status = 401;
    message = 'Token expired';
  }

  // Validation errors
  if (error.name === 'ValidationError') {
    status = 400;
    message = 'Validation failed';
    if (error.errors) {
      details = Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      }));
    }
  }

  // Database errors
  if (error.code === '23505') { // Unique constraint violation
    status = 409;
    message = 'Resource already exists';
  } else if (error.code === '23503') { // Foreign key constraint violation
    status = 400;
    message = 'Invalid reference';
  } else if (error.code === '23502') { // Not null constraint violation
    status = 400;
    message = 'Required field missing';
  }

  // Stripe errors
  if (error.type === 'StripeCardError') {
    status = 400;
    message = 'Payment failed';
  } else if (error.type === 'StripeInvalidRequestError') {
    status = 400;
    message = 'Invalid payment request';
  }

  // Custom application errors
  if (error.status) {
    status = error.status;
    message = error.message;
  }

  // File upload errors
  if (error.code === 'LIMIT_FILE_SIZE') {
    status = 413;
    message = 'File too large';
  } else if (error.code === 'LIMIT_FILE_COUNT') {
    status = 400;
    message = 'Too many files';
  } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    status = 400;
    message = 'Unexpected file field';
  }

  const response = {
    error: message,
    status: status,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  };

  // Add details in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
    if (details) {
      response.details = details;
    }
  }

  res.status(status).json(response);
};

// Custom error classes
class AppError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, field = null) {
    super(message, 400);
    this.name = 'ValidationError';
    this.field = field;
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

module.exports = {
  errorHandler,
  AppError,
  ValidationError,
  NotFoundError,
  ForbiddenError,
  UnauthorizedError
};