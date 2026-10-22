import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { USER_ROLES, USER_STATUSES, toPublicUser } from "../auth/auth.types.js";
import { userRepository } from "../auth/user.repository.js";
import { objectIdSchema } from "../../lib/ids.js";
import { prisma } from "../../lib/prisma.js";
import { recordAccess } from "../access-log/access-log.js";

const idSchema = objectIdSchema;
const profileSchema = z.object({
  name: z.string().trim().min(2).max(120),
  document: z.preprocess((value) => value === "" ? undefined : value, z.string().trim().min(11).max(18).optional()),
});
const createUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().max(255).email(),
  document: z.preprocess((value) => value === "" ? undefined : value, z.string().trim().min(11).max(18).optional()),
  password: z.string().min(8).max(128),
  role: z.enum(USER_ROLES),
});
const settingsSchema = z.object({
  unidadeTemp: z.enum(["c", "f"]).optional(),
  formatoExport: z.enum(["csv", "xlsx"]).optional(),
  alertaDivergencia: z.boolean().optional(),
  limiteDivergencia: z.coerce.number().int().min(1).max(100).optional(),
  alertaSensor: z.boolean().optional(),
  canais: z.array(z.string().trim().min(1).max(50)).optional(),
  frequenciaAtualizacao: z.coerce.number().int().min(0).max(3600).optional(),
}).strict();
const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});
const statusSchema = z.object({ status: z.enum(USER_STATUSES) });
const roleSchema = z.object({ role: z.enum(USER_ROLES) });

export const usersRouter = Router();

usersRouter.use(authenticate);

usersRouter.get("/me", async (request, response, next) => {
  try {
    const user = await userRepository.findById(request.user!.id);
    return response.status(200).json({ user: toPublicUser(user!) });
  } catch (error) {
    next(error);
  }
});

usersRouter.patch("/me", async (request, response, next) => {
  try {
    const input = profileSchema.parse(request.body);
    if (input.document) {
      const existingUser = await userRepository.findByDocument(input.document);
      if (existingUser && existingUser.id !== request.user!.id) {
        return response.status(409).json({ error: "Documento já cadastrado" });
      }
    }
    const user = await userRepository.updateProfile(request.user!.id, input);
    return response.status(200).json({ user: toPublicUser(user!) });
  } catch (error) {
    next(error);
  }
});

usersRouter.patch("/me/password", async (request, response, next) => {
  try {
    const { currentPassword, newPassword } = passwordSchema.parse(request.body);
    const user = await userRepository.findById(request.user!.id);
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      return response.status(400).json({ error: "Senha atual inválida" });
    }
    if (await bcrypt.compare(newPassword, user.passwordHash)) {
      return response.status(400).json({ error: "A nova senha deve ser diferente da atual" });
    }
    await userRepository.updatePassword(user.id, newPassword);
    return response.status(200).json({ message: "Senha atualizada com sucesso" });
  } catch (error) {
    next(error);
  }
});

usersRouter.get("/me/notifications", async (request, response, next) => {
  try {
    const notifications = await prisma.notificacao.findMany({
      where: { usuarioId: request.user!.id },
      orderBy: { criadaEm: "desc" },
      take: 100,
      include: {
        alerta: {
          select: {
            id: true,
            tipo: true,
            mensagem: true,
            nivel: true,
            status: true,
            previsao: {
              select: {
                tipo: true,
                dataInicio: true,
                dataFim: true,
                talhao: { select: { id: true, nome: true } },
              },
            },
          },
        },
      },
    });

    return response.status(200).json({
      data: notifications.map((notification) => ({
        id: notification.id,
        titulo: notification.titulo,
        mensagem: notification.mensagem,
        lida: notification.lida,
        criadaEm: notification.criadaEm.toISOString(),
        alerta: notification.alerta,
      })),
    });
  } catch (error) {
    next(error);
  }
});

usersRouter.get("/me/configuration", async (request, response, next) => {
  try {
    const settings = await prisma.configuracao.findMany({
      where: { usuarioId: request.user!.id },
      orderBy: { chave: "asc" },
    });
    const data = Object.fromEntries(settings.map((setting) => {
      try {
        return [setting.chave, JSON.parse(setting.valor ?? "null")];
      } catch {
        return [setting.chave, setting.valor];
      }
    }));
    return response.status(200).json({ data });
  } catch (error) {
    next(error);
  }
});

usersRouter.put("/me/configuration", async (request, response, next) => {
  try {
    const settings = settingsSchema.parse(request.body);
    const updates = Object.entries(settings).filter(([, value]) => value !== undefined);
    if (updates.length) {
      await prisma.$transaction(updates.map(([chave, valor]) => prisma.configuracao.upsert({
        where: { usuarioId_chave: { usuarioId: request.user!.id, chave } },
        create: { usuarioId: request.user!.id, chave, valor: JSON.stringify(valor) },
        update: { valor: JSON.stringify(valor), atualizadoEm: new Date() },
      })));
    }
    return response.status(200).json({ data: settings });
  } catch (error) {
    next(error);
  }
});

usersRouter.get("/", authorize("ADMIN"), async (_request, response, next) => {
  try {
    const users = await userRepository.list();
    return response.status(200).json({ data: users.map(toPublicUser) });
  } catch (error) {
    next(error);
  }
});

usersRouter.post("/", authorize("ADMIN"), async (request, response, next) => {
  try {
    const input = createUserSchema.parse(request.body);
    if (await userRepository.findByEmail(input.email)) {
      return response.status(409).json({ error: "E-mail já cadastrado" });
    }
    if (input.document && await userRepository.findByDocument(input.document)) {
      return response.status(409).json({ error: "Documento já cadastrado" });
    }
    const user = await userRepository.create(input);
    await recordAccess(request, request.user!.id, "CADASTRO", "SUCESSO");
    return response.status(201).json({ user: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
});

usersRouter.get("/access-logs", authorize("ADMIN"), async (_request, response, next) => {
  try {
    const logs = await prisma.logAcesso.findMany({
      orderBy: { dataHora: "desc" },
      take: 200,
      include: { usuario: { select: { nome: true, email: true } } },
    });
    return response.status(200).json({
      data: logs.map((log) => ({
        id: log.id,
        action: log.acao,
        result: log.resultado,
        timestamp: log.dataHora,
        ip: log.enderecoIp,
        userAgent: log.userAgent,
        user: log.usuario?.nome ?? "Sistema",
        email: log.usuario?.email ?? null,
      })),
    });
  } catch (error) {
    next(error);
  }
});

usersRouter.patch("/:id/status", authorize("ADMIN"), async (request, response, next) => {
  try {
    const id = idSchema.parse(request.params.id);
    const { status } = statusSchema.parse(request.body);
    if (id === request.user!.id) {
      return response.status(400).json({ error: "Você não pode alterar seu próprio status" });
    }
    const target = await userRepository.findById(id);
    if (!target) return response.status(404).json({ error: "Usuário não encontrado" });
    if (target.role === "ADMIN" && status === "INACTIVE") {
      const users = await userRepository.list();
      const otherActiveAdmin = users.some((user) => user.id !== target.id && user.role === "ADMIN" && user.status === "ACTIVE");
      if (!otherActiveAdmin) return response.status(400).json({ error: "O último administrador ativo não pode ser inativado" });
    }
    const user = await userRepository.updateStatus(id, status);
    await recordAccess(request, request.user!.id, "USUARIO_STATUS", "SUCESSO");
    return response.status(200).json({ user: toPublicUser(user!) });
  } catch (error) {
    next(error);
  }
});

usersRouter.patch("/:id/role", authorize("ADMIN"), async (request, response, next) => {
  try {
    const id = idSchema.parse(request.params.id);
    const { role } = roleSchema.parse(request.body);
    if (id === request.user!.id) {
      return response.status(400).json({ error: "Você não pode alterar sua própria role" });
    }
    const target = await userRepository.findById(id);
    if (!target) return response.status(404).json({ error: "Usuário não encontrado" });
    if (target.role === "ADMIN" && role !== "ADMIN" && target.status === "ACTIVE") {
      const users = await userRepository.list();
      const otherActiveAdmin = users.some((user) => user.id !== target.id && user.role === "ADMIN" && user.status === "ACTIVE");
      if (!otherActiveAdmin) return response.status(400).json({ error: "O último administrador ativo não pode ter a role alterada" });
    }
    const user = await userRepository.updateRole(id, role);
    await recordAccess(request, request.user!.id, "USUARIO_PERFIL", "SUCESSO");
    return response.status(200).json({ user: toPublicUser(user!) });
  } catch (error) {
    next(error);
  }
});
