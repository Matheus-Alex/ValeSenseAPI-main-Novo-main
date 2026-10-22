import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/authenticate.js";
import { objectIdSchema } from "../../lib/ids.js";
import { prisma } from "../../lib/prisma.js";

const querySchema = z.object({
  horas: z.coerce.number().int().min(1).max(8760).optional(),
  dias: z.coerce.number().int().min(1).max(365).optional(),
  sensorId: objectIdSchema.optional(),
});

export const weatherDataRouter = Router();

weatherDataRouter.get("/", authenticate, async (request, response, next) => {
  try {
    const { horas, dias, sensorId } = querySchema.parse(request.query);
    const periodoHoras = horas ?? (dias ?? 1) * 24;
    const inicio = new Date(Date.now() - periodoHoras * 60 * 60 * 1000);
    const readings = await prisma.leituraClimatica.findMany({
      where: {
        dataHora: { gte: inicio },
        ...(sensorId && { sensorId }),
        ...(request.user!.role === "PRODUTOR_EXPORTADOR" && {
          sensor: { talhao: { propriedade: { usuarioId: request.user!.id } } },
        }),
      },
      orderBy: { dataHora: "desc" },
      take: 1000,
      include: {
        sensor: {
          select: {
            id: true,
            identificador: true,
            status: true,
            canalThingSpeak: true,
            talhao: { select: { id: true, nome: true } },
          },
        },
      },
    });

    return response.status(200).json({
      data: readings.reverse().map((reading) => ({
        id: reading.id,
        temperatura: Number(reading.temperatura),
        umidade: Number(reading.umidade),
        timestamp: reading.dataHora.toISOString(),
        sensor: {
          id: reading.sensor.id,
          identificador: reading.sensor.identificador,
          status: reading.sensor.status,
          canalThingSpeak: reading.sensor.canalThingSpeak,
          talhao: reading.sensor.talhao,
        },
      })),
      source: "database",
      periodHours: periodoHoras,
    });
  } catch (error) {
    next(error);
  }
});
