import rateLimit from 'express-rate-limit';

// General rate limiter: 100 requests per minute per IP
export const generalLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100,
    message: { error: 'Too many requests, please try again later.', code: 429 },
    standardHeaders: true,
    legacyHeaders: false,
});

// Submission-specific rate limiter: 10 submissions per hour per IP
export const submissionLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: { error: 'Too many submissions. Maximum 10 per hour.', code: 429 },
    standardHeaders: true,
    legacyHeaders: false,
});

// Auth rate limiter: 20 auth attempts per 15 minutes per IP
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    message: { error: 'Too many auth attempts, please try again later.', code: 429 },
    standardHeaders: true,
    legacyHeaders: false,
});
