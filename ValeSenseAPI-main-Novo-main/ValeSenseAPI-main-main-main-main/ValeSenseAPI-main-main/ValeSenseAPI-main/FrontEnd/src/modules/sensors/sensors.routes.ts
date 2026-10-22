import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { objectIdSchema } from "../../lib/ids.js";
import { prisma } from "../../lib/prisma.js";
import { recordAccess } from "../access-log/access-log.js";

const sensorStatusSchema = z.object({
  status: z.enum(["ATIVO", "INATIVO", "MANUTENCAO"]),
});

const createSensorSchema = z.object({
  talhaoId: objectIdSchema,
  identificador: z.string().trim().min(1).max(50),
  canalThingSpeak: z.string().trim().max(50).optional(),
});

export const sensorsRouter = Router();
sensorsRouter.use(authenticate);

sensorsRouter.get("/plots", async (request, response, next) => {
  try {
    if (request.user!.role !== "ADMIN" && request.user!.role !== "PRODUTOR_EXPORTADOR") {
      return response.status(403).json({ error: "Acesso não autorizado" });
    }
    const plots = await prisma.talhao.findMany({
      where: request.user!.role === "PRODUTOR_EXPORTADOR"
        ? { propriedade: { usuarioId: request.user!.id } }
        : undefined,
      orderBy: { nome: "asc" },
      select: {
        id: true,
        nome: true,
        area: true,
        unidadeArea: true,
        propriedade: { select: { nome: true } },
      },
    });
    return response.status(200).json({ data: plots });
  } catch (error) {
    next(error);
  }
});

sensorsRouter.get("/", async (request, response, next) => {
  try {
    const sensors = await prisma.sensor.findMany({
      where: request.user!.role === "PRODUTOR_EXPORTADOR"
        ? { talhao: { propriedade: { usuarioId: request.user!.id } } }
        : undefined,
      orderBy: { identificador: "asc" },
      include: {
        talhao: {
          select: {
            id: true,
            nome: true,
            propriedade: { select: { nome: true } },
          },
        },
        leituras: { orderBy: { dataHora: "desc" }, take: 1 },
      },
    });
    return response.status(200).json({
      data: sensors.map((sensor) => ({
        id: sensor.id,
        identificador: sensor.identificador,
        status: sensor.status,
        canalThingSpeak: sensor.canalThingSpeak,
        talhao: sensor.talhao,
        ultimaLeitura: sensor.leituras[0]
          ? {
              temperatura: Number(sensor.leituras[0].temperatura),
              umidade: Number(sensor.leituras[0].umidade),
              timestamp: sensor.leituras[0].dataHora.toISOString(),
            }
          : null,
      })),
    });
  } catch (error) {
    next(error);
  }
});

sensorsRouter.post("/", authorize("ADMIN"), async (request, response, next) => {
  try {
    const input = createSensorSchema.parse(request.body);
    const sensor = await prisma.sensor.create({
      data: {
        talhaoId: input.talhaoId,
        identificador: input.identificador,
        canalThingSpeak: input.canalThingSpeak || null,
      },
    });
    await recordAccess(request, request.user!.id, "SENSOR", "SUCESSO");
    return response.status(201).json({ sensor });
  } catch (error) {
    next(error);
  }
});

sensorsRouter.patch("/:id/status", authorize("ADMIN"), async (request, response, next) => {
  try {
    const id = objectIdSchema.parse(request.params.id);
    const { status } = sensorStatusSchema.parse(request.body);
    const result = await prisma.sensor.updateMany({ where: { id }, data: { status } });
    if (!result.count) return response.status(404).json({ error: "Sensor não encontrado" });
    const sensor = await prisma.sensor.findUnique({ where: { id } });
    await recordAccess(request, request.user!.id, "SENSOR", "SUCESSO");
    return response.status(200).json({ sensor });
  } catch (error) {
    next(error);
  }
});
