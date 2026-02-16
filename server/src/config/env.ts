import dotenv from "dotenv";

dotenv.config();

const getEnv = (key: string, defaultValue?: string): string => {
    const value = process.env[key] || defaultValue;
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
};

export const PORT = getEnv("PORT", "5000");
export const NODE_ENV = getEnv("NODE_ENV", "development");
export const JWT_SECRET = getEnv("JWT_SECRET");
export const DATABASE_URL = getEnv("DATABASE_URL");
export const CLIENT_URL = getEnv("CLIENT_URL");
