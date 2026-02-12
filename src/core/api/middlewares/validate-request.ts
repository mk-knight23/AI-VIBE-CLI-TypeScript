import { Request, Response, NextFunction } from 'express';
import { ZodObject, ZodError } from 'zod';
import { createLogger } from '../../../utils/pino-logger.js';

const logger = createLogger('api-validation');

export const validateRequest = (schema: ZodObject<any>) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            next();
        } catch (error: any) {
            if (error instanceof ZodError) {
                logger.warn({ path: req.path, errors: error.issues }, 'API request validation failed');
                res.status(400).json({
                    error: 'Validation Error',
                    details: error.issues.map(e => ({
                        path: e.path.join('.'),
                        message: e.message
                    }))
                });
                return;
            }
            next(error);
        }
    };
};
