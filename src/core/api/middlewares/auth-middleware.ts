import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../../../utils/pino-logger.js';

const logger = createLogger('api-auth');

// Simple API Key middleware
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;

    // TODO: In a real production app, this would check against a DB or secure secret store
    // For now, we'll use a placeholder or check against an environment variable
    const validApiKey = process.env.VIBE_API_KEY || 'vibe-secret-key';

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
