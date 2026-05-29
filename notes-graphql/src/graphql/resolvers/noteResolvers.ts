import { Pool } from 'mysql2/promise';
import * as noteService from '../../services/noteService';

/**
 * Note Resolvers — handles all GraphQL query and mutation operations for notes.
 *
 * Each resolver delegates to the corresponding noteService function, passing
 * the MySQL connection pool from the GraphQL context. This keeps resolvers thin
 * and focused on bridging GraphQL arguments to service layer calls.
 *
 * The context object is provided by Apollo Server and contains the database pool,
 * which is shared across all resolvers for efficient connection reuse.
 */

// Context type that includes the database pool provided by Apollo Server
interface Context {
  pool: Pool;
}

export const noteResolvers = {
  Query: {
    /**
     * Retrieves a list of notes with optional pagination and pinned filter.
     *
     * Supports limit/offset pagination and filtering by pinned status.
     * Results are always sorted by created_at in descending order (newest first).
     *
     * Validates: Requirements 3.1, 3.2, 3.3
     */
    notes: (_: any, args: { limit?: number; offset?: number; pinned?: boolean }, context: Context) => {
      return noteService.getNotes(context.pool, args);
    },

    /**
     * Retrieves a single note by its ID, including associated tags.
     *
     * Throws a NotFoundError (surfaced as a GraphQL error) if no note
     * exists with the given ID.
     *
     * Validates: Requirements 3.4, 3.5
     */
    note: (_: any, args: { id: number }, context: Context) => {
      return noteService.getNoteById(context.pool, args.id);
    },

    /**
     * Retrieves all pinned notes, sorted by created_at descending.
     *
     * Convenience query equivalent to notes(pinned: true).
     *
     * Validates: Requirements 3.3, 3.6
     */
    pinnedNotes: (_: any, __: any, context: Context) => {
      return noteService.getPinnedNotes(context.pool);
    },

    /**
     * Searches notes by title or content using case-insensitive partial matching.
     *
     * Uses SQL LIKE with wildcards for substring matching. Returns results
     * sorted by created_at descending. Returns an empty list if no matches found.
     *
     * Validates: Requirements 7.1, 7.2, 7.3, 7.4
     */
    searchNotes: (_: any, args: { query: string }, context: Context) => {
      return noteService.searchNotes(context.pool, args.query);
    },
  },

  Mutation: {
    /**
     * Creates a new note with the given title, content, and optional tags.
     *
     * If tag names are provided, they are created if they don't already exist
     * and linked to the new note. The note's pinned field defaults to false,
     * and timestamps are set automatically.
     *
     * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5
     */
    createNote: (_: any, args: { title: string; content: string; tags?: string[] }, context: Context) => {
      return noteService.createNote(context.pool, args.title, args.content, args.tags);
    },

    /**
     * Updates an existing note's title, content, and/or tags.
     *
     * Only the provided fields are updated; omitted fields remain unchanged.
     * If tags are provided, they fully replace the existing tag associations.
     * Throws NotFoundError if the note doesn't exist.
     *
     * Validates: Requirements 4.1, 4.2, 4.3, 4.4
     */
    updateNote: (_: any, args: { id: number; title?: string; content?: string; tags?: string[] }, context: Context) => {
      return noteService.updateNote(context.pool, args.id, {
        title: args.title,
        content: args.content,
        tags: args.tags,
      });
    },

    /**
     * Deletes a note by ID and returns the deleted note object.
     *
     * The note's tag associations are automatically removed via CASCADE.
     * Throws NotFoundError if the note doesn't exist.
     *
     * Validates: Requirements 5.1, 5.2, 5.3
     */
    deleteNote: (_: any, args: { id: number }, context: Context) => {
      return noteService.deleteNote(context.pool, args.id);
    },

    /**
     * Pins a note (sets pinned = true) and returns the updated note.
     *
     * The updated_at timestamp is automatically refreshed by MySQL.
     * Throws NotFoundError if the note doesn't exist.
     *
     * Validates: Requirements 6.1, 6.3, 6.4
     */
    pinNote: (_: any, args: { id: number }, context: Context) => {
      return noteService.pinNote(context.pool, args.id);
    },

    /**
     * Unpins a note (sets pinned = false) and returns the updated note.
     *
     * The updated_at timestamp is automatically refreshed by MySQL.
     * Throws NotFoundError if the note doesn't exist.
     *
     * Validates: Requirements 6.2, 6.3, 6.4
     */
    unpinNote: (_: any, args: { id: number }, context: Context) => {
      return noteService.unpinNote(context.pool, args.id);
    },
  },
};
