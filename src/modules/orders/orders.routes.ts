import { Router } from "express";
import multer from "multer";

import { authenticateUser } from "../../middlewares/auth.middleware.js";
import { createOrderController } from "./orders.controller.js";

const ordersRouter = Router();
const upload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: 10 * 1024 * 1024,
	},
});

/**
 * @openapi
 * /api/orders:
 *   post:
 *     summary: Create order
 *     description: Creates an order for the authenticated user with shop, price and selected shopping items. Linked shopping items are marked as ordered and automatically added to pantry items for the same user. Accepts optional image in multipart/form-data; if provided, it is uploaded to Supabase bucket `tickets` using the created order id as object name.
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
	 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               shopId:
 *                 type: integer
 *                 example: 2
 *               price:
 *                 type: number
 *                 format: float
 *                 example: 24.5
 *               date:
 *                 type: string
 *                 format: date-time
 *                 example: 2026-04-13T10:30:00.000Z
 *               ticket:
 *                 type: string
 *                 nullable: true
 *                 example: https://example.com/ticket.jpg
 *               shopItems:
 *                 type: string
 *                 description: Shopping item ids as JSON array string (e.g. [11,12,13]) or comma-separated values (e.g. 11,12,13)
 *                 example: "[11,12,13]"
 *               image:
 *                 type: string
 *                 format: binary
 *             required: [shopId, price, shopItems]
 *     responses:
 *       201:
 *         description: Order created successfully
 *       400:
 *         description: Invalid request payload
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Missing or invalid authentication
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Shop or shopping items not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: One or more shopping items are already ordered or changed during operation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       502:
 *         description: Failed to upload image to Supabase storage
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

import { listOrdersController } from "./orders.controller.js";

// GET /api/orders
ordersRouter.get("/", authenticateUser, listOrdersController);

ordersRouter.post("/", authenticateUser, upload.single("image"), createOrderController);

export { ordersRouter };

