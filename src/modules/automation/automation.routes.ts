import { Router } from "express";

import { authenticateUser } from "../../middlewares/auth.middleware.js";
import { triggerWorkflowBatchController, triggerWorkflowTestController } from "./automation.controller.js";

const automationRouter = Router();

/**
 * @openapi
 * /api/automation/test-workflow:
 *   post:
 *     summary: Trigger n8n workflow test webhook
 *     description: Sends a POST request to the configured n8n webhook with the recipe payload for testing purposes.
 *     tags:
 *       - Automation
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               recipeId:
 *                 type: integer
 *                 example: 12
 *               recipeName:
 *                 type: string
 *                 example: Tortilla de patatas
 *             required: [recipeId, recipeName]
 *             additionalProperties: false
 *     responses:
 *       200:
 *         description: Workflow webhook triggered successfully
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
 *       502:
 *         description: n8n service unavailable
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       504:
 *         description: n8n timeout
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
automationRouter.post("/test-workflow", authenticateUser, triggerWorkflowTestController);

/**
 * @openapi
 * /api/automation/test-workflow/batch:
 *   post:
 *     summary: Trigger n8n workflow in controlled batch
 *     description: Triggers recipe workflow calls sequentially with 10 seconds delay between each call.
 *     tags:
 *       - Automation
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstRecipeId:
 *                 type: integer
 *                 example: 1
 *               totalRecipes:
 *                 type: integer
 *                 default: 10
 *                 example: 10
 *             required: [firstRecipeId]
 *             additionalProperties: false
 *     responses:
 *       200:
 *         description: Batch workflow process finished successfully
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
 *         description: One or more recipes not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       502:
 *         description: n8n service unavailable
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       504:
 *         description: n8n timeout
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
automationRouter.post("/test-workflow/batch", authenticateUser, triggerWorkflowBatchController);

export { automationRouter };
