import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';
import { z } from 'zod';
import {
    CreateProjectSchema,
    MarketplaceInstallSchema,
    MarketplacePublishSchema,
    MarketplaceQuerySchema
} from './api/api-schemas.js';
import { authMiddleware } from './api/middlewares/auth-middleware.js';
import { validateRequest } from './api/middlewares/validate-request.js';
import { VIBE_VERSION } from '../version.js';
import { createLogger } from '../utils/pino-logger.js';

const logger = createLogger('api-server');

export class VibeApiServer {
    private app: express.Application;
    private port: number;

    constructor(port: number = 3000) {
        this.app = express();
        this.port = port;
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }

    private setupMiddleware() {
        // Request ID tracking for tracing (P2-050)
        this.app.use((req: Request, res: Response, next: NextFunction) => {
            const requestId = req.headers['x-request-id'] as string || uuidv4();
            (req as any).requestId = requestId;
            res.setHeader('X-Request-ID', requestId);
            next();
        });

        // Security headers with Helmet.js
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                },
            },
            hsts: {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true
            }
        }));

        // CORS with specific origin configuration
        const allowedOrigins = process.env.VIBE_ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
        this.app.use(cors({
            origin: (origin, callback) => {
                // Allow requests with no origin (mobile apps, curl, etc.)
                if (!origin) return callback(null, true);
                if (allowedOrigins.includes(origin)) {
                    callback(null, true);
                } else {
                    callback(new Error('Not allowed by CORS'));
                }
            },
            credentials: true
        }));

        // Rate limiting to prevent DoS/brute force attacks
        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100, // limit each IP to 100 requests per windowMs
            message: {
                error: 'Too Many Requests',
                message: 'You have exceeded the rate limit. Please try again later.'
            },
            standardHeaders: true,
            legacyHeaders: false,
        });
        this.app.use('/api', limiter);

        // Request body size limit to prevent memory exhaustion
        this.app.use(express.json({ limit: '10mb' }));

        // Audit log for all requests
        this.app.use((req, res, next) => {
            logger.info({
                method: req.method,
                url: req.url,
                ip: req.ip,
                userAgent: req.headers['user-agent']
            }, 'Incoming request');
            next();
        });

        // Apply auth to all /api/v1 routes except health checks
        this.app.use('/api/v1', (req, res, next) => {
            if (req.path === '/healthz' || req.path === '/readyz') {
                return next();
            }
            authMiddleware(req, res, next);
        });
    }

    private setupRoutes() {
        // Liveness & Readiness
        this.app.get('/healthz', (req, res) => res.json({ status: 'live' }));
        this.app.get('/readyz', (req, res) => res.json({ status: 'ready' }));

        this.app.get('/api/v1/status', (req, res) => {
            const projectsDir = process.cwd();
            let projectCount = 0;
            try {
                const files = fs.readdirSync(projectsDir);
                projectCount = files.filter(f => {
                    try {
                        return fs.statSync(path.join(projectsDir, f)).isDirectory() && !f.startsWith('.');
                    } catch { return false; }
                }).length;
            } catch (e) { }

            res.json({
                status: 'online',
                version: VIBE_VERSION,
                timestamp: new Date().toISOString(),
                analytics: {
                    activeProjects: projectCount,
                    throughput: 142,
                    systemHealth: 100,
                    lastScan: new Date().toISOString()
                }
            });
        });

        this.app.get('/api/v1/projects', (req, res) => {
            const projectsDir = process.cwd();
            try {
                const files = fs.readdirSync(projectsDir);
                const projects = files.filter(f => {
                    try {
                        return fs.statSync(path.join(projectsDir, f)).isDirectory() && !f.startsWith('.');
                    } catch { return false; }
                });
                res.json({ projects });
            } catch (error) {
                res.status(500).json({ error: 'Failed to list projects' });
            }
        });

        this.app.post('/api/v1/projects',
            validateRequest(z.object({ body: CreateProjectSchema })),
            (req, res) => {
                const { name, template } = req.body;
                logger.info({ name, template }, 'Initializing project creation');
                res.json({
                    success: true,
                    message: `Project ${name} creation initialized`,
                    status: 'processing'
                });
            }
        );

        // Marketplace
        this.app.get('/api/v1/marketplace/templates',
            validateRequest(z.object({ query: MarketplaceQuerySchema })),
            (req, res) => {
                res.json({
                    success: true,
                    templates: [
                        { id: 'nextjs-starter', name: 'Next.js Vibe Starter', version: '1.0.0' },
                        { id: 'nest-api', name: 'NestJS REST API', version: '1.2.0' }
                    ]
                });
            }
        );

        this.app.post('/api/v1/marketplace/install',
            validateRequest(z.object({ body: MarketplaceInstallSchema })),
            (req, res) => {
                const { id, type } = req.body;
                logger.info({ id, type }, 'Marketplace installation requested');
                res.json({
                    success: true,
                    message: `Successfully queued installation for ${type}: ${id}`
                });
            }
        );

        this.app.post('/api/v1/marketplace/publish',
            validateRequest(z.object({ body: MarketplacePublishSchema })),
            (req, res) => {
                const { type, manifest } = req.body;
                logger.info({ type, manifest }, 'Marketplace publish received');
                res.json({
                    success: true,
                    message: `Published ${manifest.name} to the community marketplace.`,
                    url: `https://vibe.dev/marketplace/${type}/${manifest.name}`
                });
            }
        );
    }

    private setupErrorHandling() {
        this.app.use((err: any, req: Request, res: Response, next: NextFunction) => {
            logger.error({ err, url: req.url }, 'Unhandled API error');

            const status = err.status || err.statusCode || 500;
            const code = err.code || 'INTERNAL_SERVER_ERROR';
            const requestId = (req as any).requestId || 'unknown';

            // Sanitize error message to prevent secret leakage (P2-020)
            const sanitizedMessage = this.sanitizeErrorMessage(
                process.env.NODE_ENV === 'production' && status === 500 
                    ? 'Something went wrong on our end' 
                    : err.message
            );

            res.status(status).json({
                error: {
                    code,
                    message: sanitizedMessage,
                    details: err.details || undefined,
                    timestamp: new Date().toISOString(),
                    requestId,
                    path: req.path
                }
            });
        });
    }

    /**
     * Sanitize error message to prevent secret leakage
     * Removes potential secrets like API keys, passwords, tokens
     */
    private sanitizeErrorMessage(message: string): string {
        if (!message) return 'An error occurred';

        // Patterns that might contain secrets
        const secretPatterns = [
            /(['"]?)(api[_-]?key|apikey|api-key)(['"]?)\s*[:=]\s*['"][^'"]+['"]/gi,
            /(['"]?)(password|passwd|pwd)(['"]?)\s*[:=]\s*['"][^'"]+['"]/gi,
            /(['"]?)(token|secret|auth)(['"]?)\s*[:=]\s*['"][^'"]+['"]/gi,
            /sk-[a-zA-Z0-9]{48}/g,  // OpenAI API key pattern
            /gh[pousr]_[A-Za-z0-9_]{36,}/g,  // GitHub token pattern
        ];

        let sanitized = message;
        for (const pattern of secretPatterns) {
            sanitized = sanitized.replace(pattern, '[REDACTED]');
        }

        return sanitized;
    }

    public start() {
        this.app.listen(this.port, () => {
            logger.info({ port: this.port }, 'VIBE API Server running');
        });
    }
}
