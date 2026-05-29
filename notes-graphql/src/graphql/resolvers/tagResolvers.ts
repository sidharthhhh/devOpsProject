import { Pool } from 'mysql2/promise';
import * as tagService from '../../services/tagService';

/**
 * Tag Resolvers — handles GraphQL queries and mutations for tags.
 *
 * Each resolver function receives three arguments:
 *   _ (parent)  — the return value of the parent resolver (unused at root level)
 *   args        — the arguments passed to the GraphQL field
 *   context     — shared context containing the database connection pool
 *
 * Resolvers delegate all database logic to the tagService module,
 * keeping this layer thin and focused on wiring GraphQL to the service layer.
 */

// Context type that includes the database pool
interface Context {
  pool: Pool;
}

export const tagResolvers = {
  Query: {
    /**
     * tags — retrieves all tags from the database.
     *
     * Returns every tag record. No arguments are needed since
     * the full tag list is returned without filtering or pagination.
     *
     * Validates: Requirement 8.3
     */
    tags: (_: any, __: any, context: Context) => {
      return tagService.getAllTags(context.pool);
    },
  },

  Mutation: {
    /**
     * createTag — creates a new tag with the given name.
     *
     * Accepts a unique tag name and inserts it into the database.
     * Throws a DuplicateError (surfaced as a GraphQL error) if a tag
     * with the same name already exists.
     *
     * Validates: Requirements 8.1, 8.2
     */
    createTag: (_: any, args: { name: string }, context: Context) => {
      return tagService.createTag(context.pool, args.name);
    },
  },
};
