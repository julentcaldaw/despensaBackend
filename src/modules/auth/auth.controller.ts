import type { Request, Response } from "express";

import { AuthError, login, refreshToken, register } from "./auth.service.js";

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

type RegisterBody = {
    email?: unknown;
    username?: unknown;
    password?: unknown;
    avatar?: unknown;
};

type LoginBody = {
    email?: unknown;
    password?: unknown;
};

type RefreshBody = {
    refreshToken?: unknown;
};

function isNonEmptyString(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0;
}

export async function registerController(req: Request, res: Response): Promise<Response> {
    const body = req.body as RegisterBody;

    if (!isNonEmptyString(body.email) || !isNonEmptyString(body.username) || !isNonEmptyString(body.password)) {
        return sendError(res, 400, "VALIDATION_ERROR", "email, username and password are required");
    }

    if (typeof body.avatar !== "undefined" && typeof body.avatar !== "string") {
        return sendError(res, 400, "VALIDATION_ERROR", "avatar must be a string when provided");
    }

    try {
        const result = await register({
            email: body.email.trim().toLowerCase(),
            username: body.username.trim(),
            password: body.password,
            avatar: body.avatar,
        });

        return res.status(201).json({ ok: true, data: result });
    } catch (error) {
        if (error instanceof AuthError) {
            return sendError(res, error.status, error.code, error.message);
        }

        return sendError(res, 500, "INTERNAL_ERROR", "Unexpected error during register");
    }
}

export async function loginController(req: Request, res: Response): Promise<Response> {
    const body = req.body as LoginBody;

    if (!isNonEmptyString(body.email) || !isNonEmptyString(body.password)) {
        return sendError(res, 400, "VALIDATION_ERROR", "email and password are required");
    }

    try {
        const result = await login({
            email: body.email.trim().toLowerCase(),
            password: body.password,
        });

        return res.status(200).json({ ok: true, data: result });
    } catch (error) {
        if (error instanceof AuthError) {
            return sendError(res, error.status, error.code, error.message);
        }

        return sendError(res, 500, "INTERNAL_ERROR", "Unexpected error during login");
    }
}

export async function refreshTokenController(req: Request, res: Response): Promise<Response> {
    const body = req.body as RefreshBody;
    if (!isNonEmptyString(body.refreshToken)) {
        return sendError(res, 400, "VALIDATION_ERROR", "refreshToken is required");
    }

    try {
        const result = await refreshToken(body.refreshToken);
        return res.status(200).json({ ok: true, data: result });
    } catch (error) {
        if (error instanceof AuthError) {
            return sendError(res, error.status, error.code, error.message);
        }

        return sendError(res, 500, "INTERNAL_ERROR", "Unexpected error during token refresh");
    }
}
