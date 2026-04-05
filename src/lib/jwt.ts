import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";

type TokenType = "access" | "refresh";

type ExpirationValue = SignOptions["expiresIn"];

export type AuthTokenPayload = JwtPayload & {
    sub: string;
    email: string;
    username: string;
    type: TokenType;
};

type TokenUser = {
    id: number;
    email: string;
    username: string;
};

function getAccessSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET environment variable is not set");
    }

    return secret;
}

function getRefreshSecret(): string {
    return process.env.JWT_REFRESH_SECRET ?? getAccessSecret();
}

function getAccessExpiration(): ExpirationValue {
    return (process.env.JWT_EXPIRES_IN ?? "15m") as ExpirationValue;
}

function getRefreshExpiration(): ExpirationValue {
    return (process.env.JWT_REFRESH_EXPIRES_IN ?? "7d") as ExpirationValue;
}

function signToken(user: TokenUser, type: TokenType, secret: string, expiresIn: ExpirationValue): string {
    return jwt.sign(
        {
            sub: String(user.id),
            email: user.email,
            username: user.username,
            type,
        },
        secret,
        { expiresIn }
    );
}

function verifyToken(token: string, expectedType: TokenType, secret: string): AuthTokenPayload {
    const decoded = jwt.verify(token, secret);

    if (typeof decoded !== "object" || decoded === null) {
        throw new Error("Invalid token payload");
    }

    const payload = decoded as AuthTokenPayload;
    if (payload.type !== expectedType || typeof payload.sub !== "string") {
        throw new Error("Invalid token type");
    }

    return payload;
}

export function signAccessToken(user: TokenUser): string {
    return signToken(user, "access", getAccessSecret(), getAccessExpiration());
}

export function signRefreshToken(user: TokenUser): string {
    return signToken(user, "refresh", getRefreshSecret(), getRefreshExpiration());
}

export function verifyAccessToken(token: string): AuthTokenPayload {
    return verifyToken(token, "access", getAccessSecret());
}

export function verifyRefreshToken(token: string): AuthTokenPayload {
    return verifyToken(token, "refresh", getRefreshSecret());
}
