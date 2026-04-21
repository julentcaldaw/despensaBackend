/**
 * @openapi
 * /api/orders:
 *   get:
 *     summary: Lista los pedidos del usuario autenticado
 *     description: Devuelve todos los pedidos realizados por el usuario autenticado, incluyendo los ítems asociados.
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de pedidos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Order'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
import { prisma as prismaSingleton } from "../../lib/prisma.js";
export async function listOrdersController(req: Request, res: Response) {
	try {
		const userId = req.user?.id;
		if (!userId) {
			return res.status(401).json({ ok: false, error: { code: "UNAUTHORIZED", message: "No autenticado" } });
		}
		const prisma = req.app?.locals?.prisma ?? prismaSingleton;
		const orders = await prisma.order.findMany({
			where: { userId },
			orderBy: { createdAt: "desc" },
			select: {
				id: true,
				userId: true,
				shopId: true,
				date: true,
				price: true,
				ticket: true,
				createdAt: true,
				updatedAt: true,
				user: {
					select: { id: true, email: true, username: true, avatar: true },
				},
				shop: { select: { id: true, name: true } },
				shoppingItems: {
					orderBy: { createdAt: "desc" },
					select: {
						id: true,
						ingredientId: true,
						shopId: true,
						orderId: true,
						quantity: true,
						unit: true,
						checked: true,
						ingredient: {
							select: {
								id: true,
								name: true,
								category: { select: { id: true, name: true, icon: true } },
							},
						},
						shop: { select: { id: true, name: true } },
					},
				},
			},
		});
		return res.json({ ok: true, data: orders });
	} catch (err) {
		return res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Error interno del servidor" } });
	}
}
import type { Request, Response } from "express";
import { createOrder, OrderError, type CreateOrderInput } from "./orders.service.js";

type CreateOrderBody = {
	shopId?: unknown;
	price?: unknown;
	date?: unknown;
	ticket?: unknown;
	shopItems?: unknown;
	userId?: unknown;
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
		throw new OrderError("UNAUTHORIZED", 401, "Authentication is required");
	}

	return req.user.id;
}

function parsePositiveInteger(value: unknown, fieldName: string): number {
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed <= 0) {
		throw new OrderError("VALIDATION_ERROR", 400, `${fieldName} must be a positive integer`);
	}

	return parsed;
}

function parsePositiveNumber(value: unknown, fieldName: string): number {
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		throw new OrderError("VALIDATION_ERROR", 400, `${fieldName} must be a positive number`);
	}

	return parsed;
}

function parseOptionalDate(value: unknown): Date | undefined {
	if (typeof value === "undefined") {
		return undefined;
	}

	if (typeof value !== "string") {
		throw new OrderError("VALIDATION_ERROR", 400, "date must be an ISO datetime string");
	}

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		throw new OrderError("VALIDATION_ERROR", 400, "date must be a valid ISO datetime string");
	}

	return date;
}

function parseOptionalTicket(value: unknown): string | null | undefined {
	if (typeof value === "undefined") {
		return undefined;
	}

	if (value === null) {
		return null;
	}

	if (typeof value !== "string") {
		throw new OrderError("VALIDATION_ERROR", 400, "ticket must be a string or null");
	}

	const normalized = value.trim();
	if (normalized.length === 0) {
		throw new OrderError("VALIDATION_ERROR", 400, "ticket cannot be empty");
	}

	return normalized;
}

function parseShopItems(value: unknown): number[] {
	if (typeof value === "string") {
		const normalized = value.trim();
		if (normalized.length === 0) {
			throw new OrderError("VALIDATION_ERROR", 400, "shopItems must contain at least one item");
		}

		if (normalized.startsWith("[")) {
			try {
				const parsed = JSON.parse(normalized) as unknown;
				if (!Array.isArray(parsed)) {
					throw new Error("shopItems is not array");
				}

				return parsed.map((item) => parsePositiveInteger(item, "shopItems[]"));
			} catch {
				throw new OrderError(
					"VALIDATION_ERROR",
					400,
					"shopItems string must be a valid JSON array of ids"
				);
			}
		}

		return normalized.split(",").map((item) => parsePositiveInteger(item.trim(), "shopItems[]"));
	}

	if (!Array.isArray(value)) {
		throw new OrderError("VALIDATION_ERROR", 400, "shopItems must be an array of shopping item ids");
	}

	if (value.length === 0) {
		throw new OrderError("VALIDATION_ERROR", 400, "shopItems must contain at least one item");
	}

	return value.map((item) => parsePositiveInteger(item, "shopItems[]"));
}

function parseCreateOrderInput(body: CreateOrderBody): CreateOrderInput {
	if (Object.prototype.hasOwnProperty.call(body, "userId")) {
		throw new OrderError("VALIDATION_ERROR", 400, "userId must not be sent in request body");
	}

	if (typeof body.shopId === "undefined") {
		throw new OrderError("VALIDATION_ERROR", 400, "shopId is required");
	}

	if (typeof body.price === "undefined") {
		throw new OrderError("VALIDATION_ERROR", 400, "price is required");
	}

	if (typeof body.shopItems === "undefined") {
		throw new OrderError("VALIDATION_ERROR", 400, "shopItems is required");
	}

	return {
		shopId: parsePositiveInteger(body.shopId, "shopId"),
		price: parsePositiveNumber(body.price, "price"),
		shopItems: parseShopItems(body.shopItems),
		date: parseOptionalDate(body.date),
		ticket: parseOptionalTicket(body.ticket),
	};
}

export async function createOrderController(req: Request, res: Response): Promise<Response> {
	try {
		const userId = getAuthenticatedUserId(req);
		const input = parseCreateOrderInput(req.body as CreateOrderBody);

		if (req.file) {
			input.imageFile = {
				buffer: req.file.buffer,
				mimetype: req.file.mimetype,
			};
		}

		const created = await createOrder(userId, input);

		return res.status(201).json({
			ok: true,
			data: created,
		});
	} catch (error) {
		if (error instanceof OrderError) {
			return sendError(res, error.status, error.code, error.message, error.details);
		}

		return sendError(res, 500, "INTERNAL_ERROR", "Unexpected error creating order");
	}
}
