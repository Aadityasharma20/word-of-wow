import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../../../shared/types';

export function roleGuard(...allowedRoles: UserRole[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized', code: 401 });
            return;
        }

        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({ error: 'Forbidden', code: 403 });
            return;
        }

        next();
    };
}
