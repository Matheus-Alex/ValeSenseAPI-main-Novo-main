import bcrypt from "bcryptjs";
import type { Usuario as DatabaseUser } from "@prisma/client";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import type { User, UserRole, UserStatus } from "./auth.types.js";

export type CreateUserInput = {
  name: string;
  email: string;
  document?: string;
  password: string;
  role: UserRole;
};

export interface UserRepository {
  list(): Promise<User[]>;
  findByEmail(email: string): Promise<User | null>;
  findByDocument(document: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(input: CreateUserInput): Promise<User>;
  updatePassword(id: string, password: string): Promise<User | null>;
  updateProfile(id: string, input: Pick<CreateUserInput, "name" | "document">): Promise<User | null>;
  updateRole(id: string, role: UserRole): Promise<User | null>;
  updateStatus(id: string, status: UserStatus): Promise<User | null>;
}

const roleToProfile: Record<UserRole, string> = {
  ADMIN: "ADMINISTRADOR",
  ANALISTA: "ANALISTA_DADOS",
  PRODUTOR_EXPORTADOR: "PRODUTOR_EXPORTADOR",
};
const profileToRole: Record<string, UserRole> = {
  ADMINISTRADOR: "ADMIN",
  ANALISTA_DADOS: "ANALISTA",
  PRODUTOR_EXPORTADOR: "PRODUTOR_EXPORTADOR",
};

const statusToDatabase: Record<UserStatus, string> = {
  ACTIVE: "ATIVO",
  INACTIVE: "INATIVO",
};
const databaseToStatus: Record<string, UserStatus> = {
  ATIVO: "ACTIVE",
  INATIVO: "INACTIVE",
};

function toUser(record: DatabaseUser): User {
  const role = profileToRole[record.perfil];
  const status = databaseToStatus[record.status];
  if (!role || !status) {
    throw new Error(`Perfil ou status inválido para o usuário ${record.id}`);
  }
  return {
    id: record.id,
    name: record.nome,
    email: record.email,
    document: record.cpf ?? undefined,
    passwordHash: record.senha,
    role,
    status,
  };
}

class PrismaUserRepository implements UserRepository {
  async list() {
    const users = await prisma.usuario.findMany({ orderBy: { nome: "asc" } });
    return users.map(toUser);
  }

  async findByEmail(email: string) {
    const user = await prisma.usuario.findUnique({ where: { email: email.toLowerCase() } });
    return user ? toUser(user) : null;
  }

  async findByDocument(document: string) {
    const user = await prisma.usuario.findUnique({ where: { cpf: document } });
    return user ? toUser(user) : null;
  }

  async findById(id: string) {
    const user = await prisma.usuario.findUnique({ where: { id } });
    return user ? toUser(user) : null;
  }

  async create(input: CreateUserInput) {
    const user = await prisma.usuario.create({
      data: {
        nome: input.name,
        email: input.email.toLowerCase(),
        cpf: input.document ?? null,
        senha: await bcrypt.hash(input.password, 12),
        perfil: roleToProfile[input.role],
        status: statusToDatabase.ACTIVE,
      },
    });
    return toUser(user);
  }

  async updatePassword(id: string, password: string) {
    const result = await prisma.usuario.updateMany({
      where: { id },
      data: { senha: await bcrypt.hash(password, 12) },
    });
    return result.count ? this.findById(id) : null;
  }

  async updateProfile(id: string, input: Pick<CreateUserInput, "name" | "document">) {
    const result = await prisma.usuario.updateMany({
      where: { id },
      data: { nome: input.name, ...(input.document !== undefined && { cpf: input.document }) },
    });
    return result.count ? this.findById(id) : null;
  }

  async updateRole(id: string, role: UserRole) {
    const result = await prisma.usuario.updateMany({ where: { id }, data: { perfil: roleToProfile[role] } });
    return result.count ? this.findById(id) : null;
  }

  async updateStatus(id: string, status: UserStatus) {
    const result = await prisma.usuario.updateMany({ where: { id }, data: { status: statusToDatabase[status] } });
    return result.count ? this.findById(id) : null;
  }
}

export const userRepository: UserRepository = new PrismaUserRepository();

export async function seedInitialAdmin() {
  if (!env.ADMIN_NAME || !env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) return;
  if (await userRepository.findByEmail(env.ADMIN_EMAIL)) return;

  await userRepository.create({
    name: env.ADMIN_NAME,
    email: env.ADMIN_EMAIL,
    password: env.ADMIN_PASSWORD,
    role: "ADMIN",
  });
}
