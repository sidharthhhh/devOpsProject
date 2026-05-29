import { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { NotFoundError } from '../utils/errors';
import { findOrCreateTags, getTagsForNote, replaceNoteTags } from './tagService';

/**
 * Note Service — handles all database operations related to notes.
 *
 * This module provides functions for creating, reading, updating, deleting,
 * pinning, unpinning, and searching notes. All functions use raw SQL with
 * parameterized queries to prevent SQL injection.
 *
 * Notes can be associated with tags via the note_tags junction table
 * (many-to-many relationship). Tag operations are delegated to tagService.
 */

/** Represents a tag record from the database */
interface Tag {
  id: number;
  name: string;
}

/** Represents a note record from the database, including associated tags */
interface Note {
  id: number;
  title: string;
  content: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
  tags: Tag[];
}

/**
 * Creates a new note in the database.
 *
 * Inserts a note with the given title and content. If tagNames are provided,
 * finds or creates each tag and links them to the note via the note_tags
 * junction table. Returns the full note object with its associated tags.
 *
 * SQL: INSERT INTO notes (title, content) VALUES (?, ?)
 *
 * @param pool - The MySQL connection pool
 * @param title - The title for the new note
 * @param content - The content/body for the new note
 * @param tagNames - Optional array of tag names to associate with the note
 * @returns The newly created Note object with tags
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5
 */
export async function createNote(
  pool: Pool,
  title: string,
  content: string,
  tagNames?: string[]
): Promise<Note> {
  // Insert the new note — pinned defaults to false, timestamps are auto-set by MySQL
  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO notes (title, content) VALUES (?, ?)',
    [title, content]
  );

  const noteId = result.insertId;

  // If tag names are provided, find or create each tag and link them to the note
  if (tagNames && tagNames.length > 0) {
    const tags = await findOrCreateTags(pool, tagNames);

    // Insert associations into the note_tags junction table
    for (const tag of tags) {
      await pool.execute<ResultSetHeader>(
        'INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)',
        [noteId, tag.id]
      );
    }
  }

  // Fetch and return the complete note with its tags
  return getNoteById(pool, noteId);
}


/**
 * Retrieves a list of notes with optional pagination and pinned filter.
 *
 * Builds a dynamic SQL query based on the provided options:
 * - If `pinned` is specified, adds a WHERE clause to filter by pinned status
 * - If `limit` is specified, adds a LIMIT clause to cap results
 * - If `offset` is specified, adds an OFFSET clause to skip results
 *
 * Results are always sorted by created_at in descending order (newest first).
 *
 * @param pool - The MySQL connection pool
 * @param options - Optional filtering and pagination parameters
 * @returns An array of Note objects with their associated tags
 *
 * Validates: Requirements 3.1, 3.2, 3.3
 */
export async function getNotes(
  pool: Pool,
  options?: { limit?: number; offset?: number; pinned?: boolean }
): Promise<Note[]> {
  // Start building the SQL query dynamically
  let sql = 'SELECT id, title, content, pinned, created_at, updated_at FROM notes';
  const params: any[] = [];

  // Add WHERE clause if pinned filter is specified
  // Using !== undefined to allow filtering for both true and false values
  if (options?.pinned !== undefined) {
    sql += ' WHERE pinned = ?';
    params.push(options.pinned);
  }

  // Always sort by created_at descending (newest notes first)
  sql += ' ORDER BY created_at DESC';

  // Add LIMIT clause if specified — controls how many results to return
  if (options?.limit !== undefined) {
    sql += ' LIMIT ?';
    params.push(options.limit);
  }

  // Add OFFSET clause if specified — skips the first N results
  if (options?.offset !== undefined) {
    sql += ' OFFSET ?';
    params.push(options.offset);
  }

  const [rows] = await pool.execute<RowDataPacket[]>(sql, params);

  // Fetch tags for each note and build the full Note objects
  const notes: Note[] = [];
  for (const row of rows) {
    const tags = await getTagsForNote(pool, row.id);
    notes.push({
      id: row.id,
      title: row.title,
      content: row.content,
      pinned: !!row.pinned, // Convert MySQL TINYINT(1) to boolean
      created_at: row.created_at,
      updated_at: row.updated_at,
      tags,
    });
  }

  return notes;
}

/**
 * Retrieves a single note by its ID.
 *
 * Fetches the note record from the database and includes its associated tags.
 * Throws a NotFoundError if no note exists with the given ID.
 *
 * SQL: SELECT id, title, content, pinned, created_at, updated_at FROM notes WHERE id = ?
 *
 * @param pool - The MySQL connection pool
 * @param id - The ID of the note to retrieve
 * @returns The Note object with its associated tags
 * @throws NotFoundError if no note exists with the given ID
 *
 * Validates: Requirements 3.4, 3.5
 */
export async function getNoteById(pool: Pool, id: number): Promise<Note> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT id, title, content, pinned, created_at, updated_at FROM notes WHERE id = ?',
    [id]
  );

  // If no rows returned, the note doesn't exist
  if (rows.length === 0) {
    throw new NotFoundError('Note', id);
  }

  const row = rows[0];

  // Fetch the tags associated with this note via the note_tags junction table
  const tags = await getTagsForNote(pool, id);

  return {
    id: row.id,
    title: row.title,
    content: row.content,
    pinned: !!row.pinned, // Convert MySQL TINYINT(1) to boolean
    created_at: row.created_at,
    updated_at: row.updated_at,
    tags,
  };
}

/**
 * Retrieves all pinned notes.
 *
 * Returns all notes where the pinned field is true, sorted by created_at
 * in descending order. This is a convenience function equivalent to
 * calling getNotes with { pinned: true }.
 *
 * SQL: SELECT ... FROM notes WHERE pinned = true ORDER BY created_at DESC
 *
 * @param pool - The MySQL connection pool
 * @returns An array of pinned Note objects with their associated tags
 *
 * Validates: Requirements 3.3, 3.6
 */
export async function getPinnedNotes(pool: Pool): Promise<Note[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT id, title, content, pinned, created_at, updated_at FROM notes WHERE pinned = true ORDER BY created_at DESC'
  );

  // Fetch tags for each pinned note
  const notes: Note[] = [];
  for (const row of rows) {
    const tags = await getTagsForNote(pool, row.id);
    notes.push({
      id: row.id,
      title: row.title,
      content: row.content,
      pinned: !!row.pinned,
      created_at: row.created_at,
      updated_at: row.updated_at,
      tags,
    });
  }

  return notes;
}

/**
 * Searches notes by title or content using partial matching.
 *
 * Uses SQL LIKE with wildcards (%query%) to find notes where the title
 * or content contains the search query. MySQL's default collation
 * (utf8mb4_general_ci) provides case-insensitive matching automatically.
 *
 * SQL: SELECT ... FROM notes WHERE title LIKE ? OR content LIKE ?
 *      ORDER BY created_at DESC
 *
 * @param pool - The MySQL connection pool
 * @param query - The search string to match against title and content
 * @returns An array of matching Note objects with their associated tags
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4
 */
export async function searchNotes(pool: Pool, query: string): Promise<Note[]> {
  // Wrap the query with % wildcards for partial matching on both sides
  const likePattern = `%${query}%`;

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT id, title, content, pinned, created_at, updated_at FROM notes
     WHERE title LIKE ? OR content LIKE ?
     ORDER BY created_at DESC`,
    [likePattern, likePattern]
  );

  // Fetch tags for each matching note
  const notes: Note[] = [];
  for (const row of rows) {
    const tags = await getTagsForNote(pool, row.id);
    notes.push({
      id: row.id,
      title: row.title,
      content: row.content,
      pinned: !!row.pinned,
      created_at: row.created_at,
      updated_at: row.updated_at,
      tags,
    });
  }

  return notes;
}


/**
 * Updates an existing note's fields and/or tags.
 *
 * Checks that the note exists first (throws NotFoundError if not).
 * Builds a dynamic UPDATE SET clause based on which fields are provided.
 * If tags are provided, replaces all existing tag associations with the new set.
 * Returns the full updated note with its tags.
 *
 * SQL: UPDATE notes SET [field = ?, ...] WHERE id = ?
 *
 * @param pool - The MySQL connection pool
 * @param id - The ID of the note to update
 * @param fields - Object containing the fields to update (title, content, tags)
 * @returns The updated Note object with its associated tags
 * @throws NotFoundError if no note exists with the given ID
 *
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4
 */
export async function updateNote(
  pool: Pool,
  id: number,
  fields: { title?: string; content?: string; tags?: string[] }
): Promise<Note> {
  // First, verify the note exists — throws NotFoundError if not found
  await getNoteById(pool, id);

  // Build the dynamic SET clause based on which fields are provided
  const setClauses: string[] = [];
  const params: any[] = [];

  if (fields.title !== undefined) {
    setClauses.push('title = ?');
    params.push(fields.title);
  }

  if (fields.content !== undefined) {
    setClauses.push('content = ?');
    params.push(fields.content);
  }

  // Only execute UPDATE if there are fields to update (title or content)
  if (setClauses.length > 0) {
    const sql = `UPDATE notes SET ${setClauses.join(', ')} WHERE id = ?`;
    params.push(id);
    await pool.execute<ResultSetHeader>(sql, params);
  }

  // If tags are provided, replace all existing tag associations
  // This delegates to tagService.replaceNoteTags which handles the full replacement
  if (fields.tags !== undefined) {
    await replaceNoteTags(pool, id, fields.tags);
  }

  // Return the updated note with its current tags
  return getNoteById(pool, id);
}

/**
 * Deletes a note from the database.
 *
 * Fetches the note first (including its tags) to return the deleted object.
 * Then deletes the note — the ON DELETE CASCADE on note_tags automatically
 * removes all tag associations. Throws NotFoundError if the note doesn't exist.
 *
 * SQL: DELETE FROM notes WHERE id = ?
 *
 * @param pool - The MySQL connection pool
 * @param id - The ID of the note to delete
 * @returns The deleted Note object (with its tags as they were before deletion)
 * @throws NotFoundError if no note exists with the given ID
 *
 * Validates: Requirements 5.1, 5.2, 5.3
 */
export async function deleteNote(pool: Pool, id: number): Promise<Note> {
  // Fetch the note before deleting — this also throws NotFoundError if it doesn't exist
  const note = await getNoteById(pool, id);

  // Delete the note — CASCADE on note_tags foreign key automatically removes
  // all associated rows in the note_tags junction table
  await pool.execute<ResultSetHeader>(
    'DELETE FROM notes WHERE id = ?',
    [id]
  );

  // Return the note as it was before deletion (including its tags)
  return note;
}

/**
 * Pins a note (sets pinned = true).
 *
 * Updates the pinned field to true for the specified note.
 * The updated_at timestamp is automatically updated by MySQL's
 * ON UPDATE CURRENT_TIMESTAMP. Throws NotFoundError if the note doesn't exist.
 *
 * SQL: UPDATE notes SET pinned = true WHERE id = ?
 *
 * @param pool - The MySQL connection pool
 * @param id - The ID of the note to pin
 * @returns The updated Note object with pinned = true
 * @throws NotFoundError if no note exists with the given ID
 *
 * Validates: Requirements 6.1, 6.3, 6.4
 */
export async function pinNote(pool: Pool, id: number): Promise<Note> {
  const [result] = await pool.execute<ResultSetHeader>(
    'UPDATE notes SET pinned = true WHERE id = ?',
    [id]
  );

  // If no rows were affected, the note doesn't exist
  if (result.affectedRows === 0) {
    throw new NotFoundError('Note', id);
  }

  // Return the updated note with its tags
  return getNoteById(pool, id);
}

/**
 * Unpins a note (sets pinned = false).
 *
 * Updates the pinned field to false for the specified note.
 * The updated_at timestamp is automatically updated by MySQL's
 * ON UPDATE CURRENT_TIMESTAMP. Throws NotFoundError if the note doesn't exist.
 *
 * SQL: UPDATE notes SET pinned = false WHERE id = ?
 *
 * @param pool - The MySQL connection pool
 * @param id - The ID of the note to unpin
 * @returns The updated Note object with pinned = false
 * @throws NotFoundError if no note exists with the given ID
 *
 * Validates: Requirements 6.2, 6.3, 6.4
 */
export async function unpinNote(pool: Pool, id: number): Promise<Note> {
  const [result] = await pool.execute<ResultSetHeader>(
    'UPDATE notes SET pinned = false WHERE id = ?',
    [id]
  );

  // If no rows were affected, the note doesn't exist
  if (result.affectedRows === 0) {
    throw new NotFoundError('Note', id);
  }

  // Return the updated note with its tags
  return getNoteById(pool, id);
}
