import { gql } from 'apollo-server-express';

/**
 * GraphQL Type Definitions (Schema)
 *
 * This file defines the complete GraphQL schema for the Notes API.
 * It describes the shape of data (types) and the available operations
 * (queries for reading data, mutations for writing data).
 */

const typeDefs = gql`
  """
  Represents a single note stored in the database.
  Each note has a title, content, pinned status, timestamps,
  and can be associated with multiple tags.
  """
  type Note {
    id: Int!
    title: String!
    content: String!
    pinned: Boolean!
    created_at: String!
    updated_at: String!
    tags: [Tag!]!
  }

  """
  Represents a reusable tag that can be associated with multiple notes.
  Tags help organize and categorize notes.
  """
  type Tag {
    id: Int!
    name: String!
  }

  """
  Query type defines all read operations available in the API.
  These operations retrieve data without modifying it.
  """
  type Query {
    # Retrieve a list of notes with optional pagination (limit/offset)
    # and an optional filter by pinned status.
    # Results are sorted by created_at in descending order.
    notes(limit: Int, offset: Int, pinned: Boolean): [Note!]!

    # Retrieve a single note by its unique ID.
    # Throws an error if the note does not exist.
    note(id: Int!): Note!

    # Retrieve all notes that are currently pinned.
    # Results are sorted by created_at in descending order.
    pinnedNotes: [Note!]!

    # Search notes by title or content using partial, case-insensitive matching.
    # Results are sorted by created_at in descending order.
    searchNotes(query: String!): [Note!]!

    # Retrieve all available tags from the database.
    tags: [Tag!]!
  }

  """
  Mutation type defines all write operations available in the API.
  These operations create, update, or delete data.
  """
  type Mutation {
    # Create a new note with a required title and content.
    # Optionally provide tag names — tags are created if they don't already exist.
    createNote(title: String!, content: String!, tags: [String!]): Note!

    # Update an existing note's title, content, and/or tags.
    # Only provided fields are updated; omitted fields remain unchanged.
    # If tags are provided, they fully replace the note's existing tag associations.
    updateNote(id: Int!, title: String, content: String, tags: [String!]): Note!

    # Delete a note by its ID. Returns the deleted note object.
    # Also removes all associated tag relationships.
    deleteNote(id: Int!): Note!

    # Pin a note (set pinned = true). Returns the updated note.
    pinNote(id: Int!): Note!

    # Unpin a note (set pinned = false). Returns the updated note.
    unpinNote(id: Int!): Note!

    # Create a new tag with a unique name.
    # Throws an error if a tag with the same name already exists.
    createTag(name: String!): Tag!
  }
`;

export default typeDefs;
