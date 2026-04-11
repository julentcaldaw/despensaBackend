import { type Conservation, type Unit } from "@prisma/client";
import type { Request, Response } from "express";

import {
    createPantryItem,
    deletePantryItem,
    listPantryItems,
    PantryItemError,
    updatePantryItem,
    type CreatePantryItemInput,
    type UpdatePantryItemInput,
} from "./pantry-items.service.js";

type CreatePantryItemBody = {
    ingredientId?: unknown;
    acquiredAt?: unknown;
    expiresAt?: unknown;
    quantity?: unknown;
    unit?: unknown;
    conservation?: unknown;
    shopId?: unknown;
};

type UpdatePantryItemBody = {
    ingredientId?: unknown;
    acquiredAt?: unknown;
    expiresAt?: unknown;
    quantity?: unknown;
    unit?: unknown;
    conservation?: unknown;
    shopId?: unknown;
};

const VALID_CONSERVATION_VALUES: Conservation[] = ["NEVERA", "CONGELADOR", "DESPENSA"];
const VALID_UNIT_VALUES: Unit[] = [
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
];

const UNIT_ALIASES: Record<string, Unit> = {
    g: "G",
    kg: "KG",
    ml: "ML",
    l: "L",
    unit: "UNIT",
    units: "UNIT",
    ud: "UNIT",
    uds: "UNIT",
    unidad: "UNIT",
    unidades: "UNIT",
    pack: "PACK",
    can: "CAN",
    bottle: "BOTTLE",
    jar: "JAR",
    box: "BOX",
    bag: "BAG",
    tbsp: "TBSP",
    tsp: "TSP",
    slice: "SLICE",
    clove: "CLOVE",
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

function parsePositiveInt(value: unknown, fieldName: string): number {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new PantryItemError("VALIDATION_ERROR", 400, `${fieldName} must be a positive integer`);
    }

    return parsed;
}

function parseNonNegativeNumber(value: unknown, fieldName: string): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
        throw new PantryItemError("VALIDATION_ERROR", 400, `${fieldName} must be a non-negative number`);
    }

    return parsed;
}

function parseDate(value: unknown, fieldName: string): Date {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new PantryItemError("VALIDATION_ERROR", 400, `${fieldName} must be a valid date string`);
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw new PantryItemError("VALIDATION_ERROR", 400, `${fieldName} must be a valid date string`);
    }

    return date;
}

function parseConservation(value: unknown): Conservation {
    if (typeof value !== "string" || !VALID_CONSERVATION_VALUES.includes(value as Conservation)) {
        throw new PantryItemError(
            "VALIDATION_ERROR",
            400,
            `conservation must be one of: ${VALID_CONSERVATION_VALUES.join(", ")}`
        );
    }

    return value as Conservation;
}

function parseUnit(value: unknown, required: boolean): Unit | undefined {
    if (typeof value === "undefined") {
        if (required) {
            throw new PantryItemError("VALIDATION_ERROR", 400, "unit is required");
        }

        return undefined;
    }

    if (typeof value !== "string" || value.trim().length === 0) {
        throw new PantryItemError("VALIDATION_ERROR", 400, "unit must be a non-empty string");
    }

    const normalized = value.trim();
    const canonical = UNIT_ALIASES[normalized.toLowerCase()] ?? (normalized.toUpperCase() as Unit);

    if (!VALID_UNIT_VALUES.includes(canonical)) {
        throw new PantryItemError(
            "VALIDATION_ERROR",
            400,
            `unit must be one of: ${VALID_UNIT_VALUES.join(", ")}`
        );
    }

    return canonical;
}

function parseOptionalNullableQuantity(value: unknown, fieldName: string): number | null {
    if (value === null) {
        return null;
    }

    return parseNonNegativeNumber(value, fieldName);
}

function parseOptionalNullableUnit(value: unknown): Unit | null {
    if (value === null) {
        return null;
    }

    return parseUnit(value, false) as Unit;
}

function parseCreateInput(body: CreatePantryItemBody): CreatePantryItemInput {
    const ingredientId = parsePositiveInt(body.ingredientId, "ingredientId");

    return {
        ingredientId,
        acquiredAt: typeof body.acquiredAt === "undefined" ? undefined : parseDate(body.acquiredAt, "acquiredAt"),
        expiresAt:
            typeof body.expiresAt === "undefined"
                ? undefined
                : body.expiresAt === null
                  ? null
                  : parseDate(body.expiresAt, "expiresAt"),
        quantity:
            typeof body.quantity === "undefined"
                ? undefined
                : parseOptionalNullableQuantity(body.quantity, "quantity"),
        unit:
            typeof body.unit === "undefined"
                ? undefined
                : parseOptionalNullableUnit(body.unit),
        conservation: typeof body.conservation === "undefined" ? undefined : parseConservation(body.conservation),
        shopId:
            typeof body.shopId === "undefined"
                ? undefined
                : body.shopId === null
                  ? null
                  : parsePositiveInt(body.shopId, "shopId"),
    };
}

function parseUpdateInput(body: UpdatePantryItemBody): UpdatePantryItemInput {
    const keys = Object.keys(body);
    if (keys.length === 0) {
        throw new PantryItemError("VALIDATION_ERROR", 400, "At least one field must be provided to update");
    }

    const input: UpdatePantryItemInput = {};

    if (Object.prototype.hasOwnProperty.call(body, "ingredientId")) {
        input.ingredientId = parsePositiveInt(body.ingredientId, "ingredientId");
    }

    if (Object.prototype.hasOwnProperty.call(body, "acquiredAt")) {
        input.acquiredAt = parseDate(body.acquiredAt, "acquiredAt");
    }

    if (Object.prototype.hasOwnProperty.call(body, "expiresAt")) {
        input.expiresAt = body.expiresAt === null ? null : parseDate(body.expiresAt, "expiresAt");
    }

    if (Object.prototype.hasOwnProperty.call(body, "quantity")) {
        input.quantity = parseOptionalNullableQuantity(body.quantity, "quantity");
    }

    if (Object.prototype.hasOwnProperty.call(body, "unit")) {
        input.unit = parseOptionalNullableUnit(body.unit);
    }

    if (Object.prototype.hasOwnProperty.call(body, "conservation")) {
        input.conservation = parseConservation(body.conservation);
    }

    if (Object.prototype.hasOwnProperty.call(body, "shopId")) {
        input.shopId = body.shopId === null ? null : parsePositiveInt(body.shopId, "shopId");
    }

    return input;
}

function getAuthenticatedUserId(req: Request): number {
    if (!req.user) {
        throw new PantryItemError("UNAUTHORIZED", 401, "Authentication is required");
    }

    return req.user.id;
}

function parsePantryItemId(value: unknown): number {
    if (typeof value !== "string") {
        throw new PantryItemError("VALIDATION_ERROR", 400, "id must be a positive integer");
    }

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new PantryItemError("VALIDATION_ERROR", 400, "id must be a positive integer");
    }

    return parsed;
}

export async function listPantryItemsController(req: Request, res: Response): Promise<Response> {
    try {
        const userId = getAuthenticatedUserId(req);
        const items = await listPantryItems(userId);

        return res.status(200).json({
            ok: true,
            data: items,
        });
    } catch (error) {
        if (error instanceof PantryItemError) {
            return sendError(res, error.status, error.code, error.message, error.details);
        }

        return sendError(res, 500, "INTERNAL_ERROR", "Unexpected error listing pantry items");
    }
}

export async function createPantryItemController(req: Request, res: Response): Promise<Response> {
    try {
        const userId = getAuthenticatedUserId(req);
        const input = parseCreateInput(req.body as CreatePantryItemBody);
        const created = await createPantryItem(userId, input);

        return res.status(201).json({
            ok: true,
            data: created,
        });
    } catch (error) {
        if (error instanceof PantryItemError) {
            return sendError(res, error.status, error.code, error.message, error.details);
        }

        return sendError(res, 500, "INTERNAL_ERROR", "Unexpected error creating pantry item");
    }
}

export async function updatePantryItemController(req: Request, res: Response): Promise<Response> {
    try {
        const userId = getAuthenticatedUserId(req);
        const pantryItemId = parsePantryItemId(req.params.id);
        const input = parseUpdateInput(req.body as UpdatePantryItemBody);
        const updated = await updatePantryItem(userId, pantryItemId, input);

        return res.status(200).json({
            ok: true,
            data: updated,
        });
    } catch (error) {
        if (error instanceof PantryItemError) {
            return sendError(res, error.status, error.code, error.message, error.details);
        }

        return sendError(res, 500, "INTERNAL_ERROR", "Unexpected error updating pantry item");
    }
}

export async function deletePantryItemController(req: Request, res: Response): Promise<Response> {
    try {
        const userId = getAuthenticatedUserId(req);
        const pantryItemId = parsePantryItemId(req.params.id);
        await deletePantryItem(userId, pantryItemId);

        return res.status(200).json({
            ok: true,
            data: {
                deleted: true,
            },
        });
    } catch (error) {
        if (error instanceof PantryItemError) {
            return sendError(res, error.status, error.code, error.message, error.details);
        }

        return sendError(res, 500, "INTERNAL_ERROR", "Unexpected error deleting pantry item");
    }
}
