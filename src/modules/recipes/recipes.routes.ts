import { Router } from "express";

import { authenticateUser } from "../../middlewares/auth.middleware.js";
import {
    createRecipeController,
    deleteRecipeController,
    getRecipeByIdController,
    listCookableRecipesController,
    listRecipesController,
    listRecipesOverviewController,
    searchRecipesController,
    setRecipeLikeController,
    updateRecipeController,
} from "./recipes.controller.js";

const recipesRouter = Router();

/**
 * @openapi
 * /api/recipes:
 *   get:
 *     summary: List recipes with pagination
 *     description: Returns a paginated list of recipes (excluding cookable and almost-cookable ones) ordered by the highest pantry coverage percentage for each recipe, then by absolute available ingredients, recency and like status. Each recipe includes author summary, ingredients count, and individual ingredient availability (`inStock` and `inShoppingList`). Default is 30 recipes per page.
 *     tags:
 *       - Recipes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number (1-indexed).
 *       - name: pageSize
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 30
 *         description: Number of recipes per page.
 *     responses:
 *       200:
 *         description: Recipes listed successfully with pagination info
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
recipesRouter.get("/", authenticateUser, listRecipesController);

/**
 * @openapi
 * /api/recipes/overview:
 *   get:
 *     summary: Get recipes overview (unified endpoint)
 *     description: Returns cookable recipes, almost-cookable recipes, and a paginated list of regular recipes in a single request. This endpoint is optimized for loading a dashboard. Cookable recipes are those with 100% available ingredients. Almost-cookable have more than 75% available and max 4 missing. Regular recipes exclude both cookable categories and are ordered by the highest pantry coverage percentage, then by absolute available ingredients, recency and like status. Ingredient entries include both `inStock` and `inShoppingList`.
 *     tags:
 *       - Recipes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for regular recipes (1-indexed).
 *       - name: pageSize
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 30
 *         description: Number of regular recipes per page.
 *     responses:
 *       200:
 *         description: Recipes overview loaded successfully
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
recipesRouter.get("/overview", authenticateUser, listRecipesOverviewController);

/**
 * @openapi
 * /api/recipes/search:
 *   get:
 *     summary: Search recipes by name
 *     description: Predictive search for recipes by name. Results prioritize names that start with the query and include favorite status (`like`), total ingredient count, pantry ingredient count and shopping-list ingredient count for the authenticated user.
 *     tags:
 *       - Recipes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: query
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Text to search by recipe name.
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
 *         description: Predictive search results
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
recipesRouter.get("/search", authenticateUser, searchRecipesController);

/**
 * @openapi
 * /api/recipes/cookable:
 *   get:
 *     summary: List cookable recipes
 *     description: "Returns two lists based on pantry ingredients: cookable (all ingredients available) and almostCookable (more than 75% available and at most 4 missing ingredients). Each ingredient row includes inStock and inShoppingList booleans for the authenticated user."
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
 *     description: Returns recipe detail including liked boolean and ingredient rows with inStock and inShoppingList availability for the authenticated user.
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
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               like:
 *                 type: boolean
 *                 description: true to mark like, false to remove like.
 *             required: [like]
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
 *               detail:
 *                 type: string
 *                 nullable: true
 *                 example: Pelar las patatas, freirlas, batir los huevos y cuajar la tortilla.
 *               image:
 *                 type: string
 *                 nullable: true
 *                 example: https://cdn.example.com/recipes/tortilla.jpg
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
 *               detail:
 *                 type: string
 *                 nullable: true
 *               image:
 *                 type: string
 *                 nullable: true
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
