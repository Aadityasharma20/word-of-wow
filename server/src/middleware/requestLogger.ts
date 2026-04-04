import { Request, Response, NextFunction } from 'express';
import { logger, generateRequestId } from '../lib/logger';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
    const requestId = generateRequestId();
    const start = Date.now();

    // Attach request ID for downstream use
    (req as any).requestId = requestId;

    res.on('finish', () => {
        const duration = Date.now() - start;
        const logData = {
            requestId,
            method: req.method,
            path: req.originalUrl,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
            userAgent: req.get('user-agent')?.substring(0, 80),
        };

        if (res.statusCode >= 500) {
            logger.error(logData, 'Request failed');
        } else if (res.statusCode >= 400) {
            logger.warn(logData, 'Client error');
        } else {
            logger.info(logData, 'Request completed');
        }
    });

    next();
}
