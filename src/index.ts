import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import swaggerUi from "swagger-ui-express";

import { swaggerSpec } from "./docs/swagger.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { automationRouter } from "./modules/automation/automation.routes.js";
import { ingredientsRouter } from "./modules/ingredients/ingredients.routes.js";
import { pantryItemsRouter } from "./modules/pantry-items/pantry-items.routes.js";
import { recipesRouter } from "./modules/recipes/recipes.routes.js";
import { shoppingRouter } from "./modules/shopping/shopping.routes.js";
import { shopsRouter } from "./modules/shops/shops.routes.js";

dotenv.config();

const app = express();

const port = Number(process.env.PORT ?? 3000);
const corsOrigin = process.env.CORS_ORIGIN ?? "";

app.use(
    cors({
        origin: corsOrigin,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true
    })
);
app.use(express.json());

// Swagger documentation
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check
 *     description: Returns basic status and timestamp for API health monitoring.
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: Service available
 */
app.get("/health", (_req, res) => {
    res.status(200).json({
        ok: true,
        data: {
            status: "up",
            timestamp: new Date().toISOString(),
        },
    });
});

app.use("/api/auth", authRouter);
app.use("/api/automation", automationRouter);
app.use("/api/ingredients", ingredientsRouter);
app.use("/api/pantry-items", pantryItemsRouter);
app.use("/api/recipes", recipesRouter);
app.use("/api/shopping-items", shoppingRouter);
app.use("/api/shops", shopsRouter);


app.listen(port, () => {
    console.log(`API running on http://localhost:${port}`);
});
