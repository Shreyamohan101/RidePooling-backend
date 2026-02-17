const config = require('../config');
const logger = require('../utils/logger');

const requestCounts = new Map();

const rateLimiter = (options = {}) => {
  const {
    windowMs = config.rateLimit.windowMs,
    maxRequests = config.rateLimit.maxRequests,
    message = 'Too many requests, please try again later.'
  } = options;

  return (req, res, next) => {
    const key = req.user ? req.user._id.toString() : req.ip;
    const now = Date.now();

    if (!requestCounts.has(key)) {
      requestCounts.set(key, []);
    }

    const requests = requestCounts.get(key);

    const validRequests = requests.filter(time => now - time < windowMs);
    requestCounts.set(key, validRequests);

    if (validRequests.length >= maxRequests) {
      logger.warn(`Rate limit exceeded for ${key}`);
      
      return res.status(429).json({
        success: false,
        message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    validRequests.push(now);
    requestCounts.set(key, validRequests);

    res.set({
      'X-RateLimit-Limit': maxRequests,
      'X-RateLimit-Remaining': maxRequests - validRequests.length,
      'X-RateLimit-Reset': new Date(now + windowMs).toISOString()
    });

    next();
  };
};

setInterval(() => {
  const now = Date.now();
  const windowMs = config.rateLimit.windowMs;
  
  for (const [key, requests] of requestCounts.entries()) {
    const validRequests = requests.filter(time => now - time < windowMs);
    
    if (validRequests.length === 0) {
      requestCounts.delete(key);
    } else {
      requestCounts.set(key, validRequests);
    }
  }
}, 60000); 

module.exports = rateLimiter;