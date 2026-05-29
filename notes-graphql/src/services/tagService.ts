import { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { DuplicateError } from '../utils/errors';

/**
 * Tag Service — handles all database operations related to tags.
 *
 * This module provides functions for creating, retrieving, and managing tags
 * and their associations with notes. All functions use raw SQL with
 * parameterized queries to prevent SQL injection.
 *
 * Tags are reusable labels that can be associated with multiple notes via
 * the note_tags junction table (many-to-many relationship).
 */

/** Represents a tag record from the database */
interface Tag {
  id: number;
  name: string;
}

/**
 * Creates a new tag in the database.
 *
 * Inserts a single tag record with the given name. If a tag with the same
 * name already exists (UNIQUE constraint violation), throws a DuplicateError.
 *
 * SQL: INSERT INTO tags (name) VALUES (?)
 *
 * @param pool - The MySQL connection pool
 * @param name - The name for the new tag (must be unique)
 * @returns The newly created Tag object with its generated id
 * @throws DuplicateError if a tag with the same name already exists
 *
 * Validates: Requirements 8.1, 8.2
 */
export async function createTag(pool: Pool, name: string): Promise<Tag> {
  try {
    // Insert the new tag — MySQL will auto-generate the id
    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO tags (name) VALUES (?)',
      [name]
    );

    // Return the complete Tag object with the auto-generated id
    return { id: result.insertId, name };
  } catch (error: any) {
    // MySQL error code 'ER_DUP_ENTRY' indicates a UNIQUE constraint violation.
    // This happens when trying to insert a tag name that already exists.
    if (error.code === 'ER_DUP_ENTRY') {
      throw new DuplicateError('Tag', 'name', name);
    }
    // Re-throw any other unexpected database errors
    throw error;
  }
}

/**
 * Retrieves all tags from the database.
 *
 * Returns every tag record in the tags table. No filtering or pagination
 * is applied since the tag list is expected to remain manageable in size.
 *
 * SQL: SELECT id, name FROM tags
 *
 * @param pool - The MySQL connection pool
 * @returns An array of all Tag objects in the database
 *
 * Validates: Requirement 8.3
 */
export async function getAllTags(pool: Pool): Promise<Tag[]> {
  // Query all tags — RowDataPacket[] is the mysql2 type for SELECT results
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT id, name FROM tags'
  );

  // Cast the raw row data to our Tag interface
  return rows as Tag[];
}

/**
 * Finds existing tags by name or creates them if they don't exist.
 *
 * For each tag name provided:
 * 1. Attempts to INSERT the tag using INSERT IGNORE (skips if duplicate)
 * 2. Then SELECTs the tag to get its id (whether it was just created or already existed)
 *
 * This "find or create" pattern ensures all tag names exist in the database
 * and returns their complete Tag objects with ids. INSERT IGNORE silently
 * skips the insert if the UNIQUE constraint on name would be violated,
 * avoiding the need for separate existence checks.
 *
 * @param pool - The MySQL connection pool
 * @param names - Array of tag names to find or create
 * @returns An array of Tag objects for all provided names
 *
 * Validates: Requirements 2.2, 2.3
 */
export async function findOrCreateTags(pool: Pool, names: string[]): Promise<Tag[]> {
  // If no names provided, return an empty array immediately
  if (names.length === 0) {
    return [];
  }

  const tags: Tag[] = [];

  for (const name of names) {
    // INSERT IGNORE: attempts to insert the tag. If the name already exists
    // (UNIQUE constraint), the INSERT is silently skipped without error.
    await pool.execute<ResultSetHeader>(
      'INSERT IGNORE INTO tags (name) VALUES (?)',
      [name]
    );

    // SELECT the tag to get its id — this works whether the tag was just
    // created or already existed in the database
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, name FROM tags WHERE name = ?',
      [name]
    );

    // The tag is guaranteed to exist at this point (either created or found)
    if (rows.length > 0) {
      tags.push(rows[0] as Tag);
    }
  }

  return tags;
}

/**
 * Retrieves all tags associated with a specific note.
 *
 * Uses a JOIN between the tags table and the note_tags junction table
 * to find all tags linked to the given note id. This leverages the
 * many-to-many relationship stored in note_tags.
 *
 * SQL: SELECT t.id, t.name FROM tags t
 *      INNER JOIN note_tags nt ON t.id = nt.tag_id
 *      WHERE nt.note_id = ?
 *
 * @param pool - The MySQL connection pool
 * @param noteId - The id of the note whose tags to retrieve
 * @returns An array of Tag objects associated with the note
 *
 * Validates: Requirements 2.2, 2.3
 */
export async function getTagsForNote(pool: Pool, noteId: number): Promise<Tag[]> {
  // JOIN tags with note_tags to find all tags linked to this note
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT t.id, t.name FROM tags t
     INNER JOIN note_tags nt ON t.id = nt.tag_id
     WHERE nt.note_id = ?`,
    [noteId]
  );

  return rows as Tag[];
}

/**
 * Replaces all tag associations for a note with a new set of tags.
 *
 * This function implements the "replace all" strategy for updating tags:
 * 1. Delete all existing note_tags rows for the given note
 * 2. Find or create each tag in the new set
 * 3. Insert new note_tags rows linking the note to each tag
 *
 * This approach is simpler than computing a diff and ensures the note's
 * tags exactly match the provided list after the operation completes.
 *
 * @param pool - The MySQL connection pool
 * @param noteId - The id of the note whose tags to replace
 * @param tagNames - The new set of tag names to associate with the note
 *
 * Validates: Requirements 2.2, 2.3
 */
export async function replaceNoteTags(pool: Pool, noteId: number, tagNames: string[]): Promise<void> {
  // Step 1: Remove all existing tag associations for this note.
  // This clears the slate so we can insert the new set of tags.
  await pool.execute<ResultSetHeader>(
    'DELETE FROM note_tags WHERE note_id = ?',
    [noteId]
  );

  // If no new tags are provided, we're done (note has no tags)
  if (tagNames.length === 0) {
    return;
  }

  // Step 2: Ensure all tag names exist in the tags table.
  // findOrCreateTags handles both new and existing tags.
  const tags = await findOrCreateTags(pool, tagNames);

  // Step 3: Insert new associations in the note_tags junction table.
  // Each row links the note to one of its tags.
  for (const tag of tags) {
    await pool.execute<ResultSetHeader>(
      'INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)',
      [noteId, tag.id]
    );
  }
}
