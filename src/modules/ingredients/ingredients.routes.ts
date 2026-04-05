import { Router } from "express";

import {
    createIngredientController,
    createIngredientsBulkController,
} from "./ingredients.controller.js";

const ingredientsRouter = Router();

/**
 * @openapi
 * /api/ingredients:
 *   post:
 *     summary: Create ingredient
 *     description: Creates a new ingredient and optionally attaches dietary restrictions.
 *     tags:
 *       - Ingredients
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Tomato
 *               categoryId:
 *                 type: integer
 *                 example: 1
 *               restrictionIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [1, 2]
 *             required: [name, categoryId]
 *     responses:
 *       201:
 *         description: Ingredient created successfully
 *       400:
 *         description: Invalid request payload
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Category or restrictions not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
ingredientsRouter.post("/", createIngredientController);

/**
 * @openapi
 * /api/ingredients/bulk:
 *   post:
 *     summary: Create ingredients in bulk
 *     description: Creates multiple ingredients in one request using a single transaction.
 *     tags:
 *       - Ingredients
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     categoryId:
 *                       type: integer
 *                     restrictionIds:
 *                       type: array
 *                       items:
 *                         type: integer
 *                   required: [name, categoryId]
 *             required: [items]
 *     responses:
 *       201:
 *         description: Ingredients created successfully
 *       400:
 *         description: Invalid request payload
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Category or restrictions not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
ingredientsRouter.post("/bulk", createIngredientsBulkController);

export { ingredientsRouter };
