import { prisma } from "../../lib/prisma.js";

export class IngredientError extends Error {
    constructor(
        public readonly code: string,
        public readonly status: number,
        message: string,
        public readonly details?: unknown
    ) {
        super(message);
        this.name = "IngredientError";
    }
}

export type CreateIngredientInput = {
    name: string;
    categoryId: number;
    restrictionIds?: number[];
};

type CreatedIngredient = {
    id: number;
    name: string;
    categoryId: number;
    restrictions: Array<{ id: number; name: string }>;
};

async function ensureCategoryExists(categoryId: number): Promise<void> {
    const category = await prisma.ingredientCategory.findUnique({
        where: { id: categoryId },
        select: { id: true },
    });

    if (!category) {
        throw new IngredientError("CATEGORY_NOT_FOUND", 404, "Ingredient category not found", { categoryId });
    }
}

async function ensureRestrictionsExist(restrictionIds: number[]): Promise<void> {
    if (restrictionIds.length === 0) {
        return;
    }

    const restrictions = await prisma.restriction.findMany({
        where: { id: { in: restrictionIds } },
        select: { id: true },
    });

    if (restrictions.length !== restrictionIds.length) {
        const found = new Set(restrictions.map((restriction) => restriction.id));
        const missing = restrictionIds.filter((id) => !found.has(id));
        throw new IngredientError("RESTRICTIONS_NOT_FOUND", 404, "Some restrictions were not found", {
            missingRestrictionIds: missing,
        });
    }
}

function normalizeRestrictionIds(restrictionIds?: number[]): number[] {
    if (!restrictionIds) {
        return [];
    }

    return Array.from(new Set(restrictionIds));
}

export async function createIngredient(input: CreateIngredientInput): Promise<CreatedIngredient> {
    const restrictionIds = normalizeRestrictionIds(input.restrictionIds);

    await ensureCategoryExists(input.categoryId);
    await ensureRestrictionsExist(restrictionIds);

    const created = await prisma.$transaction(async (tx) => {
        const ingredient = await tx.ingredient.create({
            data: {
                name: input.name,
                categoryId: input.categoryId,
            },
            select: {
                id: true,
                name: true,
                categoryId: true,
            },
        });

        if (restrictionIds.length > 0) {
            await tx.ingredientRestriction.createMany({
                data: restrictionIds.map((restrictionId) => ({
                    ingredientId: ingredient.id,
                    restrictionId,
                })),
            });
        }

        return tx.ingredient.findUnique({
            where: { id: ingredient.id },
            select: {
                id: true,
                name: true,
                categoryId: true,
                restrictions: {
                    select: {
                        restriction: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
            },
        });
    });

    if (!created) {
        throw new IngredientError("INGREDIENT_CREATE_FAILED", 500, "Ingredient could not be created");
    }

    return {
        id: created.id,
        name: created.name,
        categoryId: created.categoryId,
        restrictions: created.restrictions.map((row) => row.restriction),
    };
}

export async function createIngredientsBulk(inputs: CreateIngredientInput[]): Promise<CreatedIngredient[]> {
    const normalized = inputs.map((input) => ({
        ...input,
        restrictionIds: normalizeRestrictionIds(input.restrictionIds),
    }));

    const categoryIds = Array.from(new Set(normalized.map((input) => input.categoryId)));
    const allRestrictionIds = Array.from(
        new Set(normalized.flatMap((input) => input.restrictionIds ?? []))
    );

    const [categories, restrictions] = await Promise.all([
        prisma.ingredientCategory.findMany({
            where: { id: { in: categoryIds } },
            select: { id: true },
        }),
        prisma.restriction.findMany({
            where: { id: { in: allRestrictionIds } },
            select: { id: true },
        }),
    ]);

    const foundCategories = new Set(categories.map((category) => category.id));
    const missingCategoryIds = categoryIds.filter((id) => !foundCategories.has(id));
    if (missingCategoryIds.length > 0) {
        throw new IngredientError("CATEGORY_NOT_FOUND", 404, "Some categories were not found", {
            missingCategoryIds,
        });
    }

    const foundRestrictions = new Set(restrictions.map((restriction) => restriction.id));
    const missingRestrictionIds = allRestrictionIds.filter((id) => !foundRestrictions.has(id));
    if (missingRestrictionIds.length > 0) {
        throw new IngredientError("RESTRICTIONS_NOT_FOUND", 404, "Some restrictions were not found", {
            missingRestrictionIds,
        });
    }

    const created = await prisma.$transaction(async (tx) => {
        const createdRows: Array<{ id: number; name: string; categoryId: number; restrictionIds: number[] }> = [];

        for (const input of normalized) {
            const ingredient = await tx.ingredient.create({
                data: {
                    name: input.name,
                    categoryId: input.categoryId,
                },
                select: {
                    id: true,
                    name: true,
                    categoryId: true,
                },
            });

            const rowRestrictionIds = input.restrictionIds ?? [];
            if (rowRestrictionIds.length > 0) {
                await tx.ingredientRestriction.createMany({
                    data: rowRestrictionIds.map((restrictionId) => ({
                        ingredientId: ingredient.id,
                        restrictionId,
                    })),
                });
            }

            createdRows.push({ ...ingredient, restrictionIds: rowRestrictionIds });
        }

        const createdIds = createdRows.map((row) => row.id);
        const createdWithRelations = await tx.ingredient.findMany({
            where: { id: { in: createdIds } },
            select: {
                id: true,
                name: true,
                categoryId: true,
                restrictions: {
                    select: {
                        restriction: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
            },
        });

        const byId = new Map(createdWithRelations.map((ingredient) => [ingredient.id, ingredient]));

        return createdIds
            .map((id) => byId.get(id))
            .filter((row): row is NonNullable<typeof row> => Boolean(row))
            .map((ingredient) => ({
                id: ingredient.id,
                name: ingredient.name,
                categoryId: ingredient.categoryId,
                restrictions: ingredient.restrictions.map((row) => row.restriction),
            }));
    });

    return created;
}
