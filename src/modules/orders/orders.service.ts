import type { Unit } from "@prisma/client";

import { prisma } from "../../lib/prisma.js";

export class OrderError extends Error {
	constructor(
		public readonly code: string,
		public readonly status: number,
		message: string,
		public readonly details?: unknown
	) {
		super(message);
		this.name = "OrderError";
	}
}

export type CreateOrderInput = {
	shopId: number;
	price: number;
	shopItems: number[];
	date?: Date;
	ticket?: string | null;
	imageFile?: {
		buffer: Buffer;
		mimetype: string;
	};
};

export type OrderResult = {
	id: number;
	userId: number;
	shopId: number;
	date: Date;
	price: number;
	ticket: string | null;
	createdAt: Date;
	updatedAt: Date;
	user: {
		id: number;
		email: string;
		username: string;
		avatar: string | null;
	};
	shop: {
		id: number;
		name: string;
	};
	shoppingItems: Array<{
		id: number;
		ingredientId: number;
		shopId: number | null;
		orderId: number | null;
		quantity: number | null;
		unit: string | null;
		checked: boolean;
		ingredient: {
			id: number;
			name: string;
			category: {
				id: number;
				name: string;
				icon: string;
			};
		};
		shop: {
			id: number;
			name: string;
		} | null;
	}>;
};

const ORDER_SELECT = {
	id: true,
	userId: true,
	shopId: true,
	date: true,
	price: true,
	ticket: true,
	createdAt: true,
	updatedAt: true,
	user: {
		select: {
			id: true,
			email: true,
			username: true,
			avatar: true,
		},
	},
	shop: {
		select: {
			id: true,
			name: true,
		},
	},
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
					category: {
						select: {
							id: true,
							name: true,
							icon: true,
						},
					},
				},
			},
			shop: {
				select: {
					id: true,
					name: true,
				},
			},
		},
	},
} as const;

async function ensureShopExists(shopId: number): Promise<void> {
	const shop = await prisma.shop.findUnique({
		where: { id: shopId },
		select: { id: true },
	});

	if (!shop) {
		throw new OrderError("SHOP_NOT_FOUND", 404, "Shop not found", { shopId });
	}
}

async function ensureShoppingItemsAssignable(userId: number, shoppingItemIds: number[]): Promise<number[]> {
	const uniqueIds = Array.from(new Set(shoppingItemIds));

	if (uniqueIds.length === 0) {
		throw new OrderError("VALIDATION_ERROR", 400, "shopItems must contain at least one item");
	}

	if (uniqueIds.length !== shoppingItemIds.length) {
		throw new OrderError("VALIDATION_ERROR", 400, "shopItems cannot contain duplicate ids");
	}

	const rows = await prisma.shoppingItem.findMany({
		where: {
			id: { in: uniqueIds },
			userId,
		},
		select: {
			id: true,
			orderId: true,
		},
	});

	if (rows.length !== uniqueIds.length) {
		const found = new Set(rows.map((row) => row.id));
		const missingIds = uniqueIds.filter((id) => !found.has(id));
		throw new OrderError("SHOPPING_ITEM_NOT_FOUND", 404, "One or more shopping items were not found", {
			missingShoppingItemIds: missingIds,
		});
	}

	const alreadyOrderedIds = rows.filter((row) => row.orderId !== null).map((row) => row.id);
	if (alreadyOrderedIds.length > 0) {
		throw new OrderError(
			"SHOPPING_ITEM_ALREADY_ORDERED",
			409,
			"One or more shopping items are already linked to an order",
			{ shoppingItemIds: alreadyOrderedIds }
		);
	}

	return uniqueIds;
}

const VALID_PANTRY_UNITS = new Set<string>([
	"G",
	"KG",
	"ML",
	"L",
	"UNIT",
	"PACK",
	"CAN",
	"BOTTLE",
	"JAR",
	"BOX",
	"BAG",
	"TBSP",
	"TSP",
	"SLICE",
	"CLOVE",
]);

function normalizePantryUnit(value: string | null): Unit | undefined {
	if (value === null) {
		return undefined;
	}

	const normalized = value.trim().toUpperCase();
	if (VALID_PANTRY_UNITS.has(normalized)) {
		return normalized as Unit;
	}

	return undefined;
}

function getSupabaseStorageConfig(): { url: string; key: string } {
	const rawUrl = process.env.SUPABASE_URL;
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!rawUrl || rawUrl.trim().length === 0) {
		throw new OrderError("SUPABASE_CONFIG_ERROR", 500, "SUPABASE_URL is not configured");
	}

	if (!key || key.trim().length === 0) {
		throw new OrderError("SUPABASE_CONFIG_ERROR", 500, "SUPABASE_SERVICE_ROLE_KEY is not configured");
	}

	return {
		url: rawUrl.replace(/\/+$/, ""),
		key,
	};
}

async function uploadOrderTicketImage(
	orderId: number,
	imageFile: { buffer: Buffer; mimetype: string }
): Promise<string> {
	if (!imageFile.mimetype.startsWith("image/")) {
		throw new OrderError("VALIDATION_ERROR", 400, "image must be a valid image mime type");
	}

	const { url, key } = getSupabaseStorageConfig();
	const objectName = String(orderId);
	const uploadUrl = `${url}/storage/v1/object/tickets/${objectName}`;

	const response = await fetch(uploadUrl, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${key}`,
			apikey: key,
			"Content-Type": imageFile.mimetype,
			"x-upsert": "true",
		},
		body: imageFile.buffer,
	});

	if (!response.ok) {
		const details = await response.text();
		throw new OrderError("ORDER_TICKET_UPLOAD_FAILED", 502, "Failed to upload order ticket image", {
			status: response.status,
			details,
		});
	}

	return `${url}/storage/v1/object/public/tickets/${objectName}`;
}

export async function createOrder(userId: number, input: CreateOrderInput): Promise<OrderResult> {
	await ensureShopExists(input.shopId);
	const shoppingItemIds = await ensureShoppingItemsAssignable(userId, input.shopItems);
	const orderDate = input.date ?? new Date();

	const created = await prisma.$transaction(async (tx) => {
		const createdOrder = await tx.order.create({
			data: {
				userId,
				shopId: input.shopId,
				price: input.price,
				date: orderDate,
				ticket: input.ticket ?? null,
			},
			select: { id: true },
		});

		const updatedItems = await tx.shoppingItem.updateMany({
			where: {
				id: { in: shoppingItemIds },
				userId,
				orderId: null,
			},
			data: {
				orderId: createdOrder.id,
				shopId: input.shopId,
				checked: true,
			},
		});

		if (updatedItems.count !== shoppingItemIds.length) {
			throw new OrderError(
				"SHOPPING_ITEM_CONFLICT",
				409,
				"Some shopping items changed during order creation"
			);
		}

		const orderedShoppingItems = await tx.shoppingItem.findMany({
			where: {
				id: { in: shoppingItemIds },
				userId,
				orderId: createdOrder.id,
			},
			select: {
				ingredientId: true,
				quantity: true,
				unit: true,
			},
		});

		if (orderedShoppingItems.length !== shoppingItemIds.length) {
			throw new OrderError(
				"SHOPPING_ITEM_CONFLICT",
				409,
				"Some shopping items changed during order creation"
			);
		}

		await tx.pantryItem.createMany({
			data: orderedShoppingItems.map((item) => ({
				userId,
				ingredientId: item.ingredientId,
				shopId: input.shopId,
				acquiredAt: orderDate,
				quantity: item.quantity ?? 1,
				unit: normalizePantryUnit(item.unit),
			})),
		});

		if (input.imageFile) {
			const ticketUrl = await uploadOrderTicketImage(createdOrder.id, input.imageFile);
			await tx.order.update({
				where: { id: createdOrder.id },
				data: { ticket: ticketUrl },
				select: { id: true },
			});
		}

		return tx.order.findUniqueOrThrow({
			where: { id: createdOrder.id },
			select: ORDER_SELECT,
		});
	});

	return created;
}
