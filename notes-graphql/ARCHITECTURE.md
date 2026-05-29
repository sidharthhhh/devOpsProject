# Architecture & System Workflow

## Notes GraphQL API — System Architecture Document

---

## High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                 │
│                                                                     │
│   Apollo Sandbox / Postman / curl / Any GraphQL Client              │
│                                                                     │
│         POST http://localhost:4000/graphql                           │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               │ HTTP Request (JSON body with query/mutation)
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       HTTP LAYER (Express)                           │
│                                                                     │
│   src/server.ts  →  src/app.ts  →  Express Application              │
│                                                                     │
│   • Listens on PORT 4000                                            │
│   • Routes all /graphql requests to Apollo Server middleware        │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               │ Parsed GraphQL Operation
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    GRAPHQL LAYER (Apollo Server)                     │
│                                                                     │
│   src/graphql/schema/typeDefs.ts     — Schema (types, queries,      │
│                                        mutations)                   │
│   src/graphql/resolvers/index.ts     — Combined resolver map        │
│   src/graphql/resolvers/noteResolvers.ts  — Note resolvers          │
│   src/graphql/resolvers/tagResolvers.ts   — Tag resolvers           │
│                                                                     │
│   • Validates query against schema                                  │
│   • Routes to correct resolver function                             │
│   • Passes context (db pool) to resolvers                           │
│   • Formats response / errors                                       │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               │ Function call with pool + args
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      SERVICE LAYER (Business Logic)                  │
│                                                                     │
│   src/services/noteService.ts                                       │
│     • createNote, getNotes, getNoteById, getPinnedNotes             │
│     • searchNotes, updateNote, deleteNote, pinNote, unpinNote       │
│                                                                     │
│   src/services/tagService.ts                                        │
│     • createTag, getAllTags, findOrCreateTags                        │
│     • getTagsForNote, replaceNoteTags                               │
│                                                                     │
│   src/utils/errors.ts                                               │
│     • NotFoundError, DuplicateError                                 │
│                                                                     │
│   • Executes raw SQL with parameterized queries                     │
│   • Handles business rules (find-or-create, replace-all tags)       │
│   • Throws typed errors for not-found / duplicate scenarios         │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               │ pool.execute(sql, params)
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     DATABASE LAYER (mysql2)                          │
│                                                                     │
│   src/db/connection.ts  — Connection pool (10 connections max)      │
│   src/db/migrate.ts     — Auto-migration on startup                 │
│   src/config/env.ts     — Environment variable loader               │
│                                                                     │
│   • Manages connection pooling (reuse, queue, limits)               │
│   • Creates tables on first run (CREATE TABLE IF NOT EXISTS)        │
│   • Reads credentials from .env file                                │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               │ TCP connection (port 3306)
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        MySQL DATABASE                                │
│                                                                     │
│   Database: notes_db                                                │
│                                                                     │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐     │
│   │    notes     │    │    tags      │    │    note_tags      │     │
│   ├──────────────┤    ├──────────────┤    ├──────────────────┤     │
│   │ id (PK)      │    │ id (PK)      │    │ note_id (FK→notes)│    │
│   │ title        │    │ name (UNIQUE)│    │ tag_id (FK→tags)  │    │
│   │ content      │    └──────────────┘    │ PK(note_id,tag_id)│    │
│   │ pinned       │                        └──────────────────┘     │
│   │ created_at   │                                                  │
│   │ updated_at   │         ON DELETE CASCADE                        │
│   └──────────────┘         (both foreign keys)                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Server Startup Workflow

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐     ┌──────────────┐     ┌─────────────┐
│  Load .env  │────▶│ Create Pool  │────▶│ Run Migrations│────▶│ Create App   │────▶│ Listen:4000 │
│  (dotenv)   │     │ (mysql2)     │     │ (CREATE TABLE)│     │ (Apollo+Exp) │     │ (HTTP ready)│
└─────────────┘     └──────────────┘     └───────────────┘     └──────────────┘     └─────────────┘
       │                    │                     │                     │                    │
       │                    │                     │                     │                    │
   config/env.ts      db/connection.ts       db/migrate.ts           app.ts            server.ts
```

**Failure handling:** If any step fails (especially DB connection), the error is logged and `process.exit(1)` is called.

---

## Request Lifecycle (Query/Mutation Flow)

```
Client sends POST /graphql
        │
        ▼
┌─────────────────────────────┐
│ 1. Express receives request │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ 2. Apollo Server parses     │
│    GraphQL query/mutation    │
│    and validates against     │
│    schema (typeDefs.ts)      │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ 3. Apollo routes to the     │
│    matching resolver         │
│    (noteResolvers.ts or     │
│     tagResolvers.ts)         │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ 4. Resolver calls service   │
│    function with pool +     │
│    parsed arguments          │
│    (noteService.ts or       │
│     tagService.ts)           │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ 5. Service executes raw SQL │
│    via pool.execute()        │
│    (parameterized queries)   │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ 6. MySQL processes query    │
│    and returns result rows   │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ 7. Service maps rows to     │
│    typed objects (Note/Tag)  │
│    and returns to resolver   │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ 8. Apollo formats response  │
│    as JSON and sends back    │
│    to client                 │
└─────────────────────────────┘
```

---

## Data Flow Diagrams

### Create Note with Tags

```
createNote(title, content, tags: ["work", "urgent"])
        │
        ▼
┌────────────────────────────────────────────────────┐
│ noteService.createNote()                           │
│                                                    │
│  1. INSERT INTO notes (title, content)             │
│     → returns noteId                               │
│                                                    │
│  2. tagService.findOrCreateTags(["work","urgent"]) │
│     │                                              │
│     ├─ INSERT IGNORE INTO tags (name) "work"       │
│     ├─ SELECT id FROM tags WHERE name = "work"     │
│     ├─ INSERT IGNORE INTO tags (name) "urgent"     │
│     └─ SELECT id FROM tags WHERE name = "urgent"   │
│     → returns [{id:1,name:"work"},{id:2,...}]      │
│                                                    │
│  3. INSERT INTO note_tags (noteId, 1)              │
│     INSERT INTO note_tags (noteId, 2)              │
│                                                    │
│  4. getNoteById(noteId)                            │
│     → returns full Note with tags                  │
└────────────────────────────────────────────────────┘
```

### Update Note Tags (Replace Strategy)

```
updateNote(id: 5, tags: ["personal", "new-tag"])
        │
        ▼
┌────────────────────────────────────────────────────┐
│ noteService.updateNote()                           │
│                                                    │
│  1. getNoteById(5) → verify exists                 │
│                                                    │
│  2. tagService.replaceNoteTags(5, [...])           │
│     │                                              │
│     ├─ DELETE FROM note_tags WHERE note_id = 5     │
│     │  (removes ALL old associations)              │
│     │                                              │
│     ├─ findOrCreateTags(["personal","new-tag"])    │
│     │  (ensures tags exist in tags table)          │
│     │                                              │
│     └─ INSERT INTO note_tags (5, tagId) × 2       │
│        (creates new associations)                  │
│                                                    │
│  3. getNoteById(5) → return updated note           │
└────────────────────────────────────────────────────┘
```

### Delete Note (Cascade)

```
deleteNote(id: 3)
        │
        ▼
┌────────────────────────────────────────────────────┐
│ noteService.deleteNote()                           │
│                                                    │
│  1. getNoteById(3) → fetch note + tags             │
│     (save for return value)                        │
│                                                    │
│  2. DELETE FROM notes WHERE id = 3                 │
│     │                                              │
│     └─ CASCADE automatically deletes:              │
│        DELETE FROM note_tags WHERE note_id = 3     │
│                                                    │
│  3. Return the saved note object                   │
│     (tags table is NOT affected — tags are         │
│      reusable and persist independently)           │
└────────────────────────────────────────────────────┘
```

### Search Notes

```
searchNotes(query: "meeting")
        │
        ▼
┌────────────────────────────────────────────────────┐
│ noteService.searchNotes()                          │
│                                                    │
│  1. Build pattern: "%meeting%"                     │
│                                                    │
│  2. SELECT * FROM notes                            │
│     WHERE title LIKE "%meeting%"                   │
│        OR content LIKE "%meeting%"                 │
│     ORDER BY created_at DESC                       │
│                                                    │
│  3. For each result row:                           │
│     getTagsForNote(row.id)                         │
│     → JOIN tags + note_tags                        │
│                                                    │
│  4. Return array of Note objects with tags         │
│     (empty array if no matches)                    │
└────────────────────────────────────────────────────┘
```

---

## Error Handling Flow

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Service Layer   │     │  Resolver Layer  │     │  Apollo Server   │
│                  │     │                  │     │                  │
│ throws           │     │ error propagates │     │ catches error,   │
│ NotFoundError    │────▶│ (no try/catch    │────▶│ formats as       │
│ DuplicateError   │     │  needed)         │     │ GraphQL error    │
│                  │     │                  │     │ response         │
└──────────────────┘     └──────────────────┘     └──────────────────┘
                                                           │
                                                           ▼
                                                  { "errors": [{
                                                    "message": "Note with id 99 not found"
                                                  }]}
```

**Error types:**
| Error | Trigger | Response |
|-------|---------|----------|
| NotFoundError | Note/Tag ID doesn't exist | `"Note with id {id} not found"` |
| DuplicateError | Tag name already exists | `"Tag with name '{name}' already exists"` |
| DB Connection Failure | MySQL unreachable on startup | Log + `process.exit(1)` |
| Validation Error | Missing required fields | Apollo auto-validates against schema |

---

## Database Relationship Diagram

```
┌─────────────────────────────┐
│           notes              │
├─────────────────────────────┤
│ id          INT (PK, AUTO)  │
│ title       VARCHAR(255)    │
│ content     TEXT            │
│ pinned      BOOLEAN (false) │
│ created_at  TIMESTAMP       │
│ updated_at  TIMESTAMP       │
└──────────────┬──────────────┘
               │
               │ 1:N (one note → many note_tags rows)
               │
               ▼
┌─────────────────────────────┐
│         note_tags            │
├─────────────────────────────┤
│ note_id  INT (FK → notes.id)│◄── ON DELETE CASCADE
│ tag_id   INT (FK → tags.id) │◄── ON DELETE CASCADE
│ PK (note_id, tag_id)        │
└──────────────┬──────────────┘
               │
               │ N:1 (many note_tags rows → one tag)
               │
               ▼
┌─────────────────────────────┐
│            tags              │
├─────────────────────────────┤
│ id    INT (PK, AUTO)        │
│ name  VARCHAR(100) (UNIQUE) │
└─────────────────────────────┘

Relationship: Notes ←→ Tags (Many-to-Many via note_tags)
```

---

## File Dependency Graph

```
server.ts
  ├── config/env.ts          (loadConfig)
  ├── db/connection.ts       (createPool)
  ├── db/migrate.ts          (runMigrations)
  └── app.ts                 (createApp)
        ├── db/connection.ts       (getPool)
        ├── graphql/schema/typeDefs.ts
        └── graphql/resolvers/index.ts
              ├── resolvers/noteResolvers.ts
              │     └── services/noteService.ts
              │           ├── services/tagService.ts
              │           └── utils/errors.ts
              └── resolvers/tagResolvers.ts
                    └── services/tagService.ts
                          └── utils/errors.ts
```

---

## Technology Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Runtime | Node.js | JavaScript runtime |
| Language | TypeScript | Type safety, better DX |
| HTTP | Express | HTTP server framework |
| GraphQL | Apollo Server 3 | GraphQL engine + playground |
| Database | MySQL | Relational data storage |
| DB Driver | mysql2 (promise) | Raw SQL execution, connection pooling |
| Config | dotenv | Load .env variables |
| Dev Tools | ts-node, nodemon | Hot-reload development |

---

## Key Design Decisions

1. **No ORM** — Raw SQL with parameterized queries for full control and transparency
2. **Connection pooling** — Reuses connections (max 10) instead of opening/closing per query
3. **Auto-migration** — Tables created on startup, no manual SQL scripts needed
4. **Tag replace strategy** — On update, delete all associations then re-insert (simpler than diff)
5. **CASCADE deletes** — Deleting a note auto-removes its note_tags rows
6. **Tags persist** — Deleting a note does NOT delete its tags (tags are reusable)
7. **Context injection** — Pool passed via Apollo context, not imported directly in resolvers
8. **Error propagation** — Services throw typed errors, Apollo catches and formats them
9. **Case-insensitive search** — Relies on MySQL's utf8mb4_general_ci collation
10. **No auth** — Intentionally simple, no middleware complexity

---

## Running the System

```bash
# 1. Ensure MySQL is running with notes_db created
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS notes_db;"

# 2. Install dependencies
npm install

# 3. Start development server (hot-reload)
npm run dev

# 4. Open GraphQL Playground
# → http://localhost:4000/graphql

# 5. Build for production
npm run build

# 6. Run production build
npm start
```
