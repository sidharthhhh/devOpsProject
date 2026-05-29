import mysql from 'mysql2/promise';
import { EnvConfig } from '../config/env';
import { Pool } from 'mysql2/promise';

/**
 * Module-level variable to hold the connection pool instance.
 *
 * Connection pooling allows the application to reuse a set of database
 * connections rather than opening and closing a new connection for every query.
 * This improves performance and reduces overhead on the MySQL server.
 */
let pool: Pool | null = null;

/**
 * Creates a MySQL connection pool using the provided configuration.
 *
 * A connection pool maintains multiple open connections to the database.
 * When a query needs to run, it borrows a connection from the pool, executes
 * the query, and then returns the connection to the pool for reuse.
 * This avoids the cost of establishing a new TCP connection for every request.
 *
 * @param config - The environment configuration containing database credentials
 * @returns The created mysql2 connection pool
 */
export function createPool(config: EnvConfig): Pool {
  pool = mysql.createPool({
    host: config.DB_HOST,
    port: config.DB_PORT,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_NAME,
    // Wait for connections rather than immediately throwing an error when the pool is full
    waitForConnections: true,
    // Maximum number of connections the pool can create at once
    connectionLimit: 10,
    // Maximum number of queued connection requests (0 = no limit)
    queueLimit: 0,
  });

  return pool;
}

/**
 * Returns the existing connection pool instance.
 *
 * This function provides access to the pool created by createPool().
 * It should only be called after createPool() has been invoked during
 * server startup. Throws an error if the pool has not been initialized.
 *
 * @returns The existing mysql2 connection pool
 * @throws Error if createPool() has not been called yet
 */
export function getPool(): Pool {
  if (!pool) {
    throw new Error(
      'Database pool has not been initialized. Call createPool() first.'
    );
  }
  return pool;
}
