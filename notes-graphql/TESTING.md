# Testing the Notes GraphQL API

All queries and mutations are sent to: **http://localhost:4000/graphql**

Open this URL in your browser to access the Apollo Sandbox/Playground, or use any GraphQL client (Postman, Insomnia, curl).

---

## Setup

1. Make sure MySQL is running and a database named `notes_db` exists:
   ```sql
   CREATE DATABASE IF NOT EXISTS notes_db;
   ```

2. Update `.env` with your MySQL credentials if needed.

3. Start the server:
   ```bash
   npm run dev
   ```

4. Open http://localhost:4000/graphql in your browser.

---

## Mutations

### Create a Note (without tags)

```graphql
mutation {
  createNote(title: "My First Note", content: "This is the content of my first note.") {
    id
    title
    content
    pinned
    created_at
    updated_at
    tags {
      id
      name
    }
  }
}
```

### Create a Note (with tags)

```graphql
mutation {
  createNote(
    title: "Shopping List"
    content: "Milk, Eggs, Bread, Butter"
    tags: ["groceries", "personal"]
  ) {
    id
    title
    content
    pinned
    created_at
    updated_at
    tags {
      id
      name
    }
  }
}
```

### Update a Note (title and content)

```graphql
mutation {
  updateNote(id: 1, title: "Updated Title", content: "Updated content here.") {
    id
    title
    content
    pinned
    updated_at
    tags {
      id
      name
    }
  }
}
```

### Update a Note (replace tags)

```graphql
mutation {
  updateNote(id: 1, tags: ["work", "important"]) {
    id
    title
    tags {
      id
      name
    }
  }
}
```

### Delete a Note

```graphql
mutation {
  deleteNote(id: 1) {
    id
    title
    content
    tags {
      id
      name
    }
  }
}
```

### Pin a Note

```graphql
mutation {
  pinNote(id: 2) {
    id
    title
    pinned
    updated_at
  }
}
```

### Unpin a Note

```graphql
mutation {
  unpinNote(id: 2) {
    id
    title
    pinned
    updated_at
  }
}
```

### Create a Tag

```graphql
mutation {
  createTag(name: "urgent") {
    id
    name
  }
}
```

---

## Queries

### Get All Notes (no filters)

```graphql
query {
  notes {
    id
    title
    content
    pinned
    created_at
    updated_at
    tags {
      id
      name
    }
  }
}
```

### Get Notes with Pagination

```graphql
query {
  notes(limit: 5, offset: 0) {
    id
    title
    pinned
    created_at
    tags {
      name
    }
  }
}
```

### Get Notes Filtered by Pinned Status

```graphql
query {
  notes(pinned: true) {
    id
    title
    pinned
    tags {
      name
    }
  }
}
```

### Get Notes with Pagination + Pinned Filter

```graphql
query {
  notes(limit: 10, offset: 0, pinned: false) {
    id
    title
    content
    pinned
    created_at
  }
}
```

### Get a Single Note by ID

```graphql
query {
  note(id: 2) {
    id
    title
    content
    pinned
    created_at
    updated_at
    tags {
      id
      name
    }
  }
}
```

### Get All Pinned Notes

```graphql
query {
  pinnedNotes {
    id
    title
    content
    pinned
    created_at
    tags {
      name
    }
  }
}
```

### Search Notes by Title or Content

```graphql
query {
  searchNotes(query: "shopping") {
    id
    title
    content
    pinned
    created_at
    tags {
      name
    }
  }
}
```

### Get All Tags

```graphql
query {
  tags {
    id
    name
  }
}
```

---

## Error Cases to Test

### Get a Note that doesn't exist

```graphql
query {
  note(id: 9999) {
    id
    title
  }
}
```

Expected: Error message `"Note with id 9999 not found"`

### Delete a Note that doesn't exist

```graphql
mutation {
  deleteNote(id: 9999) {
    id
  }
}
```

Expected: Error message `"Note with id 9999 not found"`

### Pin a Note that doesn't exist

```graphql
mutation {
  pinNote(id: 9999) {
    id
  }
}
```

Expected: Error message `"Note with id 9999 not found"`

### Create a Duplicate Tag

```graphql
mutation {
  createTag(name: "urgent") {
    id
    name
  }
}
```

Run this twice. The second time should return: `"Tag with name 'urgent' already exists"`

### Search with No Results

```graphql
query {
  searchNotes(query: "xyznonexistent") {
    id
    title
  }
}
```

Expected: Empty array `[]`

---

## Sample Test Flow

Here's a full workflow you can run in order:

```graphql
# 1. Create a tag
mutation { createTag(name: "work") { id name } }

# 2. Create a note with tags
mutation {
  createNote(title: "Meeting Notes", content: "Discuss Q4 goals", tags: ["work", "meetings"]) {
    id title content pinned tags { name }
  }
}

# 3. Create another note
mutation {
  createNote(title: "Grocery Run", content: "Buy milk and eggs", tags: ["personal"]) {
    id title content pinned tags { name }
  }
}

# 4. Get all notes
query { notes { id title pinned tags { name } } }

# 5. Pin the first note
mutation { pinNote(id: 1) { id title pinned } }

# 6. Get pinned notes
query { pinnedNotes { id title } }

# 7. Search for "milk"
query { searchNotes(query: "milk") { id title content } }

# 8. Update note tags
mutation { updateNote(id: 1, tags: ["work", "important"]) { id tags { name } } }

# 9. Get all tags
query { tags { id name } }

# 10. Delete a note
mutation { deleteNote(id: 2) { id title } }

# 11. Verify deletion
query { notes { id title } }
```

---

## Using curl

If you prefer testing from the terminal:

```bash
# Create a note
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { createNote(title: \"Test Note\", content: \"Hello World\") { id title content pinned } }"}'

# Get all notes
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ notes { id title pinned tags { name } } }"}'

# Search notes
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ searchNotes(query: \"hello\") { id title content } }"}'
```
