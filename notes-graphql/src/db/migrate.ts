import { Pool } from 'mysql2/promise';

/**
 * Auto-migration module.
 *
 * This module runs on server startup to ensure all required database tables
 * exist. It uses CREATE TABLE IF NOT EXISTS so it is safe to run multiple
 * times — existing tables and data are never dropped or modified.
 */

/**
 * Executes all CREATE TABLE IF NOT EXISTS statements to set up the database
 * schema. Tables are created in dependency order:
 *   1. notes   — standalone, no foreign keys
 *   2. tags    — standalone, no foreign keys
 *   3. note_tags — depends on both notes and tags (foreign keys)
 *
 * @param pool - The mysql2 connection pool used to execute queries
 */
export async function runMigrations(pool: Pool): Promise<void> {
  /**
   * Notes table: stores individual note records.
   *
   * - id: unique auto-incrementing identifier
   * - title: short summary of the note (required)
   * - content: full body text of the note (required)
   * - pinned: whether the note is pinned for quick access (defaults to false)
   * - created_at: timestamp when the note was first created
   * - updated_at: timestamp that auto-updates whenever the row is modified
   */
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS notes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      pinned BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  /**
   * Tags table: stores reusable tag labels.
   *
   * - id: unique auto-incrementing identifier
   * - name: the tag label text (must be unique across all tags)
   */
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS tags (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE
    )
  `);

  /**
   * Note-tags junction table: many-to-many relationship between notes and tags.
   *
   * - note_id: references the notes table
   * - tag_id: references the tags table
   * - Composite primary key ensures a tag can only be linked to a note once
   * - ON DELETE CASCADE: when a note or tag is deleted, the association is
   *   automatically removed (no orphan rows)
   */
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS note_tags (
      note_id INT NOT NULL,
      tag_id INT NOT NULL,
      PRIMARY KEY (note_id, tag_id),
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )
  `);
}
