import rateLimit from "express-rate-limit";

// Global Rate Limiter: 100 requests per 15 minutes
export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        success: false,
        message: "Too many requests from this IP, please try again after 15 minutes",
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, _next, options) => {
        console.warn(`Rate limit exceeded: Global limit hit by IP ${req.ip}`);
        res.status(options.statusCode).json(options.message);
    },
});

// Auth Rate Limiter: 5 login/signup attempts per minute
export const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: {
        success: false,
        message: "Too many login attempts, please try again after 1 minute",
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, _next, options) => {
        console.warn(`Rate limit exceeded: Auth limit hit by IP ${req.ip} for route ${req.originalUrl}`);
        res.status(options.statusCode).json(options.message);
    },
});
