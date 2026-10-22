import type { UserRole } from "../modules/auth/auth.types.ts";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: UserRole; email: string };
    }
  }
}

export {};
