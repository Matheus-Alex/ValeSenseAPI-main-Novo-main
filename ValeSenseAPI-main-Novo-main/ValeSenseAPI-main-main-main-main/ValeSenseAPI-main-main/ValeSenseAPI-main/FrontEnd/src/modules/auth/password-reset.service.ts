import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { userRepository } from "./user.repository.js";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function requestPasswordReset(email: string) {
  const user = await userRepository.findByEmail(email);
  if (!user || user.status !== "ACTIVE") return null;

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + env.PASSWORD_RESET_EXPIRES_MINUTES * 60 * 1000);
  await prisma.$transaction([
    prisma.tokenRecuperacao.deleteMany({ where: { usuarioId: user.id } }),
    prisma.tokenRecuperacao.create({
      data: { usuarioId: user.id, tokenHash: hashToken(token), expiracao: expiresAt },
    }),
  ]);
  return { token, email: user.email, expiresAt };
}

export async function resetPassword(token: string, password: string) {
  const now = new Date();
  const tokenHash = hashToken(token);
  return prisma.$transaction(async (transaction) => {
    const tokenRecord = await transaction.tokenRecuperacao.findUnique({ where: { tokenHash } });
    if (!tokenRecord || tokenRecord.expiracao <= now) return false;

    const user = await transaction.usuario.findUnique({ where: { id: tokenRecord.usuarioId } });
    if (!user || user.status !== "ACTIVE") return false;

    const consumed = await transaction.tokenRecuperacao.deleteMany({
      where: { id: tokenRecord.id, expiracao: { gt: now } },
    });
    if (!consumed.count) return false;

    await transaction.usuario.update({
      where: { id: user.id },
      data: { senha: await bcrypt.hash(password, 12) },
    });
    await transaction.tokenRecuperacao.deleteMany({ where: { usuarioId: user.id } });
    return true;
  });
}
