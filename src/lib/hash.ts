import bcrypt from "bcrypt";

const DEFAULT_SALT_ROUNDS = 10;

function getSaltRounds(): number {
    const fromEnv = Number(process.env.BCRYPT_SALT_ROUNDS ?? DEFAULT_SALT_ROUNDS);
    if (!Number.isInteger(fromEnv) || fromEnv <= 0) {
        return DEFAULT_SALT_ROUNDS;
    }

    return fromEnv;
}

export async function hashPassword(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, getSaltRounds());
}

export async function comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
}
