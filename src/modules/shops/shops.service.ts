import { prisma } from "../../lib/prisma.js";

export type ShopListItem = {
	id: number;
	name: string;
	like: boolean;
};

export class ShopError extends Error {
	constructor(
		public readonly code: string,
		public readonly status: number,
		message: string,
		public readonly details?: unknown
	) {
		super(message);
		this.name = "ShopError";
	}
}

export async function listShops(userId: number): Promise<ShopListItem[]> {
	const shops = await prisma.shop.findMany({
		orderBy: [
			{ favoritedBy: { _count: "desc" } },
			{ name: "asc" },
		],
		select: {
			id: true,
			name: true,
			favoritedBy: {
				where: { userId },
				select: { userId: true },
				take: 1,
			},
		},
	});

	return shops.map((shop) => ({
		id: shop.id,
		name: shop.name,
		like: shop.favoritedBy.length > 0,
	}));
}

export async function setShopLike(userId: number, shopId: number, liked: boolean): Promise<void> {
	const shop = await prisma.shop.findUnique({
		where: { id: shopId },
		select: { id: true },
	});

	if (!shop) {
		throw new ShopError("SHOP_NOT_FOUND", 404, "Shop not found", { shopId });
	}

	if (liked) {
		await prisma.userFavoriteShop.upsert({
			where: {
				userId_shopId: {
					userId,
					shopId,
				},
			},
			update: {},
			create: {
				userId,
				shopId,
			},
		});
		return;
	}

	await prisma.userFavoriteShop.deleteMany({
		where: {
			userId,
			shopId,
		},
	});
}
