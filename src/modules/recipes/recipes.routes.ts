import { Router } from "express";

import { authenticateUser } from "../../middlewares/auth.middleware.js";
import {
    createRecipeController,
    deleteRecipeController,
    getRecipeByIdController,
    listCookableRecipesController,
    listRecipesController,
    setRecipeLikeController,
    updateRecipeController,
} from "./recipes.controller.js";

const recipesRouter = Router();

/**
 * @openapi
 * /api/recipes:
 *   get:
 *     summary: List recipes
 *     description: Returns recipes with author summary, ingredients count and a like boolean for the authenticated user.
 *     tags:
 *       - Recipes
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recipes listed successfully
 *       401:
 *         description: Missing or invalid authentication
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
recipesRouter.get("/", authenticateUser, listRecipesController);

/**
 * @openapi
 * /api/recipes/cookable:
 *   get:
 *     summary: List cookable recipes
 *     description: "Returns two lists based on pantry ingredients: cookable (all ingredients available) and almostCookable (more than 75% available and at most 4 missing ingredients)."
 *     tags:
 *       - Recipes
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cookable recipes listed successfully
 *       401:
 *         description: Missing or invalid authentication
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
recipesRouter.get("/cookable", authenticateUser, listCookableRecipesController);

/**
 * @openapi
 * /api/recipes/{id}:
 *   get:
 *     summary: Get recipe by id
 *     description: Returns recipe detail including ingredient rows.
 *     tags:
 *       - Recipes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: Recipe id
 *     responses:
 *       200:
 *         description: Recipe returned successfully
 *       400:
 *         description: Invalid recipe id
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
 *         description: Recipe not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
recipesRouter.get("/:id", authenticateUser, getRecipeByIdController);

/**
 * @openapi
 * /api/recipes/{id}/like:
 *   post:
 *     summary: Set recipe like state
 *     description: Marks or unmarks a recipe as liked by the authenticated user. User id is extracted from the token and not accepted in request body.
 *     tags:
 *       - Recipes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: Recipe id
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
 *         description: Recipe like state updated
 *       400:
 *         description: Invalid recipe id or payload
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
 *         description: Recipe not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
recipesRouter.post("/:id/like", authenticateUser, setRecipeLikeController);

/**
 * @openapi
 * /api/recipes:
 *   post:
 *     summary: Create recipe
 *     description: Creates a recipe owned by the authenticated user.
 *     tags:
 *       - Recipes
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
 *                 example: Tortilla de patatas
 *               difficulty:
 *                 type: string
 *                 enum: [EASY, MEDIUM, HARD]
 *               prepTime:
 *                 type: integer
 *                 example: 30
 *               ingredients:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     ingredientId:
 *                       type: integer
 *                     quantity:
 *                       type: number
 *                       format: float
 *                       nullable: true
 *                     unit:
 *                       type: string
 *                       nullable: true
 *                   required: [ingredientId]
 *             required: [name, difficulty, prepTime, ingredients]
 *     responses:
 *       201:
 *         description: Recipe created successfully
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
 *         description: One or more ingredients not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
recipesRouter.post("/", authenticateUser, createRecipeController);

/**
 * @openapi
 * /api/recipes/{id}:
 *   patch:
 *     summary: Update recipe
 *     description: Updates a recipe that belongs to the authenticated user.
 *     tags:
 *       - Recipes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: Recipe id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               difficulty:
 *                 type: string
 *                 enum: [EASY, MEDIUM, HARD]
 *               prepTime:
 *                 type: integer
 *               ingredients:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     ingredientId:
 *                       type: integer
 *                     quantity:
 *                       type: number
 *                       format: float
 *                       nullable: true
 *                     unit:
 *                       type: string
 *                       nullable: true
 *                   required: [ingredientId]
 *     responses:
 *       200:
 *         description: Recipe updated successfully
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
 *       403:
 *         description: Authenticated user is not the recipe owner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Recipe or ingredients not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
recipesRouter.patch("/:id", authenticateUser, updateRecipeController);

/**
 * @openapi
 * /api/recipes/{id}:
 *   delete:
 *     summary: Delete recipe
 *     description: Deletes a recipe that belongs to the authenticated user.
 *     tags:
 *       - Recipes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: Recipe id
 *     responses:
 *       200:
 *         description: Recipe deleted successfully
 *       400:
 *         description: Invalid recipe id
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
 *       403:
 *         description: Authenticated user is not the recipe owner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Recipe not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
recipesRouter.delete("/:id", authenticateUser, deleteRecipeController);

export { recipesRouter };
