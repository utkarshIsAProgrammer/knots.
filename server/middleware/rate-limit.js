RateLimiter = {};

// In-memory rate tracking (in production use Redis)
const rateStore = {};

RateLimiter.generic = (maxRequests, windowMs = 60000) => {
  return (req, res, next) => {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    const window = Math.floor(now / windowMs);

    if (!rateStore[ip]) {
      rateStore[ip] = {};
    }

    if (!rateStore[ip][window]) {
      rateStore[ip][window] = 0;
    }

    rateStore[ip][window]++;

    if (rateStore[ip][window] > maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: windowMs / 1000
      });
    }

    // Set headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', maxRequests - rateStore[ip][window]);
    res.setHeader('X-RateLimit-Reset', new Date((window + 1) * windowMs).toISOString());

    next();
  };
};

// Per-endpoint rate limits
RateLimiter.endpoints = {
  register: RateLimiter.generic(5, 60000), // 5 register requests per minute
  contactRequest: RateLimiter.generic(10, 60000), // 10 contact requests per minute
  message: RateLimiter.generic(20, 60000), // 20 messages per minute
  x3dh: RateLimiter.generic(3, 60000) // 3 X3DH handshakes per minute
};

module.exports = RateLimiter;