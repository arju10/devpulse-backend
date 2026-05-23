import type { JwtPayload } from '../modules/auth/auth.interface';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}