import type { Request, Response } from "express";

import {
    IngredientError,
    createIngredient,
    createIngredientsBulk,
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
