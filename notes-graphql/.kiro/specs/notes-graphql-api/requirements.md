# Requirements Document

## Introduction

A backend-only GraphQL API for managing notes with tagging, search, and pinning capabilities. The system is built with Node.js, TypeScript, Express, and Apollo Server, using MySQL with raw SQL queries (mysql2 driver). It runs locally without authentication, frontend, or containerization. The server auto-migrates the database schema on startup.

## Glossary

- **API_Server**: The Node.js/Express application hosting the Apollo Server GraphQL endpoint
- **Note**: A text record containing a title, content, pinned status, and timestamps
- **Tag**: A reusable label that can be associated with multiple notes
- **Note_Tag_Association**: The many-to-many relationship between notes and tags stored in the note_tags junction table
- **Database**: The MySQL database instance (notes_db) accessed via the mysql2 driver using raw SQL
- **GraphQL_Schema**: The type definitions and resolvers that define the API's query and mutation operations
- **Pagination**: A limit/offset mechanism for controlling the number of results returned

## Requirements

### Requirement 1: Database Auto-Migration

**User Story:** As a developer, I want the server to automatically create the required database tables on startup, so that I do not need to run manual migration scripts.

#### Acceptance Criteria

1. WHEN the API_Server starts, THE API_Server SHALL check for the existence of the notes, tags, and note_tags tables in the Database.
2. WHEN the required tables do not exist in the Database, THE API_Server SHALL create the notes table with columns: id (INT AUTO_INCREMENT PRIMARY KEY), title (VARCHAR), content (TEXT), pinned (BOOLEAN default false), created_at (TIMESTAMP), updated_at (TIMESTAMP).
3. WHEN the required tables do not exist in the Database, THE API_Server SHALL create the tags table with columns: id (INT AUTO_INCREMENT PRIMARY KEY), name (VARCHAR UNIQUE).
4. WHEN the required tables do not exist in the Database, THE API_Server SHALL create the note_tags table with columns: note_id (FOREIGN KEY referencing notes.id), tag_id (FOREIGN KEY referencing tags.id), and a composite primary key of (note_id, tag_id).
5. IF the Database connection fails on startup, THEN THE API_Server SHALL log the connection error and terminate the process.

### Requirement 2: Create Note

**User Story:** As a user, I want to create a new note with a title, content, and optional tags, so that I can store information.

#### Acceptance Criteria

1. WHEN a createNote mutation is received with title and content fields, THE GraphQL_Schema SHALL insert a new record into the notes table and return the full Note object including id, title, content, pinned status, created_at, and updated_at.
2. WHEN a createNote mutation includes tag names that do not exist in the tags table, THE GraphQL_Schema SHALL create the new Tag records in the tags table before creating the Note_Tag_Association.
3. WHEN a createNote mutation includes tag names that already exist in the tags table, THE GraphQL_Schema SHALL reuse the existing Tag records and create the Note_Tag_Association.
4. THE GraphQL_Schema SHALL set the pinned field to false by default when creating a new Note.
5. THE GraphQL_Schema SHALL set created_at and updated_at to the current timestamp when creating a new Note.

### Requirement 3: Read Notes

**User Story:** As a user, I want to retrieve notes individually or as a list, so that I can view my stored information.

#### Acceptance Criteria

1. WHEN a notes query is received, THE GraphQL_Schema SHALL return a list of Note objects sorted by created_at in descending order.
2. WHEN a notes query includes limit and offset parameters, THE GraphQL_Schema SHALL apply Pagination to the results using the provided limit and offset values.
3. WHEN a notes query includes a pinned filter parameter, THE GraphQL_Schema SHALL return only Note objects matching the specified pinned status.
4. WHEN a note query is received with an id parameter, THE GraphQL_Schema SHALL return the single Note object matching the provided id, including associated Tag records.
5. IF a note query is received with an id that does not exist in the Database, THEN THE GraphQL_Schema SHALL return an appropriate error indicating the Note was not found.
6. WHEN a pinnedNotes query is received, THE GraphQL_Schema SHALL return all Note objects where the pinned field is true, sorted by created_at in descending order.

### Requirement 4: Update Note

**User Story:** As a user, I want to update an existing note's title, content, or tags, so that I can keep my information current.

#### Acceptance Criteria

1. WHEN an updateNote mutation is received with a valid note id, THE GraphQL_Schema SHALL update the specified fields in the notes table and return the full updated Note object.
2. WHEN an updateNote mutation includes updated tag names, THE GraphQL_Schema SHALL replace the existing Note_Tag_Association records with the new set of tags.
3. WHEN an updateNote mutation is processed, THE GraphQL_Schema SHALL update the updated_at timestamp to the current time.
4. IF an updateNote mutation is received with an id that does not exist in the Database, THEN THE GraphQL_Schema SHALL return an appropriate error indicating the Note was not found.

### Requirement 5: Delete Note

**User Story:** As a user, I want to delete a note, so that I can remove information I no longer need.

#### Acceptance Criteria

1. WHEN a deleteNote mutation is received with a valid note id, THE GraphQL_Schema SHALL remove the Note record from the notes table and return the full Note object that was deleted.
2. WHEN a Note is deleted, THE GraphQL_Schema SHALL remove all associated Note_Tag_Association records from the note_tags table.
3. IF a deleteNote mutation is received with an id that does not exist in the Database, THEN THE GraphQL_Schema SHALL return an appropriate error indicating the Note was not found.

### Requirement 6: Pin and Unpin Notes

**User Story:** As a user, I want to pin and unpin notes, so that I can mark important notes for quick access.

#### Acceptance Criteria

1. WHEN a pinNote mutation is received with a valid note id, THE GraphQL_Schema SHALL set the pinned field to true for the specified Note and return the full updated Note object.
2. WHEN an unpinNote mutation is received with a valid note id, THE GraphQL_Schema SHALL set the pinned field to false for the specified Note and return the full updated Note object.
3. WHEN a pinNote or unpinNote mutation is processed, THE GraphQL_Schema SHALL update the updated_at timestamp to the current time.
4. IF a pinNote or unpinNote mutation is received with an id that does not exist in the Database, THEN THE GraphQL_Schema SHALL return an appropriate error indicating the Note was not found.

### Requirement 7: Search Notes

**User Story:** As a user, I want to search notes by title or content, so that I can find specific information quickly.

#### Acceptance Criteria

1. WHEN a searchNotes query is received with a query parameter, THE GraphQL_Schema SHALL return all Note objects where the title or content contains the query string using partial matching (SQL LIKE with wildcards).
2. THE GraphQL_Schema SHALL perform case-insensitive matching when executing the searchNotes query.
3. WHEN the searchNotes query returns results, THE GraphQL_Schema SHALL sort the results by created_at in descending order.
4. WHEN the searchNotes query matches zero records, THE GraphQL_Schema SHALL return an empty list.

### Requirement 8: Tag Management

**User Story:** As a user, I want to manage tags independently, so that I can organize and categorize my notes.

#### Acceptance Criteria

1. WHEN a createTag mutation is received with a name, THE GraphQL_Schema SHALL insert a new record into the tags table and return the Tag object.
2. IF a createTag mutation is received with a name that already exists in the tags table, THEN THE GraphQL_Schema SHALL return an appropriate error indicating the Tag name is already taken.
3. WHEN a tags query is received, THE GraphQL_Schema SHALL return all Tag records from the tags table.

### Requirement 9: Environment Configuration

**User Story:** As a developer, I want the server to read configuration from environment variables, so that I can easily change settings without modifying code.

#### Acceptance Criteria

1. THE API_Server SHALL read database connection parameters (host, port, user, password, database name) from environment variables.
2. THE API_Server SHALL read the server port from the PORT environment variable.
3. THE API_Server SHALL support loading environment variables from a .env file in the project root.

### Requirement 10: Project Structure and Code Quality

**User Story:** As a developer, I want the codebase to follow a clean, well-organized structure with clear comments, so that the project is easy to understand and maintain.

#### Acceptance Criteria

1. THE API_Server SHALL organize source code into the following directory structure: config/, db/, graphql/schema/, graphql/resolvers/, services/, and utils/ under the src/ directory.
2. THE API_Server SHALL separate concerns by placing database logic in the services/ directory and GraphQL definitions in the graphql/ directory.
3. THE API_Server SHALL include descriptive comments explaining the purpose of modules, functions, and complex logic.
