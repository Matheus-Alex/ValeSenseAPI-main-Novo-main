import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../../config/env.js";
import type { User } from "./auth.types.js";

type TokenPayload = { sub: string; email: string; role: User["role"] };

export function signToken(user: User) {
  return jwt.sign(
    { email: user.email, role: user.role },
    env.JWT_SECRET,
    { subject: user.id, expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"] },
  );
}

export function verifyToken(token: string): TokenPayload {
  const payload = jwt.verify(token, env.JWT_SECRET);
  if (typeof payload === "string" || !payload.sub || !payload.email || !payload.role) {
    throw new jwt.JsonWebTokenError("Token inválido");
  }
  return { sub: payload.sub, email: payload.email, role: payload.role as User["role"] };
}
