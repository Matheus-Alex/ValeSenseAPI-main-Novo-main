import type { Request } from "express";
import { prisma } from "../../lib/prisma.js";

export async function recordAccess(
  request: Request,
  userId: string | null,
  action: string,
  result: "SUCESSO" | "FALHA",
) {
  await prisma.logAcesso.create({
    data: {
      usuarioId: userId,
      acao: action,
      enderecoIp: request.ip,
      userAgent: request.get("user-agent")?.slice(0, 255),
      resultado: result,
    },
  });
}
