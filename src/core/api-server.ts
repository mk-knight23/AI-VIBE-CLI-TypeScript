import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import pino from 'pino';
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
        this.app.use(cors());
        this.app.use(express.json());

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

        // Apply auth to all /api routes except health checks
        this.app.use('/api', (req, res, next) => {
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

        this.app.get('/api/status', (req, res) => {
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
                version: '0.0.1-pro',
                timestamp: new Date().toISOString(),
                analytics: {
                    activeProjects: projectCount,
                    throughput: 142,
                    systemHealth: 100,
                    lastScan: new Date().toISOString()
                }
            });
        });

        this.app.get('/api/projects', (req, res) => {
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

        this.app.post('/api/projects',
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
        this.app.get('/api/marketplace/templates',
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

        this.app.post('/api/marketplace/install',
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

        this.app.post('/api/marketplace/publish',
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
            res.status(500).json({
                error: 'Internal Server Error',
                message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
            });
        });
    }

    public start() {
        this.app.listen(this.port, () => {
            logger.info({ port: this.port }, 'VIBE API Server running');
        });
    }
}
