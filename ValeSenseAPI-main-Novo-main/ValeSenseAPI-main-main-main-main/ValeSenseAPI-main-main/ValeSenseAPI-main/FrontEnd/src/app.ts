import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { errorHandler } from "./middlewares/error-handler.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { forecastsRouter } from "./modules/forecasts/forecasts.routes.js";
import { marketDataRouter } from "./modules/market-data/market-data.routes.js";
import { sensorsRouter } from "./modules/sensors/sensors.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";
import { weatherDataRouter } from "./modules/weather-data/weather-data.routes.js";
import { prisma } from "./lib/prisma.js";

export const app = express();
const allowedOrigins = new Set(env.CORS_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean));
app.use(cors({
  origin(origin, callback) {
    callback(null, !origin || allowedOrigins.has(origin));
  },
}));
app.use(express.json());

app.get("/health", async (_request, response) => {
  try {
    await prisma.$runCommandRaw({ ping: 1 });
    return response.status(200).json({ status: "ok", database: "connected" });
  } catch (error) {
    console.error("Banco de dados indisponível durante a verificação de saúde:", error);
    return response.status(503).json({ status: "error", database: "unavailable" });
  }
});
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/forecasts", forecastsRouter);
app.use("/api/market-data", marketDataRouter);
app.use("/api/sensors", sensorsRouter);
app.use("/api/weather-data", weatherDataRouter);
app.use(errorHandler);
