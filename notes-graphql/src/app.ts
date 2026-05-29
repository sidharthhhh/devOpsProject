import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import typeDefs from './graphql/schema/typeDefs';
import resolvers from './graphql/resolvers';
import { getPool } from './db/connection';

/**
 * Express + Apollo Server Integration
 *
 * This module sets up the Express HTTP server and integrates Apollo Server
 * as middleware. Apollo Server handles all GraphQL operations (parsing,
 * validating, and executing queries/mutations), while Express provides
 * the underlying HTTP framework.
 *
 * The integration works as follows:
 *   1. An Express app is created to handle HTTP requests
 *   2. An Apollo Server instance is created with the GraphQL schema (typeDefs)
 *      and resolver functions (resolvers)
 *   3. A context function provides the database connection pool to all resolvers,
 *      so they can execute SQL queries without managing connections themselves
 *   4. Apollo Server is started (required in Apollo Server 3+)
 *   5. Apollo middleware is applied to Express at the /graphql path,
 *      meaning all GraphQL requests are sent to POST /graphql
 *
 * Validates: Requirements 10.1, 10.2
 */

/**
 * Creates and configures the Express application with Apollo Server middleware.
 *
 * This async function is the main setup entry point for the HTTP layer.
 * It must be called after the database pool has been initialized (via createPool),
 * because the context function calls getPool() on every incoming request.
 *
 * @returns A fully configured Express application with Apollo Server middleware
 */
export async function createApp() {
  // Create the Express application instance
  const app = express();

  // Initialize Apollo Server with the GraphQL schema and resolvers.
  // The context function runs on every request and provides shared
  // dependencies (like the database pool) to all resolver functions.
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    // The context function provides the database connection pool to every resolver.
    // Resolvers access it as the third argument: (parent, args, context) => { context.pool }
    context: () => ({ pool: getPool() }),
  });

  // Apollo Server 3+ requires calling start() before applying middleware.
  // This performs internal initialization (schema validation, plugin setup, etc.)
  await server.start();

  // Apply Apollo Server as Express middleware at the /graphql path.
  // All GraphQL queries and mutations are sent to this single endpoint.
  // Note: Type assertion is needed due to version mismatch between
  // @types/express in the project and the one bundled with apollo-server-express.
  server.applyMiddleware({ app: app as any, path: '/graphql' });

  return app;
}
