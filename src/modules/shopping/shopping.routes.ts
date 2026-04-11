import { Router } from "express";

import { authenticateUser } from "../../middlewares/auth.middleware.js";
import {
    createShoppingItemController,
    deleteShoppingItemController,
    listShoppingItemsController,
    updateShoppingItemController,
} from "./shopping.controller.js";

const shoppingRouter = Router();

/**
 * @openapi
 * /api/shopping-items:
 *   get:
 *     summary: List shopping items
 *     description: Returns shopping items for the authenticated user. By default returns pending items only.
 *     tags:
 *       - ShoppingItems
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: state
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           enum: [pending, ordered, all]
 *           default: pending
 *         description: Filters items by whether they are still pending or already linked to an order.
 *     responses:
 *       200:
 *         description: Shopping items listed successfully
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
shoppingRouter.get("/", authenticateUser, listShoppingItemsController);

/**
 * @openapi
 * /api/shopping-items:
 *   post:
 *     summary: Create shopping item
 *     description: Creates a shopping item for the authenticated user.
 *     tags:
 *       - ShoppingItems
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
 *                 example: 3
 *               shopId:
 *                 type: integer
 *                 nullable: true
 *                 example: 2
 *               quantity:
 *                 type: number
 *                 format: float
 *                 nullable: true
 *                 example: 2
 *               unit:
 *                 type: string
 *                 nullable: true
 *                 example: L
 *               checked:
 *                 type: boolean
 *                 default: false
 *               orderId:
 *                 type: integer
 *                 nullable: true
 *                 example: 10
 *             required: [ingredientId]
 *     responses:
 *       201:
 *         description: Shopping item created successfully
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
 *         description: Ingredient, shop or order not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
shoppingRouter.post("/", authenticateUser, createShoppingItemController);

/**
 * @openapi
 * /api/shopping-items/{id}:
 *   patch:
 *     summary: Update shopping item
 *     description: Updates a shopping item that belongs to the authenticated user.
 *     tags:
 *       - ShoppingItems
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: Shopping item id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ingredientId:
 *                 type: integer
 *               shopId:
 *                 type: integer
 *                 nullable: true
 *               quantity:
 *                 type: number
 *                 format: float
 *                 nullable: true
 *               unit:
 *                 type: string
 *                 nullable: true
 *               checked:
 *                 type: boolean
 *               orderId:
 *                 type: integer
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Shopping item updated successfully
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
 *         description: Shopping item, ingredient, shop or order not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
shoppingRouter.patch("/:id", authenticateUser, updateShoppingItemController);

/**
 * @openapi
 * /api/shopping-items/{id}:
 *   delete:
 *     summary: Delete shopping item
 *     description: Deletes a shopping item that belongs to the authenticated user.
 *     tags:
 *       - ShoppingItems
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: Shopping item id
 *     responses:
 *       200:
 *         description: Shopping item deleted successfully
 *       401:
 *         description: Missing or invalid authentication
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Shopping item not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
shoppingRouter.delete("/:id", authenticateUser, deleteShoppingItemController);

export { shoppingRouter };
