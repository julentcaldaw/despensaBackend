import type { Difficulty } from "@prisma/client";
import type { Request, Response } from "express";

import {
    createRecipe,
    deleteRecipe,
    getRecipeById,
    listCookableRecipes,
    listRecipes,
    RecipeError,
    setRecipeLike,
    updateRecipe,
    type CreateRecipeInput,
    type RecipeIngredientInput,
    type UpdateRecipeInput,
} from "./recipes.service.js";

type CreateRecipeBody = {
	name?: unknown;
	detail?: unknown;
	image?: unknown;
	difficulty?: unknown;
	prepTime?: unknown;
	ingredients?: unknown;
};

type UpdateRecipeBody = {
	name?: unknown;
	detail?: unknown;
	image?: unknown;
	difficulty?: unknown;
	prepTime?: unknown;
	ingredients?: unknown;
};

const VALID_DIFFICULTY_VALUES: Difficulty[] = ["EASY", "MEDIUM", "HARD"];

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

function getAuthenticatedUserId(req: Request): number {
	if (!req.user) {
		throw new RecipeError("UNAUTHORIZED", 401, "Authentication is required");
	}

	return req.user.id;
}

function parseRecipeId(value: unknown): number {
	if (typeof value !== "string") {
		throw new RecipeError("VALIDATION_ERROR", 400, "id must be a positive integer");
	}

	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed <= 0) {
		throw new RecipeError("VALIDATION_ERROR", 400, "id must be a positive integer");
	}

	return parsed;
}

type SetRecipeLikeBody = {
	like?: unknown;
	userId?: unknown;
};

function parseLikeValue(body: SetRecipeLikeBody): boolean {
	if (Object.prototype.hasOwnProperty.call(body, "userId")) {
		throw new RecipeError("VALIDATION_ERROR", 400, "userId must not be sent in request body");
	}

	if (typeof body.like === "undefined") {
		throw new RecipeError("VALIDATION_ERROR", 400, "like is required and must be a boolean");
	}

	if (typeof body.like !== "boolean") {
		throw new RecipeError("VALIDATION_ERROR", 400, "like must be a boolean");
	}

	return body.like;
}

function parseName(value: unknown, fieldName: string): string {
	if (typeof value !== "string" || value.trim().length === 0) {
		throw new RecipeError("VALIDATION_ERROR", 400, `${fieldName} must be a non-empty string`);
	}

	return value.trim();
}

function parseDetail(value: unknown, fieldName: string): string | null {
	if (value === null || typeof value === "undefined") {
		return null;
	}

	if (typeof value !== "string") {
		throw new RecipeError("VALIDATION_ERROR", 400, `${fieldName} must be a string or null`);
	}

	const normalized = value.trim();
	if (normalized.length === 0) {
		throw new RecipeError("VALIDATION_ERROR", 400, `${fieldName} cannot be empty`);
	}

	return normalized;
}

function parseImage(value: unknown, fieldName: string): string | null {
	if (value === null || typeof value === "undefined") {
		return null;
	}

	if (typeof value !== "string") {
		throw new RecipeError("VALIDATION_ERROR", 400, `${fieldName} must be a string or null`);
	}

	const normalized = value.trim();
	if (normalized.length === 0) {
		throw new RecipeError("VALIDATION_ERROR", 400, `${fieldName} cannot be empty`);
	}

	return normalized;
}

function parseDifficulty(value: unknown, fieldName: string): Difficulty {
	if (typeof value !== "string" || !VALID_DIFFICULTY_VALUES.includes(value as Difficulty)) {
		throw new RecipeError(
			"VALIDATION_ERROR",
			400,
			`${fieldName} must be one of: ${VALID_DIFFICULTY_VALUES.join(", ")}`
		);
	}

	return value as Difficulty;
}

function parsePositiveInteger(value: unknown, fieldName: string): number {
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed <= 0) {
		throw new RecipeError("VALIDATION_ERROR", 400, `${fieldName} must be a positive integer`);
	}

	return parsed;
}

function parseOptionalPositiveNumber(value: unknown, fieldName: string): number {
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		throw new RecipeError("VALIDATION_ERROR", 400, `${fieldName} must be a positive number`);
	}

	return parsed;
}

function parseIngredientUnit(value: unknown, fieldName: string): string | null {
	if (value === null) {
		return null;
	}

	if (typeof value !== "string") {
		throw new RecipeError("VALIDATION_ERROR", 400, `${fieldName} must be a string or null`);
	}

	const normalized = value.trim();
	if (normalized.length === 0) {
		throw new RecipeError("VALIDATION_ERROR", 400, `${fieldName} cannot be empty`);
	}

	return normalized;
}

function parseIngredients(value: unknown, fieldName: string): RecipeIngredientInput[] {
	if (!Array.isArray(value) || value.length === 0) {
		throw new RecipeError("VALIDATION_ERROR", 400, `${fieldName} must be a non-empty array`);
	}

	return value.map((item, index) => {
		if (!item || typeof item !== "object" || Array.isArray(item)) {
			throw new RecipeError("VALIDATION_ERROR", 400, `${fieldName}[${index}] must be an object`);
		}

		const row = item as Record<string, unknown>;
		return {
			ingredientId: parsePositiveInteger(row.ingredientId, `${fieldName}[${index}].ingredientId`),
			quantity:
				typeof row.quantity === "undefined"
					? undefined
					: row.quantity === null
						? null
						: parseOptionalPositiveNumber(row.quantity, `${fieldName}[${index}].quantity`),
			unit:
				typeof row.unit === "undefined" ? undefined : parseIngredientUnit(row.unit, `${fieldName}[${index}].unit`),
		};
	});
}

function parseCreateInput(body: CreateRecipeBody): CreateRecipeInput {
	return {
		name: parseName(body.name, "name"),
		detail: parseDetail(body.detail, "detail"),
		image: parseImage(body.image, "image"),
		difficulty: parseDifficulty(body.difficulty, "difficulty"),
		prepTime: parsePositiveInteger(body.prepTime, "prepTime"),
		ingredients: parseIngredients(body.ingredients, "ingredients"),
	};
}

function parseUpdateInput(body: UpdateRecipeBody): UpdateRecipeInput {
	if (Object.keys(body).length === 0) {
		throw new RecipeError("VALIDATION_ERROR", 400, "At least one field must be provided to update");
	}

	const input: UpdateRecipeInput = {};

	if (Object.prototype.hasOwnProperty.call(body, "name")) {
		input.name = parseName(body.name, "name");
	}

	if (Object.prototype.hasOwnProperty.call(body, "detail")) {
		input.detail = parseDetail(body.detail, "detail");
	}

	if (Object.prototype.hasOwnProperty.call(body, "image")) {
		input.image = parseImage(body.image, "image");
	}

	if (Object.prototype.hasOwnProperty.call(body, "difficulty")) {
		input.difficulty = parseDifficulty(body.difficulty, "difficulty");
	}

	if (Object.prototype.hasOwnProperty.call(body, "prepTime")) {
		input.prepTime = parsePositiveInteger(body.prepTime, "prepTime");
	}

	if (Object.prototype.hasOwnProperty.call(body, "ingredients")) {
		input.ingredients = parseIngredients(body.ingredients, "ingredients");
	}

	return input;
}

export async function listRecipesController(_req: Request, res: Response): Promise<Response> {
	try {
		const userId = getAuthenticatedUserId(_req);
		const recipes = await listRecipes(userId);

		return res.status(200).json({
			ok: true,
			data: {
				items: recipes,
				count: recipes.length,
			},
		});
	} catch (error) {
		if (error instanceof RecipeError) {
			return sendError(res, error.status, error.code, error.message, error.details);
		}

		return sendError(res, 500, "INTERNAL_ERROR", "Unexpected error listing recipes");
	}
}

export async function listCookableRecipesController(req: Request, res: Response): Promise<Response> {
	try {
		const userId = getAuthenticatedUserId(req);
		const recipes = await listCookableRecipes(userId);

		return res.status(200).json({
			ok: true,
			data: {
				cookable: {
					items: recipes.cookable,
					count: recipes.cookable.length,
				},
				almostCookable: {
					items: recipes.almostCookable,
					count: recipes.almostCookable.length,
				},
			},
		});
	} catch (error) {
		if (error instanceof RecipeError) {
			return sendError(res, error.status, error.code, error.message, error.details);
		}

		return sendError(res, 500, "INTERNAL_ERROR", "Unexpected error listing cookable recipes");
	}
}

export async function getRecipeByIdController(req: Request, res: Response): Promise<Response> {
	try {
		const userId = getAuthenticatedUserId(req);
		const recipeId = parseRecipeId(req.params.id);
		const recipe = await getRecipeById(recipeId, userId);

		return res.status(200).json({
			ok: true,
			data: recipe,
		});
	} catch (error) {
		if (error instanceof RecipeError) {
			return sendError(res, error.status, error.code, error.message, error.details);
		}

		return sendError(res, 500, "INTERNAL_ERROR", "Unexpected error getting recipe");
	}
}

export async function setRecipeLikeController(req: Request, res: Response): Promise<Response> {
	try {
		const userId = getAuthenticatedUserId(req);
		const recipeId = parseRecipeId(req.params.id);
		const liked = parseLikeValue(req.body as SetRecipeLikeBody);
		await setRecipeLike(userId, recipeId, liked);

		return res.status(200).json({
			ok: true,
			data: {
				liked,
				recipeId,
			},
		});
	} catch (error) {
		if (error instanceof RecipeError) {
			return sendError(res, error.status, error.code, error.message, error.details);
		}

		return sendError(res, 500, "INTERNAL_ERROR", "Unexpected error updating recipe like");
	}
}

export async function createRecipeController(req: Request, res: Response): Promise<Response> {
	try {
		const userId = getAuthenticatedUserId(req);
		const input = parseCreateInput(req.body as CreateRecipeBody);
		const created = await createRecipe(userId, input);

		return res.status(201).json({
			ok: true,
			data: created,
		});
	} catch (error) {
		if (error instanceof RecipeError) {
			return sendError(res, error.status, error.code, error.message, error.details);
		}

		return sendError(res, 500, "INTERNAL_ERROR", "Unexpected error creating recipe");
	}
}

export async function updateRecipeController(req: Request, res: Response): Promise<Response> {
	try {
		const userId = getAuthenticatedUserId(req);
		const recipeId = parseRecipeId(req.params.id);
		const input = parseUpdateInput(req.body as UpdateRecipeBody);
		const updated = await updateRecipe(userId, recipeId, input);

		return res.status(200).json({
			ok: true,
			data: updated,
		});
	} catch (error) {
		if (error instanceof RecipeError) {
			return sendError(res, error.status, error.code, error.message, error.details);
		}

		return sendError(res, 500, "INTERNAL_ERROR", "Unexpected error updating recipe");
	}
}

export async function deleteRecipeController(req: Request, res: Response): Promise<Response> {
	try {
		const userId = getAuthenticatedUserId(req);
		const recipeId = parseRecipeId(req.params.id);
		await deleteRecipe(userId, recipeId);

		return res.status(200).json({
			ok: true,
			data: {
				deleted: true,
			},
		});
	} catch (error) {
		if (error instanceof RecipeError) {
			return sendError(res, error.status, error.code, error.message, error.details);
		}

		return sendError(res, 500, "INTERNAL_ERROR", "Unexpected error deleting recipe");
	}
}
