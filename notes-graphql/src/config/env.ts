import * as dotenv from 'dotenv';

// Load environment variables from the .env file in the project root.
// This must be called before accessing any process.env values.
dotenv.config();

/**
 * Typed configuration object for the application.
 * All database and server settings are defined here.
 */
export interface EnvConfig {
  /** Hostname or IP address of the MySQL server */
  DB_HOST: string;
  /** Port number the MySQL server is listening on (default: 3306) */
  DB_PORT: number;
  /** MySQL user to authenticate as */
  DB_USER: string;
  /** Password for the MySQL user */
  DB_PASSWORD: string;
  /** Name of the MySQL database to connect to */
  DB_NAME: string;
  /** Port number the Express server will listen on (default: 4000) */
  PORT: number;
}

/**
 * Reads environment variables and returns a typed configuration object.
 * Provides sensible defaults for PORT (4000) and DB_PORT (3306).
 * All other database fields fall back to empty strings if not set.
 */
export function loadConfig(): EnvConfig {
  return {
    DB_HOST: process.env.DB_HOST || '',
    DB_PORT: parseInt(process.env.DB_PORT || '3306', 10),
    DB_USER: process.env.DB_USER || '',
    DB_PASSWORD: process.env.DB_PASSWORD || '',
    DB_NAME: process.env.DB_NAME || '',
    PORT: parseInt(process.env.PORT || '4000', 10),
  };
}
