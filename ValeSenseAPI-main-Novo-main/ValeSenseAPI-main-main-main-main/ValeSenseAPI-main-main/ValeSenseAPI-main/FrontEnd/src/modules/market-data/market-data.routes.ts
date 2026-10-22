import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/authenticate.js";
import { prisma } from "../../lib/prisma.js";

const querySchema = z.object({
  dias: z.coerce.number().int().min(1).max(365).default(7),
  produto: z.string().trim().min(1).max(100).optional(),
});

export const marketDataRouter = Router();

marketDataRouter.get("/", authenticate, async (request, response, next) => {
  try {
    const { dias, produto } = querySchema.parse(request.query);
    const agora = new Date();
    const inicio = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate()));
    inicio.setUTCDate(inicio.getUTCDate() - dias + 1);

    const entries = await prisma.dadoMercado.findMany({
      where: {
        dataReferencia: { gte: inicio },
        ...(produto && { produto: { contains: produto, mode: "insensitive" } }),
      },
      orderBy: [{ dataReferencia: "desc" }, { produto: "asc" }],
      take: 1000,
    });

    return response.status(200).json({
      data: entries.map((entry) => ({
        id: entry.id,
        produto: entry.produto,
        preco: Number(entry.preco),
        unidadePreco: entry.unidadePreco,
        demanda: entry.demanda,
        data: entry.dataReferencia.toISOString().slice(0, 10),
      })),
      source: "database",
      periodDays: dias,
    });
  } catch (error) {
    next(error);
  }
});
