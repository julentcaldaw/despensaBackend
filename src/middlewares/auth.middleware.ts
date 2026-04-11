import type { UserRole } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";

import { verifyAccessToken } from "../lib/jwt.js";

const VALID_ROLES: UserRole[] = ["USER", "CONTRIBUTOR", "ADMIN"];

function isValidRole(value: unknown): value is UserRole {
    return typeof value === "string" && VALID_ROLES.includes(value as UserRole);
}

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
            role: payload.role,
        };

        if (!Number.isInteger(req.user.id) || req.user.id <= 0 || !isValidRole(req.user.role)) {
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

export function authorizeRoles(...allowedRoles: UserRole[]) {
    return (req: Request, res: Response, next: NextFunction): Response | void => {
        if (!req.user) {
            return res.status(401).json({
                ok: false,
                error: {
                    code: "UNAUTHORIZED",
                    message: "Authentication is required",
                },
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                ok: false,
                error: {
                    code: "FORBIDDEN",
                    message: "You do not have permission to access this resource",
                    details: {
                        requiredRoles: allowedRoles,
                        currentRole: req.user.role,
                    },
                },
            });
        }

        next();
    };
}
