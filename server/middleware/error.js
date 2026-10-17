ErrorHandler = {};

ErrorHandler.handle = (err, req, res, next) => {
  console.error('Error:', err.message);
  const status = err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Internal server error',
    code: err.code || 'INTERNAL_ERROR',
    path: req.path,
    timestamp: new Date().toISOString()
  });
};

// Common error classes
ErrorHandler.ApiError = class extends Error {
  constructor(message, statusCode = 400, code = 'BAD_REQUEST') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
};

ErrorHandler.NotFoundError = class extends Error {
  constructor(message = 'Not found') {
    super(message);
    this.statusCode = 404;
    this.code = 'NOT_FOUND';
  }
};

ErrorHandler.AuthError = class extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.statusCode = 401;
    this.code = 'AUTH_ERROR';
  }
};

module.exports = ErrorHandler;