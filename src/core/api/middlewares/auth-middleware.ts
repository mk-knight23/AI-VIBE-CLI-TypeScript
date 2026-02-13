import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../../../utils/pino-logger.js';

const logger = createLogger('api-auth');

// Simple API Key middleware
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.headers['x-api-key'];

    // Require explicit API key configuration - fail closed for security
    const validApiKey = process.env.VIBE_API_KEY;

    if (!validApiKey) {
        logger.error('VIBE_API_KEY environment variable is not set. API access is disabled.');
        res.status(500).json({
            error: 'Server Configuration Error',
            message: 'API key not configured. Please set VIBE_API_KEY environment variable.'
        });
        return;
    }

    if (!apiKey || apiKey !== validApiKey) {
        logger.warn({ ip: req.ip, url: req.url }, 'Unauthorized API access attempt');
        res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid or missing API key. Please provide a valid x-api-key header.'
        });
        return;
    }

    next();
};
