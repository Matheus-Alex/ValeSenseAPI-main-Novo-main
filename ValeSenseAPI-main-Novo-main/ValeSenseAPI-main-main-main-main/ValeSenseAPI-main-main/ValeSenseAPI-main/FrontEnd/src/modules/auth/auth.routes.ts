import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { env } from "../../config/env.js";
import { authenticate } from "../../middleware/authenticate.js";
import { signToken } from "./token.js";
import { toPublicUser } from "./auth.types.js";
import { requestPasswordReset, resetPassword } from "./password-reset.service.js";
import { userRepository } from "./user.repository.js";
import { recordAccess } from "../access-log/access-log.js";

const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().max(255).email(),
  document: z.preprocess((value) => value === "" ? undefined : value, z.string().trim().min(11).max(18).optional()),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().trim().max(255).email(),
  password: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().max(255).email(),
});

const resetPasswordSchema = z.object({
  token: z.string().length(64),
  password: z.string().min(8).max(128),
});

const passwordResetResponse = {
  message: "Se o e-mail estiver cadastrado, você receberá as instruções para redefinir sua senha.",
};

export const authRouter = Router();

authRouter.post("/register", async (request, response, next) => {
  try {
    const input = registerSchema.parse(request.body);
    if (await userRepository.findByEmail(input.email)) {
      return response.status(409).json({ error: "E-mail já cadastrado" });
    }
    if (input.document && await userRepository.findByDocument(input.document)) {
      return response.status(409).json({ error: "Documento já cadastrado" });
    }

    const user = await userRepository.create({ ...input, role: "ANALISTA" });
    await recordAccess(request, user.id, "CADASTRO", "SUCESSO");
    return response.status(201).json({ user: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/login", async (request, response, next) => {
  try {
    const input = loginSchema.parse(request.body);
    const user = await userRepository.findByEmail(input.email);
    if (!user || user.status !== "ACTIVE" || !(await bcrypt.compare(input.password, user.passwordHash))) {
      await recordAccess(request, user?.id ?? null, "LOGIN", "FALHA");
      return response.status(401).json({ error: "E-mail ou senha inválidos" });
    }

    await recordAccess(request, user.id, "LOGIN", "SUCESSO");
    return response.status(200).json({ token: signToken(user), user: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/forgot-password", async (request, response, next) => {
  try {
    const { email } = forgotPasswordSchema.parse(request.body);
    const reset = await requestPasswordReset(email);

    if (reset && env.NODE_ENV === "development") {
      console.info(`[password-reset] Link de teste para ${reset.email}: http://localhost:5173/reset-password?token=${reset.token}`);
    }

    return response.status(200).json(passwordResetResponse);
  } catch (error) {
    next(error);
  }
});

authRouter.post("/reset-password", async (request, response, next) => {
  try {
    const { token, password } = resetPasswordSchema.parse(request.body);
    const wasReset = await resetPassword(token, password);
    if (!wasReset) {
      return response.status(400).json({ error: "Token inválido, expirado ou já utilizado" });
    }
    return response.status(200).json({ message: "Senha redefinida com sucesso" });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", authenticate, async (request, response, next) => {
  try {
    const user = await userRepository.findById(request.user!.id);
    if (!user || user.status !== "ACTIVE") {
      return response.status(401).json({ error: "Usuário não encontrado ou inativo" });
    }
    return response.status(200).json({ user: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
});
