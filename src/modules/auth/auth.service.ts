import { comparePassword, hashPassword } from "../../lib/hash.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../lib/jwt.js";
import { prisma } from "../../lib/prisma.js";

export class AuthError extends Error {
    constructor(
        public readonly code: string,
        public readonly status: number,
        message: string
    ) {
        super(message);
        this.name = "AuthError";
    }
}

export type RegisterInput = {
    email: string;
    username: string;
    password: string;
    avatar?: string;
};

export type LoginInput = {
    email: string;
    password: string;
};

type AuthUser = {
    id: number;
    email: string;
    username: string;
    avatar: string | null;
};

type AuthResult = {
    user: AuthUser;
    accessToken: string;
    refreshToken: string;
};

function toAuthResult(user: AuthUser): AuthResult {
    return {
        user,
        accessToken: signAccessToken({ id: user.id, email: user.email, username: user.username }),
        refreshToken: signRefreshToken({ id: user.id, email: user.email, username: user.username }),
    };
}

export async function register(input: RegisterInput): Promise<AuthResult> {
    const existing = await prisma.user.findFirst({
        where: {
            OR: [{ email: input.email }, { username: input.username }],
        },
        select: { id: true, email: true, username: true },
    });

    if (existing) {
        if (existing.email === input.email) {
            throw new AuthError("EMAIL_ALREADY_EXISTS", 409, "Email already registered");
        }

        throw new AuthError("USERNAME_ALREADY_EXISTS", 409, "Username already in use");
    }

    const password = await hashPassword(input.password);
    const user = await prisma.user.create({
        data: {
            email: input.email,
            username: input.username,
            password,
            avatar: input.avatar,
        },
        select: {
            id: true,
            email: true,
            username: true,
            avatar: true,
        },
    });

    return toAuthResult(user);
}

export async function login(input: LoginInput): Promise<AuthResult> {
    const user = await prisma.user.findUnique({
        where: { email: input.email },
        select: {
            id: true,
            email: true,
            username: true,
            avatar: true,
            password: true,
        },
    });

    if (!user) {
        throw new AuthError("INVALID_CREDENTIALS", 401, "Invalid credentials");
    }

    const validPassword = await comparePassword(input.password, user.password);
    if (!validPassword) {
        throw new AuthError("INVALID_CREDENTIALS", 401, "Invalid credentials");
    }

    return toAuthResult({
        id: user.id,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
    });
}

export async function refreshToken(refreshToken: string): Promise<AuthResult> {
    let payloadUserId: number;

    try {
        const payload = verifyRefreshToken(refreshToken);
        payloadUserId = Number(payload.sub);
    } catch {
        throw new AuthError("INVALID_REFRESH_TOKEN", 401, "Invalid or expired refresh token");
    }

    if (!Number.isInteger(payloadUserId) || payloadUserId <= 0) {
        throw new AuthError("INVALID_REFRESH_TOKEN", 401, "Invalid or expired refresh token");
    }

    const user = await prisma.user.findUnique({
        where: { id: payloadUserId },
        select: {
            id: true,
            email: true,
            username: true,
            avatar: true,
        },
    });

    if (!user) {
        throw new AuthError("USER_NOT_FOUND", 404, "User not found");
    }

    return toAuthResult(user);
}
