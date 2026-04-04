// Server types
import { AuthUser } from '../../../shared/types';

export interface AuthenticatedRequest extends Express.Request {
    user?: AuthUser;
}
