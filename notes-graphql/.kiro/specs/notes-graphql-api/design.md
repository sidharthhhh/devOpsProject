# Design Document

## Overview

A backend GraphQL API for managing notes with tagging, search, and pinning capabilities. Built with Node.js, TypeScript, Express, and Apollo Server. Uses MySQL with raw SQL queries via the mysql2 driver. The server auto-migrates database tables on startup and exposes a single `/graphql` endpoint.

## Architecture

The application follows a layered architecture with clear separation of concerns:

```
Client (GraphQL requests)
       │
       ▼
┌─────────────────────┐
│  Express + Apollo   │  ← HTTP layer, GraphQL endpoint
│     (app.ts)        │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│   GraphQL Layer     │  ← Schema (type defs) + Resolvers
│  graphql/schema/    │
│  graphql/resolvers/ │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│   Services Layer    │  ← Business logic, raw SQL queries
│    services/        │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│   Database Layer    │  ← Connection pool, migrations
│       db/           │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│       MySQL         │
└─────────────────────┘
```

**Data flow:** GraphQL request → Apollo Server parses and validates → Resolver calls service function → Service executes raw SQL via connection pool → Result returned up the chain.

## Technology Stack

- **Runtime:** Node.js with TypeScript
- **HTTP Framework:** Express
- **GraphQL Server:** Apollo Server (apollo-server-express)
- **Database:** MySQL with mysql2 driver (promise-based API)
- **Environment:** dotenv for .env file loading
- **No ORM:** Raw SQL queries for all database operations
- **No Auth:** No authentication or authorization layer

## Project Structure

```
src/
├── config/
│   └── env.ts              # Environment variable loading and validation
├── db/
│   ├── connection.ts       # MySQL connection pool creation
│   └── migrate.ts          # Auto-migration logic (CREATE TABLE IF NOT EXISTS)
├── graphql/
│   ├── schema/
│   │   └── typeDefs.ts     # GraphQL type definitions (SDL)
│   └── resolvers/
│       ├── index.ts        # Resolver map combining all resolvers
│       ├── noteResolvers.ts    # Note query and mutation resolvers
│       └── tagResolvers.ts     # Tag query and mutation resolvers
├── services/
│   ├── noteService.ts      # Note CRUD operations (raw SQL)
│   └── tagService.ts       # Tag operations (raw SQL)
├── utils/
│   └── errors.ts           # Custom error helpers
├── app.ts                  # Express + Apollo Server setup
└── server.ts               # Entry point: load env, migrate, start server
```

## Data Models

### Database Schema

```sql
-- Notes table: stores individual note records
CREATE TABLE IF NOT EXISTS notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tags table: stores reusable tag labels
CREATE TABLE IF NOT EXISTS tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
);

-- Junction table: many-to-many relationship between notes and tags
CREATE TABLE IF NOT EXISTS note_tags (
  note_id INT NOT NULL,
  tag_id INT NOT NULL,
  PRIMARY KEY (note_id, tag_id),
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
```

### TypeScript Interfaces

```typescript
// Represents a note record from the database
interface Note {
  id: number;
  title: string;
  content: string;
  pinned: boolean;
  created_at: string;   // ISO timestamp string
  updated_at: string;   // ISO timestamp string
  tags?: Tag[];         // Populated when resolving relationships
}

// Represents a tag record from the database
interface Tag {
  id: number;
  name: string;
}

// Input for creating a note
interface CreateNoteInput {
  title: string;
  content: string;
  tags?: string[];      // Tag names (created if they don't exist)
}

// Input for updating a note
interface UpdateNoteInput {
  id: number;
  title?: string;
  content?: string;
  tags?: string[];      // Replaces all existing tag associations
}

// Pagination parameters
interface PaginationInput {
  limit?: number;
  offset?: number;
}
```

## GraphQL Schema

```graphql
type Note {
  id: Int!
  title: String!
  content: String!
  pinned: Boolean!
  created_at: String!
  updated_at: String!
  tags: [Tag!]!
}

type Tag {
  id: Int!
  name: String!
}

type Query {
  # Retrieve notes with optional pagination and pinned filter
  notes(limit: Int, offset: Int, pinned: Boolean): [Note!]!

  # Retrieve a single note by ID
  note(id: Int!): Note!

  # Retrieve all pinned notes
  pinnedNotes: [Note!]!

  # Search notes by title or content (case-insensitive partial match)
  searchNotes(query: String!): [Note!]!

  # Retrieve all tags
  tags: [Tag!]!
}

type Mutation {
  # Create a new note with optional tags
  createNote(title: String!, content: String!, tags: [String!]): Note!

  # Update an existing note's fields and/or tags
  updateNote(id: Int!, title: String, content: String, tags: [String!]): Note!

  # Delete a note by ID (returns the deleted note)
  deleteNote(id: Int!): Note!

  # Pin a note (set pinned = true)
  pinNote(id: Int!): Note!

  # Unpin a note (set pinned = false)
  unpinNote(id: Int!): Note!

  # Create a new tag
  createTag(name: String!): Tag!
}
```

## Components and Interfaces

### Config Module (`src/config/env.ts`)

```typescript
// Loads environment variables from .env file and exports typed config
interface EnvConfig {
  DB_HOST: string;
  DB_PORT: number;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_NAME: string;
  PORT: number;
}

export function loadConfig(): EnvConfig;
```

### Database Module (`src/db/connection.ts`)

```typescript
import { Pool } from 'mysql2/promise';

// Creates and exports a MySQL connection pool
export function createPool(config: EnvConfig): Pool;
export function getPool(): Pool;
```

### Migration Module (`src/db/migrate.ts`)

```typescript
// Runs CREATE TABLE IF NOT EXISTS for all required tables
// Called once on server startup
export async function runMigrations(pool: Pool): Promise<void>;
```

### Note Service (`src/services/noteService.ts`)

```typescript
// All functions accept the pool and execute raw SQL queries

export async function createNote(
  pool: Pool, title: string, content: string, tagNames?: string[]
): Promise<Note>;

export async function getNotes(
  pool: Pool, options?: { limit?: number; offset?: number; pinned?: boolean }
): Promise<Note[]>;

export async function getNoteById(pool: Pool, id: number): Promise<Note>;

export async function getPinnedNotes(pool: Pool): Promise<Note[]>;

export async function searchNotes(pool: Pool, query: string): Promise<Note[]>;

export async function updateNote(
  pool: Pool, id: number, fields: { title?: string; content?: string; tags?: string[] }
): Promise<Note>;

export async function deleteNote(pool: Pool, id: number): Promise<Note>;

export async function pinNote(pool: Pool, id: number): Promise<Note>;

export async function unpinNote(pool: Pool, id: number): Promise<Note>;
```

### Tag Service (`src/services/tagService.ts`)

```typescript
export async function createTag(pool: Pool, name: string): Promise<Tag>;

export async function getAllTags(pool: Pool): Promise<Tag[]>;

export async function findOrCreateTags(pool: Pool, names: string[]): Promise<Tag[]>;

export async function getTagsForNote(pool: Pool, noteId: number): Promise<Tag[]>;

export async function replaceNoteTags(pool: Pool, noteId: number, tagNames: string[]): Promise<void>;
```

### Error Helpers (`src/utils/errors.ts`)

```typescript
// Custom error class for "not found" scenarios
export class NotFoundError extends Error {
  constructor(resource: string, id: number);
}

// Custom error class for duplicate/conflict scenarios
export class DuplicateError extends Error {
  constructor(resource: string, field: string, value: string);
}
```

## Key Implementation Details

### Startup Sequence (`src/server.ts`)

1. Load environment variables via dotenv
2. Create MySQL connection pool
3. Run auto-migrations (CREATE TABLE IF NOT EXISTS)
4. Initialize Express app with Apollo Server
5. Start listening on configured PORT
6. If DB connection fails, log error and call `process.exit(1)`

### Tag Handling on Note Create/Update

When creating or updating a note with tags:
1. For each tag name, check if it exists in the `tags` table
2. If it doesn't exist, INSERT it
3. For updates, DELETE all existing `note_tags` rows for the note
4. INSERT new `note_tags` rows for each tag association

This uses a "find or create" pattern implemented in `tagService.findOrCreateTags()`.

### Search Implementation

The `searchNotes` query uses SQL LIKE with wildcards for partial matching:

```sql
SELECT * FROM notes
WHERE title LIKE ? OR content LIKE ?
ORDER BY created_at DESC
```

The query parameter is wrapped as `%${query}%` for partial matching. MySQL's default collation (utf8mb4_general_ci) provides case-insensitive matching.

### Pagination

The `notes` query supports limit/offset pagination:

```sql
SELECT * FROM notes
ORDER BY created_at DESC
LIMIT ? OFFSET ?
```

Default behavior when no limit/offset provided: return all notes.

### Error Handling

- **Not found:** Service functions throw `NotFoundError` when a note/tag ID doesn't exist. Resolvers let Apollo Server convert these to GraphQL errors.
- **Duplicate tag:** `createTag` throws `DuplicateError` when the tag name already exists (caught via MySQL duplicate key error).
- **DB connection failure:** Caught in `server.ts` startup, logged, and process exits.

## Error Handling

### Error Categories

| Error Type | Trigger | HTTP/GraphQL Behavior |
|---|---|---|
| NotFoundError | Note or tag ID doesn't exist | GraphQL error with descriptive message |
| DuplicateError | Tag name already exists | GraphQL error with conflict message |
| DB Connection Failure | MySQL unreachable on startup | Log error, process.exit(1) |
| Invalid Input | Missing required fields | Apollo Server validation error (automatic) |

### Error Flow

1. **Service layer** throws typed errors (`NotFoundError`, `DuplicateError`)
2. **Resolver layer** lets errors propagate (no try/catch needed for expected errors)
3. **Apollo Server** catches unhandled errors and formats them as GraphQL error responses
4. **Startup errors** are caught in `server.ts` and terminate the process

### Error Messages

- Not found: `"Note with id {id} not found"` or `"Tag with id {id} not found"`
- Duplicate tag: `"Tag with name '{name}' already exists"`
- Connection failure: `"Failed to connect to database: {error.message}"`

## Testing Strategy

Since this project does not include a test framework, correctness is validated through:

1. **Manual GraphQL Playground testing** — Apollo Server provides an interactive playground at `/graphql`
2. **Schema validation** — Apollo Server validates all incoming queries against the type definitions
3. **Database constraints** — MySQL enforces NOT NULL, UNIQUE, and FOREIGN KEY constraints
4. **Error propagation** — Typed errors ensure consistent error responses

The correctness properties below define the expected behavior that would be validated if property-based tests were added in the future.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Create note returns complete and correct object

*For any* valid title and content strings, creating a note SHALL return an object with the provided title and content, pinned set to false, and both created_at and updated_at set to timestamps within a reasonable window of the current time.

**Validates: Requirements 2.1, 2.4, 2.5**

### Property 2: Tag association on note creation

*For any* set of tag names provided during note creation, all tags SHALL exist in the tags table after the operation (created if new, reused if existing), and the created note SHALL be associated with exactly those tags via the note_tags table.

**Validates: Requirements 2.2, 2.3**

### Property 3: Notes list sorting invariant

*For any* set of notes in the database, querying the notes list SHALL return them in strictly non-increasing order of created_at timestamps.

**Validates: Requirements 3.1**

### Property 4: Pagination correctness

*For any* valid limit and offset values where limit > 0 and offset >= 0, the notes query SHALL return at most `limit` results, skipping the first `offset` notes from the full sorted list.

**Validates: Requirements 3.2**

### Property 5: Pinned filter correctness

*For any* set of notes with mixed pinned status, querying with a pinned filter (or using the pinnedNotes query) SHALL return only notes whose pinned field matches the filter value, sorted by created_at descending.

**Validates: Requirements 3.3, 3.6**

### Property 6: Note lookup returns complete data

*For any* note that exists in the database, querying by its ID SHALL return the note with all fields matching the stored values, including all associated tags.

**Validates: Requirements 3.4**

### Property 7: Update note correctness

*For any* existing note and any valid update fields (title, content), the updateNote mutation SHALL return a note with the updated fields applied, unchanged fields preserved, and updated_at set to a timestamp more recent than the original.

**Validates: Requirements 4.1, 4.3**

### Property 8: Update replaces tag associations

*For any* existing note with tags and any new set of tag names, updating the note's tags SHALL result in the note being associated with exactly the new set of tags, with no remnants of previous associations.

**Validates: Requirements 4.2**

### Property 9: Delete note correctness

*For any* existing note (with or without tags), deleting it SHALL return the complete note object, remove the note from the notes table, and remove all associated records from the note_tags table.

**Validates: Requirements 5.1, 5.2**

### Property 10: Pin/unpin round-trip

*For any* existing note, pinning it SHALL set pinned to true, unpinning it SHALL set pinned to false, and both operations SHALL update the updated_at timestamp to a more recent value.

**Validates: Requirements 6.1, 6.2, 6.3**

### Property 11: Search filter correctness

*For any* query string that is a substring of a note's title or content, that note SHALL appear in the searchNotes results. Conversely, for any note in the search results, the query string SHALL be a substring of its title or content.

**Validates: Requirements 7.1**

### Property 12: Search case-insensitivity

*For any* query string, searching with different case variations of that string (uppercase, lowercase, mixed) SHALL return the same set of notes.

**Validates: Requirements 7.2**

### Property 13: Search results sorting

*For any* search query that returns multiple results, the results SHALL be in strictly non-increasing order of created_at timestamps.

**Validates: Requirements 7.3**

### Property 14: Tag creation correctness

*For any* valid unique tag name, creating a tag SHALL return a Tag object with the provided name and a positive integer ID.

**Validates: Requirements 8.1**

### Property 15: Tags query completeness

*For any* set of tags that have been created, the tags query SHALL return all of them with no omissions.

**Validates: Requirements 8.3**
