import { Router } from "express";
import { authenticateUser, authorizeRoles } from "../../middlewares/auth.middleware.js";

import {
    createIngredientController,
    createIngredientsBulkController,
    searchIngredientsController,
    searchIngredientsSimilarityController,
} from "./ingredients.controller.js";

const ingredientsRouter = Router();

/**
 * @openapi
 * /api/ingredients/search:
 *   get:
 *     summary: Search ingredients
 *     description: Predictive search for ingredients by text query.
 *     tags:
 *       - Ingredients
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: query
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Text to search by ingredient name.
 *       - name: limit
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 6
 *         description: Maximum number of results.
 *     responses:
 *       200:
 *         description: Search results
 *       400:
 *         description: Invalid query parameters
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
 */
ingredientsRouter.get("/search", authenticateUser, searchIngredientsController);

/**
 * @openapi
 * /api/ingredients/search/similarity:
 *   post:
 *     summary: Search ingredients by similarity
 *     description: First tries exact barcode match; if not found, performs a two-layer search with full-text candidate filtering and trigram similarity ranking.
 *     tags:
 *       - Ingredients
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Tomate triturado
 *               barcode:
 *                 type: string
 *                 example: "8412345678901"
 *             required: [name, barcode]
 *     responses:
 *       200:
 *         description: Similarity search results
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
 */
ingredientsRouter.post("/search/similarity", authenticateUser, searchIngredientsSimilarityController);

/**
 * @openapi
 * /api/ingredients:
 *   post:
 *     summary: Create ingredient
 *     description: Creates a new ingredient and optionally attaches dietary restrictions.
 *     tags:
 *       - Ingredients
 *     security:
 *       - bearerAuth: []
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
 *       403:
 *         description: Forbidden for current user role
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
ingredientsRouter.post("/", authenticateUser, authorizeRoles("CONTRIBUTOR", "ADMIN"), createIngredientController);

/**
 * @openapi
 * /api/ingredients/bulk:
 *   post:
 *     summary: Create ingredients in bulk
 *     description: Creates multiple ingredients in one request using a single transaction.
 *     tags:
 *       - Ingredients
 *     security:
 *       - bearerAuth: []
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
 *       403:
 *         description: Forbidden for current user role
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
ingredientsRouter.post(
    "/bulk",
    authenticateUser,
    authorizeRoles("CONTRIBUTOR", "ADMIN"),
    createIngredientsBulkController
);

export { ingredientsRouter };
