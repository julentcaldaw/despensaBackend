import type { Request, Response } from "express";

import { listShops, setShopLike, ShopError } from "./shops.service.js";

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

export async function listShopsController(req: Request, res: Response): Promise<Response> {
	try {
		if (!req.user) {
			return sendError(res, 401, "UNAUTHORIZED", "Authentication is required");
		}

		const shops = await listShops(req.user.id);

		return res.status(200).json({
			ok: true,
			data: {
				items: shops,
				count: shops.length,
			},
		});
	} catch (error) {
		if (error instanceof ShopError) {
			return sendError(res, error.status, error.code, error.message, error.details);
		}

		return sendError(res, 500, "INTERNAL_ERROR", "Unexpected error listing shops");
	}
}

function parseShopId(value: unknown): number {
	if (typeof value !== "string") {
		throw new ShopError("VALIDATION_ERROR", 400, "shop id must be a positive integer");
	}

	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed <= 0) {
		throw new ShopError("VALIDATION_ERROR", 400, "shop id must be a positive integer");
	}

	return parsed;
}

type SetShopLikeBody = {
	like?: unknown;
	userId?: unknown;
};

function parseLikeValue(body: SetShopLikeBody): boolean {
	if (Object.prototype.hasOwnProperty.call(body, "userId")) {
		throw new ShopError("VALIDATION_ERROR", 400, "userId must not be sent in request body");
	}

	if (typeof body.like === "undefined") {
		return true;
	}

	if (typeof body.like !== "boolean") {
		throw new ShopError("VALIDATION_ERROR", 400, "like must be a boolean");
	}

	return body.like;
}

export async function markShopLikeController(req: Request, res: Response): Promise<Response> {
	try {
		if (!req.user) {
			return sendError(res, 401, "UNAUTHORIZED", "Authentication is required");
		}

		const shopId = parseShopId(req.params.id);
		const liked = parseLikeValue(req.body as SetShopLikeBody);
		await setShopLike(req.user.id, shopId, liked);

		return res.status(200).json({
			ok: true,
			data: {
				liked,
				shopId,
			},
		});
	} catch (error) {
		if (error instanceof ShopError) {
			return sendError(res, error.status, error.code, error.message, error.details);
		}

		return sendError(res, 500, "INTERNAL_ERROR", "Unexpected error updating shop like");
	}
}
