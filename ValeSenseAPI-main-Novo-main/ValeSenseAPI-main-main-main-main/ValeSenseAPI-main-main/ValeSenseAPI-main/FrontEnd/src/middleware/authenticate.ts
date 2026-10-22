import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../modules/auth/token.js";
import { userRepository } from "../modules/auth/user.repository.js";

export async function authenticate(request: Request, response: Response, next: NextFunction) {
  const authorization = request.header("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return response.status(401).json({ error: "Token de autenticação ausente" });
  }

  let payload: ReturnType<typeof verifyToken>;
  try {
    payload = verifyToken(authorization.slice(7));
  } catch {
    return response.status(401).json({ error: "Token de autenticação inválido ou expirado" });
  }

  try {
    const user = await userRepository.findById(payload.sub);
    if (!user || user.status !== "ACTIVE") {
      return response.status(401).json({ error: "Usuário não encontrado ou inativo" });
    }
    request.user = { id: user.id, email: user.email, role: user.role };
    return next();
  } catch (error) {
    return next(error);
  }
}
