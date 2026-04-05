import type { NextFunction, Request, Response } from "express";

import { verifyAccessToken } from "../lib/jwt.js";

export function authenticateUser(req: Request, res: Response, next: NextFunction): Response | void {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith("Bearer ")) {
        return res.status(401).json({
            ok: false,
            error: {
                code: "UNAUTHORIZED",
                message: "Missing or invalid Authorization header",
            },
        });
    }

    const token = authorization.slice("Bearer ".length).trim();

    try {
        const payload = verifyAccessToken(token);
        req.user = {
            id: Number(payload.sub),
            email: payload.email,
            username: payload.username,
        };

        if (!Number.isInteger(req.user.id) || req.user.id <= 0) {
            throw new Error("Invalid token user id");
        }

        next();
    } catch {
        return res.status(401).json({
            ok: false,
            error: {
                code: "INVALID_TOKEN",
                message: "Invalid or expired access token",
            },
        });
    }
}
