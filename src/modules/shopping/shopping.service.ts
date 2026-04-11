import { prisma } from "../../lib/prisma.js";

export class ShoppingItemError extends Error {
	constructor(
		public readonly code: string,
		public readonly status: number,
		message: string,
		public readonly details?: unknown
	) {
		super(message);
		this.name = "ShoppingItemError";
	}
}

export type CreateShoppingItemInput = {
	ingredientId: number;
	shopId?: number | null;
	quantity?: number | null;
	unit?: string | null;
	checked?: boolean;
	orderId?: number | null;
};

export type UpdateShoppingItemInput = {
	ingredientId?: number;
	shopId?: number | null;
	quantity?: number | null;
	unit?: string | null;
	checked?: boolean;
	orderId?: number | null;
};

export type ShoppingItemResult = {
	id: number;
	userId: number;
	ingredientId: number;
	shopId: number | null;
	orderId: number | null;
	ingredient: { id: number; name: string; category: { id: number; name: string; icon: string } };
	shop: { id: number; name: string } | null;
	quantity: number | null;
	unit: string | null;
	checked: boolean;
	createdAt: Date;
	updatedAt: Date;
};

const SHOPPING_ITEM_SELECT = {
	id: true,
	userId: true,
	ingredientId: true,
	shopId: true,
	orderId: true,
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
	quantity: true,
	unit: true,
	checked: true,
	createdAt: true,
	updatedAt: true,
} as const;

async function ensureOrderBelongsToUser(orderId: number | null | undefined, userId: number): Promise<void> {
	if (typeof orderId !== "number") {
		return;
	}

	const order = await prisma.order.findFirst({
		where: {
			id: orderId,
			userId,
		},
		select: { id: true },
	});

	if (!order) {
		throw new ShoppingItemError("ORDER_NOT_FOUND", 404, "Order not found for authenticated user", {
			orderId,
		});
	}
}

async function ensureIngredientExists(ingredientId: number): Promise<void> {
	const ingredient = await prisma.ingredient.findUnique({
		where: { id: ingredientId },
		select: { id: true },
	});

	if (!ingredient) {
		throw new ShoppingItemError("INGREDIENT_NOT_FOUND", 404, "Ingredient not found", {
			ingredientId,
		});
	}
}

async function ensureShopExists(shopId: number | null | undefined): Promise<void> {
	if (typeof shopId !== "number") {
		return;
	}

	const shop = await prisma.shop.findUnique({
		where: { id: shopId },
		select: { id: true },
	});

	if (!shop) {
		throw new ShoppingItemError("SHOP_NOT_FOUND", 404, "Shop not found", {
			shopId,
		});
	}
}

export async function listShoppingItems(
	userId: number,
	state: "pending" | "ordered" | "all"
): Promise<ShoppingItemResult[]> {
	const where =
		state === "pending"
			? { userId, orderId: null }
			: state === "ordered"
			  ? { userId, orderId: { not: null as null | number } }
			  : { userId };

	return prisma.shoppingItem.findMany({
		where,
		orderBy: [
			{ checked: "asc" },
			{ createdAt: "desc" },
		],
		select: SHOPPING_ITEM_SELECT,
	});
}

export async function createShoppingItem(userId: number, input: CreateShoppingItemInput): Promise<ShoppingItemResult> {
	await ensureIngredientExists(input.ingredientId);
	await ensureShopExists(input.shopId);
	await ensureOrderBelongsToUser(input.orderId, userId);

	return prisma.shoppingItem.create({
		data: {
			userId,
			ingredientId: input.ingredientId,
			shopId: input.shopId ?? null,
			orderId: input.orderId ?? null,
			quantity: input.quantity ?? null,
			unit: input.unit ?? null,
			checked: input.checked ?? false,
		},
		select: SHOPPING_ITEM_SELECT,
	});
}

export async function updateShoppingItem(
	userId: number,
	shoppingItemId: number,
	input: UpdateShoppingItemInput
): Promise<ShoppingItemResult> {
	const existing = await prisma.shoppingItem.findFirst({
		where: {
			id: shoppingItemId,
			userId,
		},
		select: { id: true },
	});

	if (!existing) {
		throw new ShoppingItemError("SHOPPING_ITEM_NOT_FOUND", 404, "Shopping item not found", {
			shoppingItemId,
		});
	}

	if (Object.prototype.hasOwnProperty.call(input, "ingredientId")) {
		await ensureIngredientExists(input.ingredientId!);
	}

	if (Object.prototype.hasOwnProperty.call(input, "shopId")) {
		await ensureShopExists(input.shopId);
	}

	if (Object.prototype.hasOwnProperty.call(input, "orderId")) {
		await ensureOrderBelongsToUser(input.orderId, userId);
	}

	return prisma.shoppingItem.update({
		where: { id: shoppingItemId },
		data: {
			ingredientId: input.ingredientId,
			shopId: Object.prototype.hasOwnProperty.call(input, "shopId") ? (input.shopId ?? null) : undefined,
			quantity: Object.prototype.hasOwnProperty.call(input, "quantity") ? (input.quantity ?? null) : undefined,
			unit: Object.prototype.hasOwnProperty.call(input, "unit") ? (input.unit ?? null) : undefined,
			checked: input.checked,
			orderId: Object.prototype.hasOwnProperty.call(input, "orderId") ? (input.orderId ?? null) : undefined,
		},
		select: SHOPPING_ITEM_SELECT,
	});
}

export async function deleteShoppingItem(userId: number, shoppingItemId: number): Promise<void> {
	const result = await prisma.shoppingItem.deleteMany({
		where: {
			id: shoppingItemId,
			userId,
		},
	});

	if (result.count === 0) {
		throw new ShoppingItemError("SHOPPING_ITEM_NOT_FOUND", 404, "Shopping item not found", {
			shoppingItemId,
		});
	}
}
