import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import swaggerUi from "swagger-ui-express";

import { swaggerSpec } from "./docs/swagger.js";

dotenv.config();

const app = express();

const port = Number(process.env.PORT ?? 3000);
const corsOrigin = process.env.CORS_ORIGIN ?? "*";

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check
 *     description: Verifica el estado del servicio
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: Servicio operacional
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 service:
 *                   type: string
 *                   example: despensa-api
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2026-04-05T10:30:00.000Z"
 */
app.use(cors({ origin: corsOrigin }));
app.use(express.json());

// Swagger documentation
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/health", (_req, res) => {
    res.status(200).json({
        ok: true,
        service: "despensa-api",
        timestamp: new Date().toISOString(),
    });
});

app.listen(port, () => {
    console.log(`API running on http://localhost:${port}`);
});
