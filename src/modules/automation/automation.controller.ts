import type { Request, Response } from "express";

import { AutomationError, triggerRecipeWorkflow, triggerRecipeWorkflowBatch } from "./automation.service.js";

type TriggerWorkflowBody = {
	recipeId?: unknown;
	recipeName?: unknown;
};

type TriggerWorkflowBatchBody = {
	firstRecipeId?: unknown;
	totalRecipes?: unknown;
};

function sendError(res: Response, status: number, code: string, message: string, details?: unknown): Response {
	return res.status(status).json({
		ok: false,
		error: {
			code,
			message,
			details,
		},
	});
}

function parseRecipeId(value: unknown): number {
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed <= 0) {
		throw new AutomationError("VALIDATION_ERROR", 400, "recipeId must be a positive integer");
	}

	return parsed;
}

function parseRecipeName(value: unknown): string {
	if (typeof value !== "string" || value.trim().length === 0) {
		throw new AutomationError("VALIDATION_ERROR", 400, "recipeName must be a non-empty string");
	}

	return value.trim();
}

function parseTotalRecipes(value: unknown): number {
	if (value === undefined) {
		return 10;
	}

	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed <= 0) {
		throw new AutomationError("VALIDATION_ERROR", 400, "totalRecipes must be a positive integer");
	}

	return parsed;
}

function parseRecipe(body: TriggerWorkflowBody): { recipeId: number; recipeName: string } {
	if (!Object.prototype.hasOwnProperty.call(body, "recipeId")) {
		throw new AutomationError("VALIDATION_ERROR", 400, "recipeId is required");
	}

	if (!Object.prototype.hasOwnProperty.call(body, "recipeName")) {
		throw new AutomationError("VALIDATION_ERROR", 400, "recipeName is required");
	}

	return {
		recipeId: parseRecipeId(body.recipeId),
		recipeName: parseRecipeName(body.recipeName),
	};
}

function parseRecipeBatch(body: TriggerWorkflowBatchBody): { firstRecipeId: number; totalRecipes: number } {
	if (!Object.prototype.hasOwnProperty.call(body, "firstRecipeId")) {
		throw new AutomationError("VALIDATION_ERROR", 400, "firstRecipeId is required");
	}

	return {
		firstRecipeId: parseRecipeId(body.firstRecipeId),
		totalRecipes: parseTotalRecipes(body.totalRecipes),
	};
}

export async function triggerWorkflowTestController(req: Request, res: Response): Promise<Response> {
	try {
		const payload = parseRecipe(req.body as TriggerWorkflowBody);
		const result = await triggerRecipeWorkflow(payload);

		return res.status(200).json({
			ok: true,
			data: result,
		});
	} catch (error) {
		if (error instanceof AutomationError) {
			return sendError(res, error.status, error.code, error.message, error.details);
		}

		return sendError(res, 500, "INTERNAL_ERROR", "Unexpected error triggering automation workflow");
	}
}

export async function triggerWorkflowBatchController(req: Request, res: Response): Promise<Response> {
	try {
		const payload = parseRecipeBatch(req.body as TriggerWorkflowBatchBody);
		const result = await triggerRecipeWorkflowBatch(payload);

		return res.status(200).json({
			ok: true,
			data: result,
		});
	} catch (error) {
		if (error instanceof AutomationError) {
			return sendError(res, error.status, error.code, error.message, error.details);
		}

		return sendError(res, 500, "INTERNAL_ERROR", "Unexpected error triggering automation workflow batch");
	}
}
