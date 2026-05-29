# Implementation Plan: Notes GraphQL API

## Overview

Build a complete GraphQL API for managing notes with tagging, search, and pinning capabilities from scratch. The implementation uses TypeScript, Express, Apollo Server, and mysql2 with raw SQL queries. The server auto-migrates database tables on startup and exposes a single `/graphql` endpoint. Code is beginner-friendly with descriptive comments throughout.

## Tasks

- [x] 1. Initialize project and configure tooling
  - [x] 1.1 Create package.json with dependencies and scripts
    - Initialize with `name`, `version`, `scripts` (dev, build, start)
    - Add dependencies: express, apollo-server-express, graphql, mysql2, dotenv
    - Add devDependencies: typescript, ts-node, nodemon, @types/express, @types/node
    - _Requirements: 10.1_

  - [x] 1.2 Create tsconfig.json for TypeScript configuration
    - Set target to ES2020, module to commonjs, outDir to dist/
    - Enable strict mode, esModuleInterop, resolveJsonModule
    - Set rootDir to src/
    - _Requirements: 10.1_

  - [x] 1.3 Create .env file and .gitignore
    - Add .env with DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, PORT placeholders
    - Add .gitignore with node_modules/, dist/, .env entries
    - _Requirements: 9.1, 9.2, 9.3_

- [x] 2. Implement configuration and database layer
  - [x] 2.1 Create src/config/env.ts — environment variable loader
    - Import and call dotenv.config()
    - Export a loadConfig() function that reads DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, PORT from process.env
    - Include default values for PORT (4000) and DB_PORT (3306)
    - Add comments explaining each config field
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 2.2 Create src/db/connection.ts — MySQL connection pool
    - Import mysql2/promise and the config module
    - Export createPool() that creates a mysql2 pool with the loaded config
    - Export getPool() that returns the existing pool instance
    - Add comments explaining connection pooling
    - _Requirements: 1.1, 10.2_

  - [x] 2.3 Create src/db/migrate.ts — auto-migration logic
    - Export runMigrations(pool) that executes CREATE TABLE IF NOT EXISTS for notes, tags, and note_tags tables
    - Use the exact SQL schema from the design (INT AUTO_INCREMENT, VARCHAR, TEXT, BOOLEAN, TIMESTAMP, FOREIGN KEYS)
    - Add comments explaining each table's purpose
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 3. Implement utility and service layers
  - [x] 3.1 Create src/utils/errors.ts — custom error classes
    - Implement NotFoundError class extending Error with resource name and id
    - Implement DuplicateError class extending Error with resource, field, and value
    - Add comments explaining when each error is used
    - _Requirements: 3.5, 4.4, 5.3, 6.4, 8.2_

  - [x] 3.2 Create src/services/tagService.ts — tag database operations
    - Implement createTag(pool, name) — INSERT into tags, throw DuplicateError on duplicate
    - Implement getAllTags(pool) — SELECT all tags
    - Implement findOrCreateTags(pool, names) — for each name, INSERT IGNORE or find existing
    - Implement getTagsForNote(pool, noteId) — SELECT tags via JOIN on note_tags
    - Implement replaceNoteTags(pool, noteId, tagNames) — DELETE existing associations, INSERT new ones
    - Use raw SQL with parameterized queries throughout
    - Add comments explaining each function's purpose and SQL logic
    - _Requirements: 2.2, 2.3, 8.1, 8.2, 8.3_

  - [x] 3.3 Create src/services/noteService.ts — note database operations
    - Implement createNote(pool, title, content, tagNames?) — INSERT note, call findOrCreateTags, link via note_tags, return full note with tags
    - Implement getNotes(pool, options?) — SELECT with optional LIMIT/OFFSET and pinned filter, ORDER BY created_at DESC
    - Implement getNoteById(pool, id) — SELECT single note, throw NotFoundError if not found, include tags
    - Implement getPinnedNotes(pool) — SELECT WHERE pinned = true, ORDER BY created_at DESC
    - Implement searchNotes(pool, query) — SELECT WHERE title LIKE or content LIKE with %query%, ORDER BY created_at DESC
    - Implement updateNote(pool, id, fields) — UPDATE specified fields, replace tags if provided, return updated note
    - Implement deleteNote(pool, id) — fetch note first, DELETE from notes (CASCADE handles note_tags), return deleted note
    - Implement pinNote(pool, id) and unpinNote(pool, id) — UPDATE pinned field, return updated note
    - Use raw SQL with parameterized queries throughout
    - Add comments explaining each function's purpose and SQL logic
    - _Requirements: 2.1, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 7.4_

- [x] 4. Checkpoint - Verify service layer compiles
  - Ensure all files compile without TypeScript errors, ask the user if questions arise.

- [x] 5. Implement GraphQL schema and resolvers
  - [x] 5.1 Create src/graphql/schema/typeDefs.ts — GraphQL type definitions
    - Define Note type with id, title, content, pinned, created_at, updated_at, tags fields
    - Define Tag type with id and name fields
    - Define Query type with notes, note, pinnedNotes, searchNotes, tags operations
    - Define Mutation type with createNote, updateNote, deleteNote, pinNote, unpinNote, createTag operations
    - Use gql tag from apollo-server-express
    - Add comments explaining each type and operation
    - _Requirements: 2.1, 3.1, 3.4, 3.6, 4.1, 5.1, 6.1, 6.2, 7.1, 8.1, 8.3_

  - [x] 5.2 Create src/graphql/resolvers/noteResolvers.ts — note query and mutation resolvers
    - Implement Query resolvers: notes, note, pinnedNotes, searchNotes
    - Implement Mutation resolvers: createNote, updateNote, deleteNote, pinNote, unpinNote
    - Each resolver calls the corresponding noteService function, passing the pool from context
    - Add comments explaining each resolver's purpose
    - _Requirements: 2.1, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 7.4_

  - [x] 5.3 Create src/graphql/resolvers/tagResolvers.ts — tag query and mutation resolvers
    - Implement Query resolvers: tags
    - Implement Mutation resolvers: createTag
    - Each resolver calls the corresponding tagService function, passing the pool from context
    - Add comments explaining each resolver's purpose
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 5.4 Create src/graphql/resolvers/index.ts — resolver map combiner
    - Import noteResolvers and tagResolvers
    - Merge Query and Mutation resolvers into a single resolver map
    - Export the combined resolvers object
    - Add comments explaining the merge pattern
    - _Requirements: 10.2_

- [x] 6. Wire everything together — app and server entry point
  - [x] 6.1 Create src/app.ts — Express + Apollo Server setup
    - Import express, ApolloServer, typeDefs, resolvers, and getPool
    - Create an async function that initializes ApolloServer with typeDefs, resolvers, and context (pool)
    - Apply Apollo middleware to Express at the /graphql path
    - Export the setup function
    - Add comments explaining the Apollo + Express integration
    - _Requirements: 10.1, 10.2_

  - [x] 6.2 Create src/server.ts — application entry point
    - Import loadConfig, createPool, runMigrations, and the app setup function
    - Implement startup sequence: load config → create pool → run migrations → start Express server
    - Wrap in try/catch: log error and call process.exit(1) on DB connection failure
    - Log success message with the running port
    - Add comments explaining the startup sequence
    - _Requirements: 1.1, 1.5, 9.1, 9.2, 9.3_

- [x] 7. Final checkpoint - Ensure project compiles and is ready to run
  - Ensure all TypeScript files compile without errors, ask the user if questions arise.

## Notes

- No test tasks are included per user preference — correctness is validated via Apollo Playground and database constraints
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation of the build
- All code should include beginner-friendly comments explaining purpose and logic
- The project is built from scratch in an empty workspace

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "3.1"] },
    { "id": 3, "tasks": ["2.3", "3.2"] },
    { "id": 4, "tasks": ["3.3"] },
    { "id": 5, "tasks": ["5.1", "5.2", "5.3"] },
    { "id": 6, "tasks": ["5.4"] },
    { "id": 7, "tasks": ["6.1"] },
    { "id": 8, "tasks": ["6.2"] }
  ]
}
```
