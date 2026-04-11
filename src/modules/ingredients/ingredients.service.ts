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

export type IngredientSearchResult = {
    id: number;
    name: string;
    category: {
        id: number;
        name: string;
        icon: string;
    };
};

export type IngredientSimilarityResult = {
    id: number;
    name: string;
    category: {
        id: number;
        name: string;
        icon: string;
    };
    tsScore: number;
    trgmScore: number;
    finalScore: number;
    source: "barcode" | "similarity";
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

function toSimpleName(value: string): string {
    return value
        .trim()
        .replaceAll(/\b(?:de|del|para|por|a|en|y|e|o|la|las|el|los|un|una|unos|unas|al)\b/gi, "")
        .replaceAll(/\s+/g, " ")
        .trim();
}

function toUnaccentLowerText(value: string): string {
    return value.normalize("NFD").replaceAll(/[\u0300-\u036f]/g, "").toLowerCase();
}

function normalizeSearchName(value: string): string {
    const simpleName = toSimpleName(value);
    const baseName = simpleName.length > 0 ? simpleName : value;

    return toUnaccentLowerText(baseName).replaceAll(/\s+/g, " ").trim();
}

export async function createIngredient(input: CreateIngredientInput): Promise<CreatedIngredient> {
    const restrictionIds = normalizeRestrictionIds(input.restrictionIds);

    await ensureCategoryExists(input.categoryId);
    await ensureRestrictionsExist(restrictionIds);

    const created = await prisma.$transaction(async (tx) => {
        const simpleName = toSimpleName(input.name);
        const baseName = simpleName.length > 0 ? simpleName : input.name;
        const [searchValues] = await tx.$queryRaw<Array<{ normalized_name: string; tsv_name: string }>>`
            SELECT
                lower(unaccent(${baseName})) AS normalized_name,
                to_tsvector('simple', lower(unaccent(${baseName})))::text AS tsv_name
        `;

        const ingredient = await tx.ingredient.create({
            data: {
                name: input.name,
                categoryId: input.categoryId,
                normalizedName: searchValues.normalized_name,
                tsvName: searchValues.tsv_name,
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
            const simpleName = toSimpleName(input.name);
            const baseName = simpleName.length > 0 ? simpleName : input.name;
            const [searchValues] = await tx.$queryRaw<Array<{ normalized_name: string; tsv_name: string }>>`
                SELECT
                    lower(unaccent(${baseName})) AS normalized_name,
                    to_tsvector('simple', lower(unaccent(${baseName})))::text AS tsv_name
            `;

            const ingredient = await tx.ingredient.create({
                data: {
                    name: input.name,
                    categoryId: input.categoryId,
                    normalizedName: searchValues.normalized_name,
                    tsvName: searchValues.tsv_name,
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

export async function searchIngredientsByText(query: string, limit: number): Promise<IngredientSearchResult[]> {
    const trimmed = query.trim();

    if (trimmed.length === 0) {
        return [];
    }

    const rows = await prisma.$queryRaw<
        Array<{ id: number; name: string; category_id: number; category_name: string; category_icon: string }>
    >`
        SELECT
            i.id,
            i.name,
            ic.id   AS category_id,
            ic.name AS category_name,
            ic.icon AS category_icon
        FROM ingredients i
        JOIN ingredient_categories ic ON ic.id = i."categoryId"
        WHERE i."normalizedName" ILIKE '%' || lower(unaccent(${trimmed})) || '%'
        ORDER BY i.name ASC
        LIMIT ${limit}
    `;

    return rows.map((row) => ({
        id: row.id,
        name: row.name,
        category: {
            id: row.category_id,
            name: row.category_name,
            icon: row.category_icon,
        },
    }));
}

export async function searchIngredientsBySimilarity(
    name: string,
    barcode: string
): Promise<IngredientSimilarityResult[]> {
    const MAX_RESULTS = 6;
    const normalizedBarcode = barcode.trim();

    if (normalizedBarcode.length > 0) {
        const byBarcode = await prisma.barcode.findUnique({
            where: { value: normalizedBarcode },
            select: {
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
            },
        });

        if (byBarcode?.ingredient) {
            return [
                {
                    id: byBarcode.ingredient.id,
                    name: byBarcode.ingredient.name,
                    category: byBarcode.ingredient.category,
                    tsScore: 1,
                    trgmScore: 1,
                    finalScore: 1,
                    source: "barcode",
                },
            ];
        }
    }

    const normalizedName = normalizeSearchName(name);

    if (normalizedName.length === 0) {
        return [];
    }

    let rows: Array<{
        id: number;
        name: string;
        category_id: number;
        category_name: string;
        category_icon: string;
        ts_score: number;
        trgm_score: number;
        final_score: number;
    }>;

    try {
        rows = await prisma.$queryRaw<
            Array<{
                id: number;
                name: string;
                category_id: number;
                category_name: string;
                category_icon: string;
                ts_score: number;
                trgm_score: number;
                final_score: number;
            }>
        >`
            WITH search_input AS (
                SELECT
                    ${normalizedName}::text AS q_name,
                    plainto_tsquery('simple', ${normalizedName}) AS q_tsquery
            ),
            candidates AS (
                SELECT
                    i.id,
                    i.name,
                    i."normalizedName" AS normalized_name,
                    ic.id AS category_id,
                    ic.name AS category_name,
                    ic.icon AS category_icon,
                    ts_rank(COALESCE(i."tsvName", '')::tsvector, s.q_tsquery) AS ts_score
                FROM ingredients i
                JOIN ingredient_categories ic ON ic.id = i."categoryId"
                CROSS JOIN search_input s
                WHERE COALESCE(i."tsvName", '')::tsvector @@ s.q_tsquery
                ORDER BY ts_score DESC
                LIMIT 250
            )
            SELECT
                c.id,
                c.name,
                c.category_id,
                c.category_name,
                c.category_icon,
                c.ts_score,
                similarity(COALESCE(c.normalized_name, ''), s.q_name) AS trgm_score,
                (0.7 * c.ts_score + 0.3 * similarity(COALESCE(c.normalized_name, ''), s.q_name)) AS final_score
            FROM candidates c
            CROSS JOIN search_input s
            ORDER BY final_score DESC, c.ts_score DESC, trgm_score DESC, c.name ASC
            LIMIT ${MAX_RESULTS}
        `;

    } catch (error) {
        console.error("[ingredients:similarity] FTS search failed", {
            normalizedName,
            limit: MAX_RESULTS,
            error,
        });
        throw error;
    }

    // FALLBACK: Si FTS no devuelve candidatos, busca por trigram sin requisito de FTS
    if (rows.length === 0) {
        try {
            rows = await prisma.$queryRaw<
                Array<{
                    id: number;
                    name: string;
                    category_id: number;
                    category_name: string;
                    category_icon: string;
                    ts_score: number;
                    trgm_score: number;
                    final_score: number;
                }>
            >`
                WITH search_params AS (
                    SELECT
                        ${normalizedName}::text AS q_name,
                        split_part(${normalizedName}, ' ', 1)::text AS first_word
                )
                SELECT
                    i.id,
                    i.name,
                    ic.id AS category_id,
                    ic.name AS category_name,
                    ic.icon AS category_icon,
                    0::real AS ts_score,
                    word_similarity(s.q_name, COALESCE(i."normalizedName", '')) AS trgm_score,
                    0.3 * word_similarity(s.q_name, COALESCE(i."normalizedName", '')) AS final_score
                FROM ingredients i
                JOIN ingredient_categories ic ON ic.id = i."categoryId"
                CROSS JOIN search_params s
                WHERE word_similarity(s.q_name, COALESCE(i."normalizedName", '')) > 0.375
                    AND i."normalizedName" ILIKE '%' || s.first_word || '%'
                ORDER BY final_score DESC, trgm_score DESC, i.name ASC
                LIMIT ${MAX_RESULTS}
            `;
        } catch (error) {
            console.error("[ingredients:similarity] trigram fallback failed", {
                normalizedName,
                limit: MAX_RESULTS,
                error,
            });
            throw error;
        }
    }

    return rows.map((row) => ({
        id: row.id,
        name: row.name,
        category: {
            id: row.category_id,
            name: row.category_name,
            icon: row.category_icon,
        },
        tsScore: row.ts_score,
        trgmScore: row.trgm_score,
        finalScore: row.final_score,
        source: "similarity",
    }));
}
