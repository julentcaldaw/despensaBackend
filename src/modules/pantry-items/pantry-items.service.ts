import type { Conservation, Unit } from "@prisma/client";

import { prisma } from "../../lib/prisma.js";

export class PantryItemError extends Error {
    constructor(
        public readonly code: string,
        public readonly status: number,
        message: string,
        public readonly details?: unknown
    ) {
        super(message);
        this.name = "PantryItemError";
    }
}

export type CreatePantryItemInput = {
    ingredientId: number;
    acquiredAt?: Date;
    expiresAt?: Date | null;
    quantity?: number | null;
    unit?: Unit | null;
    conservation?: Conservation;
    shopId?: number | null;
};

export type UpdatePantryItemInput = {
    ingredientId?: number;
    acquiredAt?: Date;
    expiresAt?: Date | null;
    quantity?: number | null;
    unit?: Unit | null;
    conservation?: Conservation;
    shopId?: number | null;
};

export type PantryItemResult = {
    id: number;
    userId: number;
    acquiredAt: Date;
    expiresAt: Date | null;
    quantity: number | null;
    unit: Unit | null;
    conservation: Conservation;
    createdAt: Date;
    updatedAt: Date;
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
};

const PANTRY_ITEM_SELECT = {
    id: true,
    userId: true,
    acquiredAt: true,
    expiresAt: true,
    quantity: true,
    unit: true,
    conservation: true,
    createdAt: true,
    updatedAt: true,
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
} as const;

function ensureExpiryOrder(acquiredAt: Date, expiresAt: Date | null | undefined): void {
    if (!expiresAt) {
        return;
    }

    if (expiresAt.getTime() < acquiredAt.getTime()) {
        throw new PantryItemError(
            "INVALID_DATE_RANGE",
            422,
            "expiresAt must be greater than or equal to acquiredAt"
        );
    }
}

async function ensureIngredientExists(ingredientId: number): Promise<void> {
    const ingredient = await prisma.ingredient.findUnique({
        where: { id: ingredientId },
        select: { id: true },
    });

    if (!ingredient) {
        throw new PantryItemError("INGREDIENT_NOT_FOUND", 404, "Ingredient not found", { ingredientId });
    }
}

async function ensureShopExists(shopId: number | null | undefined): Promise<void> {
    if (shopId === null || typeof shopId === "undefined") {
        return;
    }

    const shop = await prisma.shop.findUnique({
        where: { id: shopId },
        select: { id: true },
    });

    if (!shop) {
        throw new PantryItemError("SHOP_NOT_FOUND", 404, "Shop not found", { shopId });
    }
}

export async function listPantryItems(userId: number): Promise<PantryItemResult[]> {
    return prisma.pantryItem.findMany({
        where: { userId },
        orderBy: [
            { expiresAt: "asc" },
            { createdAt: "desc" },
        ],
        select: PANTRY_ITEM_SELECT,
    });
}

export async function createPantryItem(userId: number, input: CreatePantryItemInput): Promise<PantryItemResult> {
    const acquiredAt = input.acquiredAt ?? new Date();
    const quantity = input.quantity ?? 1;
    const unit = input.unit ?? "UNIT";
    ensureExpiryOrder(acquiredAt, input.expiresAt);

    await Promise.all([
        ensureIngredientExists(input.ingredientId),
        ensureShopExists(input.shopId),
    ]);

    return prisma.pantryItem.create({
        data: {
            userId,
            ingredientId: input.ingredientId,
            acquiredAt,
            expiresAt: input.expiresAt ?? null,
            quantity,
            unit,
            conservation: input.conservation,
            shopId: input.shopId ?? null,
        },
        select: PANTRY_ITEM_SELECT,
    });
}

export async function updatePantryItem(
    userId: number,
    pantryItemId: number,
    input: UpdatePantryItemInput
): Promise<PantryItemResult> {
    const existing = await prisma.pantryItem.findFirst({
        where: {
            id: pantryItemId,
            userId,
        },
        select: {
            id: true,
            acquiredAt: true,
            expiresAt: true,
        },
    });

    if (!existing) {
        throw new PantryItemError("PANTRY_ITEM_NOT_FOUND", 404, "Pantry item not found", {
            pantryItemId,
        });
    }

    const nextAcquiredAt = input.acquiredAt ?? existing.acquiredAt;
    const nextExpiresAt = Object.prototype.hasOwnProperty.call(input, "expiresAt")
        ? input.expiresAt
        : existing.expiresAt;

    ensureExpiryOrder(nextAcquiredAt, nextExpiresAt);

    await Promise.all([
        typeof input.ingredientId === "number" ? ensureIngredientExists(input.ingredientId) : Promise.resolve(),
        Object.prototype.hasOwnProperty.call(input, "shopId") ? ensureShopExists(input.shopId) : Promise.resolve(),
    ]);

    return prisma.pantryItem.update({
        where: { id: pantryItemId },
        data: {
            ingredientId: input.ingredientId,
            acquiredAt: input.acquiredAt,
            expiresAt: Object.prototype.hasOwnProperty.call(input, "expiresAt") ? input.expiresAt : undefined,
            quantity: Object.prototype.hasOwnProperty.call(input, "quantity") ? (input.quantity ?? null) : undefined,
            unit: Object.prototype.hasOwnProperty.call(input, "unit") ? (input.unit ?? null) : undefined,
            conservation: input.conservation,
            shopId: Object.prototype.hasOwnProperty.call(input, "shopId") ? (input.shopId ?? null) : undefined,
        },
        select: PANTRY_ITEM_SELECT,
    });
}

export async function deletePantryItem(userId: number, pantryItemId: number): Promise<void> {
    const result = await prisma.pantryItem.deleteMany({
        where: {
            id: pantryItemId,
            userId,
        },
    });

    if (result.count === 0) {
        throw new PantryItemError("PANTRY_ITEM_NOT_FOUND", 404, "Pantry item not found", {
            pantryItemId,
        });
    }
}
