import type { Request, Response } from "express";

import {
    IngredientError,
    createIngredient,
    createIngredientsBulk,
    searchIngredientsBySimilarity,
    searchIngredientsByText,
    type CreateIngredientInput,
} from "./ingredients.service.js";

type CreateIngredientBody = {
    name?: unknown;
    categoryId?: unknown;
    restrictionIds?: unknown;
};

type BulkCreateIngredientsBody = {
    items?: unknown;
};

type SearchIngredientsQuery = {
    query?: unknown;
    limit?: unknown;
};

type SimilaritySearchBody = {
    name?: unknown;
    barcode?: unknown;
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

function parseRestrictionIds(value: unknown): number[] {
    if (typeof value === "undefined") {
        return [];
    }

    if (!Array.isArray(value)) {
        throw new IngredientError("VALIDATION_ERROR", 400, "restrictionIds must be an array of integers");
    }

    const parsed = value.map((item) => Number(item));
    const allValid = parsed.every((id) => Number.isInteger(id) && id > 0);
    if (!allValid) {
        throw new IngredientError("VALIDATION_ERROR", 400, "restrictionIds must contain positive integers only");
    }

    return parsed;
}

function parseCreateIngredientInput(payload: CreateIngredientBody): CreateIngredientInput {
    if (typeof payload.name !== "string" || payload.name.trim().length === 0) {
        throw new IngredientError("VALIDATION_ERROR", 400, "name is required and must be a non-empty string");
    }

    const categoryId = Number(payload.categoryId);
    if (!Number.isInteger(categoryId) || categoryId <= 0) {
        throw new IngredientError("VALIDATION_ERROR", 400, "categoryId is required and must be a positive integer");
    }

    const restrictionIds = parseRestrictionIds(payload.restrictionIds);

    return {
        name: payload.name.trim(),
        categoryId,
        restrictionIds,
    };
}

function parseSearchQuery(queryParams: SearchIngredientsQuery): { query: string; limit: number } {
    if (typeof queryParams.query !== "string") {
        throw new IngredientError("VALIDATION_ERROR", 400, "query is required and must be a string");
    }

    const query = queryParams.query.trim();
    if (query.length === 0) {
        throw new IngredientError("VALIDATION_ERROR", 400, "query must be a non-empty string");
    }

    const rawLimit = typeof queryParams.limit === "undefined" ? 6 : Number(queryParams.limit);
    if (!Number.isInteger(rawLimit) || rawLimit <= 0 || rawLimit > 50) {
        throw new IngredientError("VALIDATION_ERROR", 400, "limit must be an integer between 1 and 50");
    }

    return { query, limit: rawLimit };
}

function parseSimilaritySearchBody(payload: SimilaritySearchBody): { name: string; barcode: string } {
    if (typeof payload.name !== "string" || payload.name.trim().length === 0) {
        throw new IngredientError("VALIDATION_ERROR", 400, "name is required and must be a non-empty string");
    }

    if (typeof payload.barcode !== "string") {
        throw new IngredientError("VALIDATION_ERROR", 400, "barcode is required and must be a string");
    }

    return {
        name: payload.name.trim(),
        barcode: payload.barcode.trim(),
    };
}

export async function searchIngredientsController(req: Request, res: Response): Promise<Response> {
    try {
        const { query, limit } = parseSearchQuery(req.query as SearchIngredientsQuery);
        const items = await searchIngredientsByText(query, limit);

        return res.status(200).json({
            ok: true,
            data: items
        });
    } catch (error) {
        if (error instanceof IngredientError) {
            return sendError(res, error.status, error.code, error.message, error.details);
        }

        return sendError(res, 500, "INTERNAL_ERROR", "Unexpected error searching ingredients");
    }
}

export async function searchIngredientsSimilarityController(req: Request, res: Response): Promise<Response> {
    try {
        const { name, barcode } = parseSimilaritySearchBody(req.body as SimilaritySearchBody);
        const items = await searchIngredientsBySimilarity(name, barcode);

        const HIGH_SCORE_THRESHOLD = 0.16;
        const MAX_HIGH_RESULTS = 2;
        const MAX_LOW_RESULTS = 4;

        const normalizedItems = items.map((item) => ({
            id: item.id,
            name: item.name,
            category: {
                id: item.category.id,
                name: item.category.name,
                icon: item.category.icon,
            },
            finalScore: item.finalScore,
        }));

        const high = normalizedItems
            .filter((item) => item.finalScore >= HIGH_SCORE_THRESHOLD)
            .map(({ finalScore, ...rest }) => rest)
            .slice(0, MAX_HIGH_RESULTS);

        const low = normalizedItems
            .filter((item) => item.finalScore < HIGH_SCORE_THRESHOLD)
            .map(({ finalScore, ...rest }) => rest)
            .slice(0, MAX_LOW_RESULTS);

        return res.status(200).json({
            ok: true,
            data: {
                high,
                low,
            },
        });
    } catch (error) {
        if (error instanceof IngredientError) {
            return sendError(res, error.status, error.code, error.message, error.details);
        }

        return sendError(res, 500, "INTERNAL_ERROR", "Unexpected error searching ingredients by similarity");
    }
}

export async function createIngredientController(req: Request, res: Response): Promise<Response> {
    try {
        const input = parseCreateIngredientInput(req.body as CreateIngredientBody);
        const created = await createIngredient(input);

        return res.status(201).json({
            ok: true,
            data: created,
        });
    } catch (error) {
        if (error instanceof IngredientError) {
            return sendError(res, error.status, error.code, error.message, error.details);
        }

        return sendError(res, 500, "INTERNAL_ERROR", "Unexpected error creating ingredient");
    }
}

export async function createIngredientsBulkController(req: Request, res: Response): Promise<Response> {
    try {
        const body = req.body as BulkCreateIngredientsBody;
        if (!Array.isArray(body.items) || body.items.length === 0) {
            throw new IngredientError("VALIDATION_ERROR", 400, "items is required and must be a non-empty array");
        }

        const inputs = body.items.map((item, index) => {
            if (typeof item !== "object" || item === null) {
                throw new IngredientError("VALIDATION_ERROR", 400, "each item must be an object", { index });
            }

            try {
                return parseCreateIngredientInput(item as CreateIngredientBody);
            } catch (error) {
                if (error instanceof IngredientError) {
                    throw new IngredientError(error.code, error.status, error.message, {
                        index,
                        ...(typeof error.details === "object" && error.details !== null ? error.details : {}),
                    });
                }

                throw error;
            }
        });

        const created = await createIngredientsBulk(inputs);

        return res.status(201).json({
            ok: true,
            data: {
                count: created.length,
                items: created,
            },
        });
    } catch (error) {
        if (error instanceof IngredientError) {
            return sendError(res, error.status, error.code, error.message, error.details);
        }

        return sendError(res, 500, "INTERNAL_ERROR", "Unexpected error creating ingredients in bulk");
    }
}
