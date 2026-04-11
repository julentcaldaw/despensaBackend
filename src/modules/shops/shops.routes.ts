import { Router } from "express";

import { authenticateUser } from "../../middlewares/auth.middleware.js";
import { listShopsController, markShopLikeController } from "./shops.controller.js";

const shopsRouter = Router();

/**
 * @openapi
 * /api/shops:
 *   get:
 *     summary: List available shops
 *     description: Returns the available shops ordered by likes (desc) and then by name (asc), including a like boolean for the authenticated user.
 *     tags:
 *       - Shops
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Shops listed successfully
 *       401:
 *         description: Missing or invalid authentication
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
shopsRouter.get("/", authenticateUser, listShopsController);

/**
 * @openapi
 * /api/shops/{id}/like:
 *   post:
 *     summary: Set shop like state
 *     description: Marks or unmarks a shop as liked by the authenticated user. The user id is always extracted from the access token, never from the request body. Idempotent operation.
 *     tags:
 *       - Shops
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: Shop id
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               like:
 *                 type: boolean
 *                 default: true
 *                 description: true to mark like, false to remove like.
 *             additionalProperties: false
 *     responses:
 *       200:
 *         description: Shop like state updated
 *       400:
 *         description: Invalid shop id
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
 *         description: Shop not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
shopsRouter.post("/:id/like", authenticateUser, markShopLikeController);

export { shopsRouter };
