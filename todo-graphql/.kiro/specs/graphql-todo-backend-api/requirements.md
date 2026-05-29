# Requirements Document

## Introduction

This document specifies the requirements for a GraphQL Todo Backend API learning project. The system provides a backend-only API that allows authenticated users to manage todo items through GraphQL queries and mutations. The project demonstrates core GraphQL concepts including schema design, queries, mutations, resolvers, and authentication using Node.js, Express.js, Apollo Server, and MySQL/SQLite.

## Glossary

- **API**: The GraphQL Todo Backend API system
- **User**: A registered account holder who can authenticate and manage todos
- **Todo**: A task item with title, description, and completion status
- **JWT**: JSON Web Token used for authentication
- **Resolver**: GraphQL function that handles query or mutation execution
- **Schema**: GraphQL type definitions and operation specifications
- **Auth_Middleware**: Component that verifies JWT tokens and attaches user context
- **User_Service**: Component that handles user registration and authentication logic
- **Todo_Service**: Component that handles todo CRUD operations
- **Database**: MySQL or SQLite database storing users and todos

## Requirements

### Requirement 1: User Registration

**User Story:** As a new user, I want to register an account with my name, email, and password, so that I can access the todo management system.

#### Acceptance Criteria

1. WHEN a registration mutation is received with valid name, email, and password, THE API SHALL create a new user record in the database
2. WHEN storing a password, THE API SHALL hash the password using bcrypt before storage
3. WHEN a registration mutation is received with an email that already exists, THE API SHALL return an error indicating the email is already registered
4. WHEN a registration mutation is received with invalid input, THE API SHALL return a descriptive validation error
5. WHEN a user is successfully registered, THE API SHALL return an AuthPayload containing the user data and a JWT token

### Requirement 2: User Authentication

**User Story:** As a registered user, I want to login with my email and password, so that I can receive a JWT token to access protected operations.

#### Acceptance Criteria

1. WHEN a login mutation is received with valid email and password, THE API SHALL verify the password against the stored hash
2. WHEN the password verification succeeds, THE API SHALL generate and return a JWT token containing the user ID
3. WHEN a login mutation is received with incorrect credentials, THE API SHALL return an authentication error
4. WHEN a login mutation is received with a non-existent email, THE API SHALL return an authentication error
5. THE API SHALL include the user data and JWT token in the AuthPayload response upon successful login

### Requirement 3: JWT Token Verification

**User Story:** As a system, I want to verify JWT tokens on protected operations, so that only authenticated users can access their data.

#### Acceptance Criteria

1. WHEN a protected operation is invoked with a valid JWT token in the Authorization header, THE Auth_Middleware SHALL extract and verify the token
2. WHEN the JWT token is valid, THE Auth_Middleware SHALL attach the authenticated user to the GraphQL context
3. WHEN a protected operation is invoked without a JWT token, THE API SHALL return an authentication error
4. WHEN a protected operation is invoked with an invalid or expired JWT token, THE API SHALL return an authentication error
5. THE Auth_Middleware SHALL extract the token from the Authorization header in the format "Bearer <token>"

### Requirement 4: Todo Creation

**User Story:** As an authenticated user, I want to create a new todo with a title and description, so that I can track tasks I need to complete.

#### Acceptance Criteria

1. WHEN an authenticated user invokes the createTodo mutation with valid title and description, THE API SHALL create a new todo record associated with the user
2. WHEN a todo is created, THE API SHALL set the completed status to false by default
3. WHEN a todo is created, THE API SHALL store the current timestamp as created_at
4. WHEN an unauthenticated user attempts to create a todo, THE API SHALL return an authentication error
5. WHEN the createTodo mutation succeeds, THE API SHALL return the created Todo object with all fields populated

### Requirement 5: Todo Retrieval

**User Story:** As an authenticated user, I want to fetch my todos, so that I can view all tasks I have created.

#### Acceptance Criteria

1. WHEN an authenticated user invokes the myTodos query, THE API SHALL return all todos associated with that user
2. WHEN an authenticated user invokes the todo query with a valid todo ID, THE API SHALL return the specific todo if it belongs to the user
3. WHEN an authenticated user invokes the todo query with an ID for a todo they do not own, THE API SHALL return an authorization error
4. WHEN the todos query is invoked, THE API SHALL return all todos in the system
5. WHEN a todo query is invoked with a non-existent ID, THE API SHALL return null or an appropriate error

### Requirement 6: Todo Updates

**User Story:** As an authenticated user, I want to update my todo's title, description, or completion status, so that I can modify tasks as my needs change.

#### Acceptance Criteria

1. WHEN an authenticated user invokes the updateTodo mutation with a valid todo ID and update fields, THE API SHALL update the specified fields for that todo
2. WHEN an authenticated user attempts to update a todo they do not own, THE API SHALL return an authorization error
3. WHEN the updateTodo mutation is invoked with a non-existent todo ID, THE API SHALL return an error indicating the todo was not found
4. WHEN the updateTodo mutation succeeds, THE API SHALL return the updated Todo object
5. THE API SHALL allow partial updates where only specified fields are modified

### Requirement 7: Todo Deletion

**User Story:** As an authenticated user, I want to delete a todo, so that I can remove tasks that are no longer relevant.

#### Acceptance Criteria

1. WHEN an authenticated user invokes the deleteTodo mutation with a valid todo ID, THE API SHALL delete the todo from the database
2. WHEN an authenticated user attempts to delete a todo they do not own, THE API SHALL return an authorization error
3. WHEN the deleteTodo mutation is invoked with a non-existent todo ID, THE API SHALL return an error indicating the todo was not found
4. WHEN the deleteTodo mutation succeeds, THE API SHALL return a success confirmation or the deleted Todo object
5. WHEN a todo is deleted, THE API SHALL permanently remove it from the database

### Requirement 8: GraphQL Schema Definition

**User Story:** As a developer, I want a well-defined GraphQL schema, so that clients can discover available types, queries, and mutations.

#### Acceptance Criteria

1. THE API SHALL define a User type with fields: id, name, email, created_at
2. THE API SHALL define a Todo type with fields: id, title, description, completed, user_id, created_at
3. THE API SHALL define an AuthPayload type with fields: token, user
4. THE API SHALL define Query operations: todos, todo(id), myTodos
5. THE API SHALL define Mutation operations: register(name, email, password), login(email, password), createTodo(title, description), updateTodo(id, title, description, completed), deleteTodo(id)

### Requirement 9: Database Schema

**User Story:** As a system, I want a properly structured database schema, so that user and todo data can be stored reliably.

#### Acceptance Criteria

1. THE Database SHALL include a users table with columns: id, name, email, password_hash, created_at
2. THE Database SHALL include a todos table with columns: id, title, description, completed, user_id, created_at
3. THE Database SHALL enforce a foreign key relationship between todos.user_id and users.id
4. THE Database SHALL enforce unique constraint on users.email
5. THE Database SHALL use appropriate data types for each column

### Requirement 10: Resolver Implementation

**User Story:** As a developer, I want resolvers that handle GraphQL operations, so that queries and mutations execute the correct business logic.

#### Acceptance Criteria

1. THE API SHALL implement resolvers for all Query operations defined in the schema
2. THE API SHALL implement resolvers for all Mutation operations defined in the schema
3. WHEN a resolver executes, THE API SHALL delegate business logic to the appropriate service layer
4. WHEN a resolver encounters an error, THE API SHALL return a descriptive GraphQL error response
5. THE API SHALL implement resolvers that access the authenticated user from the GraphQL context

### Requirement 11: Password Security

**User Story:** As a security-conscious system, I want passwords to be securely hashed, so that user credentials are protected.

#### Acceptance Criteria

1. WHEN a password is stored, THE API SHALL hash it using bcrypt with a salt rounds value of at least 10
2. WHEN verifying a password during login, THE API SHALL use bcrypt compare function
3. THE API SHALL never store passwords in plain text
4. THE API SHALL never return password hashes in any GraphQL response
5. FOR ALL User type responses, the password_hash field SHALL be excluded from the schema

### Requirement 12: Server Configuration

**User Story:** As a developer, I want a properly configured Apollo Server with Express, so that the GraphQL API is accessible via HTTP.

#### Acceptance Criteria

1. THE API SHALL initialize Apollo Server with the GraphQL schema and resolvers
2. THE API SHALL integrate Apollo Server with Express.js
3. THE API SHALL configure the GraphQL context to include the authenticated user from JWT verification
4. WHEN the server starts, THE API SHALL listen on a configurable port
5. THE API SHALL provide a GraphQL playground or introspection endpoint for development
