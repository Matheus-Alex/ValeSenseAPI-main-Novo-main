import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3333),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  CORS_ORIGIN: z.string().min(1).default("http://localhost:5173,http://localhost:5500,http://127.0.0.1:5500"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET deve ter pelo menos 16 caracteres"),
  JWT_EXPIRES_IN: z.string().default("8h"),
  PASSWORD_RESET_EXPIRES_MINUTES: z.coerce.number().int().min(5).max(60).default(15),
  ADMIN_NAME: z.string().min(2).optional(),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Variáveis de ambiente inválidas:", parsed.error.flatten().fieldErrors);
  throw new Error("Configuração de ambiente inválida");
}

export const env = parsed.data;
