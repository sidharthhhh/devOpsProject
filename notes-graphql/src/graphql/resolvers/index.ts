import { noteResolvers } from './noteResolvers';
import { tagResolvers } from './tagResolvers';

/**
 * Resolver Map Combiner
 *
 * This file merges all individual resolver modules (noteResolvers, tagResolvers)
 * into a single unified resolver map that Apollo Server expects.
 *
 * The merge pattern uses the spread operator to combine Query and Mutation
 * fields from each resolver module. This keeps each domain's resolvers in
 * separate files for maintainability, while producing the flat resolver map
 * structure that Apollo Server requires.
 *
 * To add a new resolver module:
 *   1. Create a new file (e.g., myResolvers.ts) with Query/Mutation objects
 *   2. Import it here
 *   3. Spread its Query and Mutation fields into the combined object below
 *
 * Validates: Requirement 10.2 — separation of concerns in the graphql/ directory
 */

const resolvers = {
  Query: {
    // Note-related queries: notes, note, pinnedNotes, searchNotes
    ...noteResolvers.Query,
    // Tag-related queries: tags
    ...tagResolvers.Query,
  },
  Mutation: {
    // Note-related mutations: createNote, updateNote, deleteNote, pinNote, unpinNote
    ...noteResolvers.Mutation,
    // Tag-related mutations: createTag
    ...tagResolvers.Mutation,
  },
};

export default resolvers;
