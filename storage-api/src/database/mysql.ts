import mysql, { Pool, PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { logger } from '../config/logger';

const globalForMySQL = globalThis as unknown as {
  pool: Pool | undefined;
};

export const pool =
  globalForMySQL.pool ??
  mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'storage_api',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForMySQL.pool = pool;
}

export const connectDatabase = async (): Promise<void> => {
  try {
    const connection = await pool.getConnection();
    connection.release();
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error({ err: error }, 'Failed to connect to database');
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  await pool.end();
  logger.info('Database disconnected');
};

export { PoolConnection, RowDataPacket, ResultSetHeader };
