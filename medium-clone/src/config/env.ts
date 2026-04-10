import dotenv from 'dotenv';
import path from 'path';

// Load .env file from project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

interface EnvConfig {
  PORT: number;
  NODE_ENV: string;
  DB_HOST: string;
  DB_PORT: number;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_NAME: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
}

function getEnvVar(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env: EnvConfig = {
  PORT: parseInt(getEnvVar('PORT', '3000'), 10),
  NODE_ENV: getEnvVar('NODE_ENV', 'development'),
  DB_HOST: getEnvVar('DB_HOST', 'localhost'),
  DB_PORT: parseInt(getEnvVar('DB_PORT', '3306'), 10),
  DB_USER: getEnvVar('DB_USER'),
  DB_PASSWORD: getEnvVar('DB_PASSWORD'),
  DB_NAME: getEnvVar('DB_NAME'),
  JWT_SECRET: getEnvVar('JWT_SECRET', 'dev-secret'),
  JWT_EXPIRES_IN: getEnvVar('JWT_EXPIRES_IN', '1h'),
};

export const isDevelopment = env.NODE_ENV === 'development';
export const isProduction = env.NODE_ENV === 'production';
