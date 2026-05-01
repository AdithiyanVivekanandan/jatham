const rateLimit = require('express-rate-limit');

// General limiter for most routes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' }
});

// Specific limiter for OTP requests (3 per phone per 10 mins)
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 3,
  keyGenerator: (req) => req.body.phone || req.ip,
  message: { error: 'Too many OTP requests for this phone number, please try again later' }
});

// Specific limiter for Match routes (30 requests per user per minute)
const matchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  keyGenerator: (req) => req.user ? req.user.id : req.ip,
  message: { error: 'Too many match requests, please slow down' }
});

module.exports = {
  generalLimiter,
  otpLimiter,
  matchLimiter
};
