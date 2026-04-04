import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
    console.error('Error:', err.message);

    const statusCode = (err as any).statusCode || 500;
    const message = process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message;

    res.status(statusCode).json({
        error: message,
        code: statusCode,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    });
}
