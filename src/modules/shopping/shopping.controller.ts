import type { Request, Response } from "express";

import {
    createShoppingItem,
    deleteShoppingItem,
    listShoppingItems,
    ShoppingItemError,
    updateShoppingItem,
    type CreateShoppingItemInput,
    type UpdateShoppingItemInput,
} from "./shopping.service.js";

type CreateShoppingItemBody = {
	ingredientId?: unknown;
	shopId?: unknown;
	quantity?: unknown;
	unit?: unknown;
	checked?: unknown;
	orderId?: unknown;
};

type UpdateShoppingItemBody = {
	ingredientId?: unknown;
	shopId?: unknown;
	quantity?: unknown;
	unit?: unknown;
	checked?: unknown;
	orderId?: unknown;
};

type ListShoppingItemsQuery = {
	state?: unknown;
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

function getAuthenticatedUserId(req: Request): number {
	if (!req.user) {
		throw new ShoppingItemError("UNAUTHORIZED", 401, "Authentication is required");
	}

	return req.user.id;
}

function parsePositiveInteger(value: unknown, fieldName: string): number {
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed <= 0) {
		throw new ShoppingItemError("VALIDATION_ERROR", 400, `${fieldName} must be a positive integer`);
	}

	return parsed;
}

function parseOptionalPositiveNumber(value: unknown, fieldName: string): number {
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		throw new ShoppingItemError("VALIDATION_ERROR", 400, `${fieldName} must be a positive number`);
	}

	return parsed;
}

function parseOptionalNullableString(value: unknown, fieldName: string): string | null {
	if (value === null) {
		return null;
	}

	if (typeof value !== "string") {
		throw new ShoppingItemError("VALIDATION_ERROR", 400, `${fieldName} must be a string or null`);
	}

	const normalized = value.trim();
	if (normalized.length === 0) {
		throw new ShoppingItemError("VALIDATION_ERROR", 400, `${fieldName} cannot be empty`);
	}

	return normalized;
}

function parseOptionalBoolean(value: unknown, fieldName: string): boolean {
	if (typeof value !== "boolean") {
		throw new ShoppingItemError("VALIDATION_ERROR", 400, `${fieldName} must be a boolean`);
	}

	return value;
}

function parseOptionalOrderId(value: unknown, fieldName: string): number | null {
	if (value === null) {
		return null;
	}

	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed <= 0) {
		throw new ShoppingItemError("VALIDATION_ERROR", 400, `${fieldName} must be a positive integer or null`);
	}

	return parsed;
}

function parseOptionalShopId(value: unknown, fieldName: string): number | null {
	if (value === null) {
		return null;
	}

	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed <= 0) {
		throw new ShoppingItemError("VALIDATION_ERROR", 400, `${fieldName} must be a positive integer or null`);
	}

	return parsed;
}

function parseShoppingItemId(value: unknown): number {
	if (typeof value !== "string") {
		throw new ShoppingItemError("VALIDATION_ERROR", 400, "id must be a positive integer");
	}

	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed <= 0) {
		throw new ShoppingItemError("VALIDATION_ERROR", 400, "id must be a positive integer");
	}

	return parsed;
}

function parseListState(query: ListShoppingItemsQuery): "pending" | "ordered" | "all" {
	if (typeof query.state === "undefined") {
		return "pending";
	}

	if (query.state === "pending" || query.state === "ordered" || query.state === "all") {
		return query.state;
	}

	throw new ShoppingItemError("VALIDATION_ERROR", 400, "state must be one of: pending, ordered, all");
}

function parseCreateInput(body: CreateShoppingItemBody): CreateShoppingItemInput {
	if (typeof body.ingredientId === "undefined") {
		throw new ShoppingItemError("VALIDATION_ERROR", 400, "ingredientId is required");
	}

	return {
		ingredientId: parsePositiveInteger(body.ingredientId, "ingredientId"),
		shopId: typeof body.shopId === "undefined" ? undefined : parseOptionalShopId(body.shopId, "shopId"),
		quantity: typeof body.quantity === "undefined" ? undefined : parseOptionalPositiveNumber(body.quantity, "quantity"),
		unit: typeof body.unit === "undefined" ? undefined : parseOptionalNullableString(body.unit, "unit"),
		checked: typeof body.checked === "undefined" ? undefined : parseOptionalBoolean(body.checked, "checked"),
		orderId: typeof body.orderId === "undefined" ? undefined : parseOptionalOrderId(body.orderId, "orderId"),
	};
}

function parseUpdateInput(body: UpdateShoppingItemBody): UpdateShoppingItemInput {
	if (Object.keys(body).length === 0) {
		throw new ShoppingItemError("VALIDATION_ERROR", 400, "At least one field must be provided to update");
	}

	const input: UpdateShoppingItemInput = {};

	if (Object.prototype.hasOwnProperty.call(body, "ingredientId")) {
		input.ingredientId = parsePositiveInteger(body.ingredientId, "ingredientId");
	}

	if (Object.prototype.hasOwnProperty.call(body, "shopId")) {
		input.shopId = parseOptionalShopId(body.shopId, "shopId");
	}

	if (Object.prototype.hasOwnProperty.call(body, "quantity")) {
		input.quantity = body.quantity === null ? null : parseOptionalPositiveNumber(body.quantity, "quantity");
	}

	if (Object.prototype.hasOwnProperty.call(body, "unit")) {
		input.unit = parseOptionalNullableString(body.unit, "unit");
	}

	if (Object.prototype.hasOwnProperty.call(body, "checked")) {
		input.checked = parseOptionalBoolean(body.checked, "checked");
	}

	if (Object.prototype.hasOwnProperty.call(body, "orderId")) {
		input.orderId = parseOptionalOrderId(body.orderId, "orderId");
	}

	return input;
}

export async function listShoppingItemsController(req: Request, res: Response): Promise<Response> {
	try {
		const userId = getAuthenticatedUserId(req);
		const state = parseListState(req.query as ListShoppingItemsQuery);
		const items = await listShoppingItems(userId, state);

		return res.status(200).json({
			ok: true,
			data: items,
		});
	} catch (error) {
		if (error instanceof ShoppingItemError) {
			return sendError(res, error.status, error.code, error.message, error.details);
		}

		return sendError(res, 500, "INTERNAL_ERROR", "Unexpected error listing shopping items");
	}
}

export async function createShoppingItemController(req: Request, res: Response): Promise<Response> {
	try {
		const userId = getAuthenticatedUserId(req);
		const input = parseCreateInput(req.body as CreateShoppingItemBody);
		const created = await createShoppingItem(userId, input);

		return res.status(201).json({
			ok: true,
			data: created,
		});
	} catch (error) {
		if (error instanceof ShoppingItemError) {
			return sendError(res, error.status, error.code, error.message, error.details);
		}

		return sendError(res, 500, "INTERNAL_ERROR", "Unexpected error creating shopping item");
	}
}

export async function updateShoppingItemController(req: Request, res: Response): Promise<Response> {
	try {
		const userId = getAuthenticatedUserId(req);
		const shoppingItemId = parseShoppingItemId(req.params.id);
		const input = parseUpdateInput(req.body as UpdateShoppingItemBody);
		const updated = await updateShoppingItem(userId, shoppingItemId, input);

		return res.status(200).json({
			ok: true,
			data: updated,
		});
	} catch (error) {
		if (error instanceof ShoppingItemError) {
			return sendError(res, error.status, error.code, error.message, error.details);
		}

		return sendError(res, 500, "INTERNAL_ERROR", "Unexpected error updating shopping item");
	}
}

export async function deleteShoppingItemController(req: Request, res: Response): Promise<Response> {
	try {
		const userId = getAuthenticatedUserId(req);
		const shoppingItemId = parseShoppingItemId(req.params.id);
		await deleteShoppingItem(userId, shoppingItemId);

		return res.status(200).json({
			ok: true,
			data: {
				deleted: true,
			},
		});
	} catch (error) {
		if (error instanceof ShoppingItemError) {
			return sendError(res, error.status, error.code, error.message, error.details);
		}

		return sendError(res, 500, "INTERNAL_ERROR", "Unexpected error deleting shopping item");
	}
}
