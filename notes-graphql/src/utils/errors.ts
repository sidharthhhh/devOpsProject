/**
 * Custom error classes for the Notes GraphQL API.
 *
 * These errors are thrown by the service layer when business rules are violated.
 * Apollo Server catches them and returns descriptive GraphQL error responses
 * to the client automatically.
 */

/**
 * NotFoundError — thrown when a requested resource does not exist in the database.
 *
 * Used in scenarios like:
 * - Querying a note by an ID that doesn't exist (Requirement 3.5)
 * - Updating a note with a non-existent ID (Requirement 4.4)
 * - Deleting a note with a non-existent ID (Requirement 5.3)
 * - Pinning or unpinning a note with a non-existent ID (Requirement 6.4)
 */
export class NotFoundError extends Error {
  /** The type of resource that was not found (e.g., "Note", "Tag") */
  public readonly resource: string;

  /** The ID that was looked up but not found */
  public readonly id: number;

  constructor(resource: string, id: number) {
    super(`${resource} with id ${id} not found`);
    this.resource = resource;
    this.id = id;

    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * DuplicateError — thrown when attempting to create a resource that already exists.
 *
 * Used in scenarios like:
 * - Creating a tag with a name that already exists in the database (Requirement 8.2)
 */
export class DuplicateError extends Error {
  /** The type of resource that has a conflict (e.g., "Tag") */
  public readonly resource: string;

  /** The field that caused the conflict (e.g., "name") */
  public readonly field: string;

  /** The value that already exists (e.g., the duplicate tag name) */
  public readonly value: string;

  constructor(resource: string, field: string, value: string) {
    super(`${resource} with ${field} '${value}' already exists`);
    this.resource = resource;
    this.field = field;
    this.value = value;

    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, DuplicateError.prototype);
  }
}
