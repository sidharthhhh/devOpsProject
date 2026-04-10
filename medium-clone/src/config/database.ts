import mysql from 'mysql2/promise';
import { env } from './env';
import { logger } from '../utils/logger';

const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

/**
 * Execute a parameterized query against the MySQL connection pool.
 * Always use parameterized queries to prevent SQL injection.
 */
export async function query<T = any>(sql: string, params?: any[]): Promise<T> {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows as T;
  } catch (error) {
    logger.error('Database query error', { sql, error });
    throw error;
  }
}

/**
 * Test the database connection.
 */
export async function testConnection(): Promise<void> {
  try {
    const connection = await pool.getConnection();
    logger.info('Database connection established successfully');
    connection.release();
  } catch (error) {
    logger.error('Failed to connect to database', { error });
    throw error;
  }
}

export default pool;
