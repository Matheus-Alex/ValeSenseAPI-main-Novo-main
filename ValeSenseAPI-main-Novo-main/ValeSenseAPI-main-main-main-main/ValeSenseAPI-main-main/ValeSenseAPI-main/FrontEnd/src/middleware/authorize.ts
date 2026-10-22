import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "../modules/auth/auth.types.js";

export function authorize(...roles: UserRole[]) {
  return (request: Request, response: Response, next: NextFunction) => {
    if (!request.user || !roles.includes(request.user.role)) {
      return response.status(403).json({ error: "Você não possui permissão para esta ação" });
    }
    return next();
  };
}
