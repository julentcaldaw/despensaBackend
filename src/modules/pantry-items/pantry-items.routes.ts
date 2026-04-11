import { Router } from "express";

import { authenticateUser } from "../../middlewares/auth.middleware.js";
import {
    createPantryItemController,
    deletePantryItemController,
    listPantryItemsController,
    updatePantryItemController,
} from "./pantry-items.controller.js";

const pantryItemsRouter = Router();

/**
 * @openapi
 * /api/pantry-items:
 *   get:
 *     summary: List pantry items
 *     description: Returns pantry items that belong to the authenticated user.
 *     tags:
 *       - PantryItems
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pantry items listed successfully
 *       401:
 *         description: Missing or invalid authentication
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
pantryItemsRouter.get("/", authenticateUser, listPantryItemsController);

/**
 * @openapi
 * /api/pantry-items:
 *   post:
 *     summary: Create pantry item
 *     description: Creates a pantry item for the authenticated user.
 *     tags:
 *       - PantryItems
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ingredientId:
 *                 type: integer
 *                 example: 1
 *               acquiredAt:
 *                 type: string
 *                 format: date-time
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               quantity:
 *                 type: number
 *                 format: float
 *                 nullable: true
 *                 default: 1
 *                 example: 2
 *               unit:
 *                 $ref: '#/components/schemas/Unit'
 *                 nullable: true
 *                 default: UNIT
 *               conservation:
 *                 $ref: '#/components/schemas/Conservation'
 *               shopId:
 *                 type: integer
 *                 nullable: true
 *                 example: 3
 *             required: [ingredientId]
 *     responses:
 *       201:
 *         description: Pantry item created successfully
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
 *         description: Related ingredient or shop not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       422:
 *         description: Invalid acquiredAt and expiresAt range
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
pantryItemsRouter.post("/", authenticateUser, createPantryItemController);

/**
 * @openapi
 * /api/pantry-items/{id}:
 *   patch:
 *     summary: Update pantry item
 *     description: Updates a pantry item that belongs to the authenticated user.
 *     tags:
 *       - PantryItems
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: Pantry item id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ingredientId:
 *                 type: integer
 *               acquiredAt:
 *                 type: string
 *                 format: date-time
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               quantity:
 *                 type: number
 *                 format: float
 *                 nullable: true
 *                 default: 1
 *               unit:
 *                 $ref: '#/components/schemas/Unit'
 *                 nullable: true
 *                 default: UNIT
 *               conservation:
 *                 $ref: '#/components/schemas/Conservation'
 *               shopId:
 *                 type: integer
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Pantry item updated successfully
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
 *         description: Pantry item, ingredient or shop not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       422:
 *         description: Invalid acquiredAt and expiresAt range
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
pantryItemsRouter.patch("/:id", authenticateUser, updatePantryItemController);

/**
 * @openapi
 * /api/pantry-items/{id}:
 *   delete:
 *     summary: Delete pantry item
 *     description: Deletes a pantry item that belongs to the authenticated user.
 *     tags:
 *       - PantryItems
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: Pantry item id
 *     responses:
 *       200:
 *         description: Pantry item deleted successfully
 *       401:
 *         description: Missing or invalid authentication
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Pantry item not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
pantryItemsRouter.delete("/:id", authenticateUser, deletePantryItemController);

export { pantryItemsRouter };
