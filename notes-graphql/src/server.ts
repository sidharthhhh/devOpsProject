import { loadConfig } from './config/env';
import { createPool } from './db/connection';
import { runMigrations } from './db/migrate';
import { createApp } from './app';

/**
 * Application Entry Point
 *
 * This is the main startup file for the Notes GraphQL API server.
 * It orchestrates the entire initialization sequence in the correct order:
 *
 *   1. Load configuration — reads database credentials and server port
 *      from environment variables (via .env file)
 *   2. Create connection pool — establishes a reusable pool of MySQL connections
 *   3. Run migrations — ensures all required database tables exist
 *      (uses CREATE TABLE IF NOT EXISTS, safe to run repeatedly)
 *   4. Create Express app — sets up Express with Apollo Server middleware
 *   5. Start listening — begins accepting HTTP requests on the configured port
 *
 * If any step fails (especially the database connection), the error is logged
 * and the process exits with code 1 to signal failure to the operating system.
 *
 * Validates: Requirements 1.1, 1.5, 9.1, 9.2, 9.3
 */

async function main() {
  try {
    // Step 1: Load environment configuration
    // Reads DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, and PORT
    // from environment variables (loaded from .env file by dotenv)
    const config = loadConfig();

    // Step 2: Create the MySQL connection pool
    // This establishes the pool but does not yet verify connectivity;
    // the first actual query (migrations) will confirm the connection works
    const pool = createPool(config);

    // Step 3: Run auto-migrations
    // Creates the notes, tags, and note_tags tables if they don't already exist.
    // This ensures the database schema is always up to date on startup.
    await runMigrations(pool);

    // Step 4: Initialize the Express application with Apollo Server
    // Sets up the /graphql endpoint with the full GraphQL schema and resolvers
    const app = await createApp();

    // Step 5: Start the HTTP server on the configured port
    app.listen(config.PORT, () => {
      console.log(`🚀 Server running at http://localhost:${config.PORT}/graphql`);
    });
  } catch (error) {
    // If any startup step fails (e.g., database connection refused, migration
    // error), log the error and terminate the process with a non-zero exit code.
    // This signals to process managers (like systemd or Docker) that the
    // application failed to start and should not be considered healthy.
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Kick off the startup sequence
main();
