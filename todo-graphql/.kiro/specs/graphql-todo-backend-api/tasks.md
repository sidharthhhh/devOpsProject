# Implementation Plan: GraphQL Todo Backend API

## Overview

This implementation plan breaks down the GraphQL Todo Backend API into discrete coding tasks. The API provides authenticated todo management through a GraphQL interface using Node.js, Apollo Server, Express.js, and MySQL/SQLite. The implementation follows a layered architecture with clear separation between GraphQL layer, service layer, and data layer.

## Tasks

- [x] 1. Set up project structure and dependencies
  - Initialize Node.js project with package.json
  - Install dependencies: apollo-server-express, express, graphql, jsonwebtoken, bcrypt, mysql2 or better-sqlite3
  - Install dev dependencies: jest, @types/node (if using TypeScript)
  - Create directory structure: src/, src/schema/, src/resolvers/, src/services/, src/db/, test/
  - Set up environment variables file (.env) for JWT_SECRET, DATABASE_URL, PORT
  - _Requirements: 12.1, 12.2, 12.4_

- [x] 2. Implement database schema and connection
  - [x] 2.1 Create database initialization script
    - Write SQL schema for users table (id, name, email, password_hash, created_at)
    - Write SQL schema for todos table (id, title, description, completed, user_id, created_at)
    - Add UNIQUE constraint on users.email
    - Add FOREIGN KEY constraint on todos.user_id referencing users.id with CASCADE delete
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [x] 2.2 Create database connection module
    - Implement connection setup for MySQL or SQLite
    - Export query execution function for raw SQL queries
    - Add connection error handling
    - _Requirements: 9.1, 9.2_
  
  - [ ]* 2.3 Write unit tests for database schema
    - Test users table has correct columns
    - Test todos table has correct columns
    - Test unique constraint on users.email
    - Test foreign key constraint enforcement
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 3. Define GraphQL schema
  - [x] 3.1 Create GraphQL type definitions
    - Define User type with fields: id, name, email, created_at (exclude password_hash)
    - Define Todo type with fields: id, title, description, completed, user_id, created_at
    - Define AuthPayload type with fields: token, user
    - _Requirements: 8.1, 8.2, 8.3, 11.5_
  
  - [x] 3.2 Define GraphQL operations
    - Define Query operations: todos, todo(id: ID!), myTodos
    - Define Mutation operations: register(name, email, password), login(email, password), createTodo(title, description), updateTodo(id, title, description, completed), deleteTodo(id)
    - _Requirements: 8.4, 8.5_
  
  - [ ]* 3.3 Write schema structure tests
    - **Infrastructure Property: Schema Structure**
    - Test User type has correct fields and password_hash is excluded
    - Test Todo type has correct fields
    - Test AuthPayload type has correct fields
    - Test Query operations are defined
    - Test Mutation operations are defined
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 4. Implement User Service with authentication
  - [x] 4.1 Create User Service module
    - Implement register(name, email, password) function
    - Implement login(email, password) function
    - Implement findById(userId) function
    - Implement generateToken(userId) function using jsonwebtoken
    - _Requirements: 1.1, 1.2, 1.5, 2.1, 2.2, 2.5_
  
  - [x] 4.2 Implement password hashing in register
    - Hash password with bcrypt using 10+ salt rounds before database insertion
    - Validate input: name, email, password are non-empty
    - Check if email already exists and throw error if duplicate
    - Insert user into database with hashed password
    - Generate JWT token and return { user, token }
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 11.1, 11.3_
  
  - [x] 4.3 Implement password verification in login
    - Find user by email
    - Use bcrypt.compare() to verify password against stored hash
    - Return authentication error if email not found or password incorrect
    - Generate JWT token and return { user, token } on success
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 11.2_
  
  - [ ]* 4.4 Write property test for user registration
    - **Property 1: User Registration Creates Database Record**
    - **Validates: Requirements 1.1**
    - Test that any valid name, email, password creates database record
    - _Requirements: 1.1_
  
  - [ ]* 4.5 Write property test for password hashing
    - **Property 2: Password Hashing with Bcrypt**
    - **Validates: Requirements 1.2, 11.1, 11.3**
    - Test that any password is hashed with bcrypt (starts with $2a$ or $2b$)
    - Test that stored hash does not equal plain text password
    - Test that cost factor is at least 10
    - _Requirements: 1.2, 11.1, 11.3_
  
  - [ ]* 4.6 Write property test for email uniqueness
    - **Property 3: Email Uniqueness Enforcement**
    - **Validates: Requirements 1.3**
    - Test that duplicate email registration fails with error
    - _Requirements: 1.3_
  
  - [ ]* 4.7 Write property test for registration validation
    - **Property 4: Registration Input Validation**
    - **Validates: Requirements 1.4**
    - Test that invalid inputs (empty name, malformed email, short password) return validation errors
    - _Requirements: 1.4_
  
  - [ ]* 4.8 Write property test for registration response
    - **Property 5: Registration Response Structure**
    - **Validates: Requirements 1.5, 2.5**
    - Test that successful registration returns AuthPayload with user and valid JWT token
    - _Requirements: 1.5, 2.5_
  
  - [ ]* 4.9 Write property test for login authentication
    - **Property 6: Login Round-Trip Authentication**
    - **Validates: Requirements 2.1, 2.2**
    - Test that login with correct credentials verifies password and returns valid JWT
    - _Requirements: 2.1, 2.2_
  
  - [ ]* 4.10 Write property test for incorrect credentials
    - **Property 7: Login Rejects Incorrect Credentials**
    - **Validates: Requirements 2.3**
    - Test that login with incorrect password returns authentication error
    - _Requirements: 2.3_
  
  - [ ]* 4.11 Write property test for non-existent users
    - **Property 8: Login Rejects Non-Existent Users**
    - **Validates: Requirements 2.4**
    - Test that login with unregistered email returns authentication error
    - _Requirements: 2.4_

- [ ] 5. Checkpoint - Ensure user authentication tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement JWT context function
  - [x] 6.1 Create Apollo Server context function
    - Extract token from Authorization header (format: "Bearer <token>")
    - Verify JWT token using jwt.verify() with JWT_SECRET
    - Fetch user from database using decoded userId
    - Return { user } if token valid, { user: null } if invalid/missing
    - Handle token verification errors gracefully
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 12.3_
  
  - [ ]* 6.2 Write property test for valid JWT tokens
    - **Property 9: Valid JWT Token Grants Access**
    - **Validates: Requirements 3.1, 3.2, 3.5, 12.3**
    - Test that valid JWT token in Authorization header attaches user to context
    - _Requirements: 3.1, 3.2, 3.5, 12.3_
  
  - [ ]* 6.3 Write property test for invalid JWT tokens
    - **Property 10: Invalid JWT Tokens Are Rejected**
    - **Validates: Requirements 3.4**
    - Test that invalid, malformed, or expired tokens return authentication error
    - _Requirements: 3.4_
  
  - [ ]* 6.4 Write unit tests for context function edge cases
    - Test missing Authorization header returns { user: null }
    - Test malformed Bearer token format returns { user: null }
    - Test expired token returns { user: null }
    - _Requirements: 3.3, 3.4_

- [x] 7. Implement Todo Service
  - [x] 7.1 Create Todo Service module
    - Implement create(userId, title, description) function
    - Implement findAll() function
    - Implement findById(todoId) function
    - Implement findByUserId(userId) function
    - Implement update(todoId, userId, updates) function
    - Implement delete(todoId, userId) function
    - _Requirements: 4.1, 5.1, 5.2, 5.4, 6.1, 7.1_
  
  - [x] 7.2 Implement todo creation logic
    - Validate title is non-empty
    - Insert todo with user_id, title, description, completed=false, created_at=now
    - Return created todo object with all fields
    - _Requirements: 4.1, 4.2, 4.3, 4.5_
  
  - [x] 7.3 Implement todo retrieval logic
    - Implement findAll() to query all todos
    - Implement findById() to query specific todo by ID
    - Implement findByUserId() to query todos where user_id matches
    - Return null for non-existent todo IDs
    - _Requirements: 5.1, 5.2, 5.4, 5.5_
  
  - [x] 7.4 Implement todo update logic with authorization
    - Find todo by ID, return error if not found
    - Verify todo.user_id === userId, return authorization error if mismatch
    - Update only specified fields (title, description, completed)
    - Return updated todo object
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [x] 7.5 Implement todo deletion logic with authorization
    - Find todo by ID, return error if not found
    - Verify todo.user_id === userId, return authorization error if mismatch
    - Delete todo from database
    - Return deleted todo object
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  
  - [ ]* 7.6 Write property test for todo creation
    - **Property 11: Todo Creation Associates with User**
    - **Validates: Requirements 4.1, 4.2, 4.3**
    - Test that todo is created with correct user_id, completed=false, and timestamp
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [ ]* 7.7 Write property test for todo creation response
    - **Property 12: Todo Creation Response Structure**
    - **Validates: Requirements 4.5**
    - Test that created todo contains all fields: id, title, description, completed, user_id, created_at
    - _Requirements: 4.5_
  
  - [ ]* 7.8 Write property test for user-specific retrieval
    - **Property 13: User-Specific Todo Retrieval**
    - **Validates: Requirements 5.1**
    - Test that myTodos returns all and only todos belonging to authenticated user
    - _Requirements: 5.1_
  
  - [ ]* 7.9 Write property test for single todo retrieval
    - **Property 14: Single Todo Retrieval with Ownership**
    - **Validates: Requirements 5.2**
    - Test that todo(id) returns specific todo with all fields when user owns it
    - _Requirements: 5.2_
  
  - [ ]* 7.10 Write property test for todo access authorization
    - **Property 15: Todo Access Authorization**
    - **Validates: Requirements 5.3**
    - Test that accessing another user's todo returns authorization error or null
    - _Requirements: 5.3_
  
  - [ ]* 7.11 Write property test for all todos query
    - **Property 16: All Todos Query Returns Complete Set**
    - **Validates: Requirements 5.4**
    - Test that todos query returns all todos regardless of ownership
    - _Requirements: 5.4_
  
  - [ ]* 7.12 Write property test for non-existent todo handling
    - **Property 17: Non-Existent Todo Handling**
    - **Validates: Requirements 5.5, 6.3, 7.3**
    - Test that querying non-existent todo ID returns null or error
    - _Requirements: 5.5, 6.3, 7.3_
  
  - [ ]* 7.13 Write property test for todo updates
    - **Property 18: Todo Update Modifies Specified Fields**
    - **Validates: Requirements 6.1, 6.4, 6.5**
    - Test that updateTodo modifies only specified fields and returns updated object
    - _Requirements: 6.1, 6.4, 6.5_
  
  - [ ]* 7.14 Write property test for update authorization
    - **Property 19: Todo Update Authorization**
    - **Validates: Requirements 6.2**
    - Test that updating another user's todo returns authorization error
    - _Requirements: 6.2_
  
  - [ ]* 7.15 Write property test for todo deletion
    - **Property 20: Todo Deletion Removes Record**
    - **Validates: Requirements 7.1, 7.4, 7.5**
    - Test that deleteTodo permanently removes todo from database
    - _Requirements: 7.1, 7.4, 7.5_
  
  - [ ]* 7.16 Write property test for deletion authorization
    - **Property 21: Todo Deletion Authorization**
    - **Validates: Requirements 7.2**
    - Test that deleting another user's todo returns authorization error
    - _Requirements: 7.2_
  
  - [ ]* 7.17 Write property test for foreign key constraint
    - **Property 22: Foreign Key Constraint Enforcement**
    - **Validates: Requirements 9.3**
    - Test that inserting todo with non-existent user_id fails with constraint error
    - _Requirements: 9.3_

- [ ] 8. Checkpoint - Ensure todo service tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement GraphQL resolvers
  - [x] 9.1 Create Query resolvers
    - Implement todos resolver: call TodoService.findAll()
    - Implement todo(id) resolver: call TodoService.findById(id)
    - Implement myTodos resolver: check context.user, call TodoService.findByUserId(context.user.id)
    - Throw AuthenticationError if context.user is null for protected operations
    - _Requirements: 5.1, 5.2, 5.4, 10.1, 10.3, 10.5_
  
  - [x] 9.2 Create Mutation resolvers for authentication
    - Implement register resolver: call UserService.register(name, email, password), return { user, token }
    - Implement login resolver: call UserService.login(email, password), return { user, token }
    - _Requirements: 1.1, 1.5, 2.1, 2.5, 10.2, 10.3_
  
  - [x] 9.3 Create Mutation resolvers for todo operations
    - Implement createTodo resolver: check context.user, call TodoService.create(context.user.id, title, description)
    - Implement updateTodo resolver: check context.user, call TodoService.update(id, context.user.id, updates)
    - Implement deleteTodo resolver: check context.user, call TodoService.delete(id, context.user.id)
    - Throw AuthenticationError if context.user is null
    - _Requirements: 4.1, 4.4, 6.1, 7.1, 10.2, 10.3, 10.5_
  
  - [x] 9.4 Implement error handling in resolvers
    - Catch service layer errors and format as GraphQL errors
    - Use appropriate error codes: UNAUTHENTICATED, FORBIDDEN, BAD_USER_INPUT, NOT_FOUND, INTERNAL_SERVER_ERROR
    - Return descriptive error messages
    - _Requirements: 10.4_
  
  - [ ]* 9.5 Write property test for error response format
    - **Property 23: GraphQL Error Response Format**
    - **Validates: Requirements 10.4**
    - Test that errors return properly formatted GraphQL error with descriptive message
    - _Requirements: 10.4_
  
  - [ ]* 9.6 Write property test for password hash exclusion
    - **Property 24: Password Hash Exclusion from Responses**
    - **Validates: Requirements 11.4**
    - Test that User objects in responses never include password_hash field
    - _Requirements: 11.4_
  
  - [ ]* 9.7 Write unit tests for resolver implementations
    - Test all Query resolvers are implemented
    - Test all Mutation resolvers are implemented
    - Test resolvers delegate to service layer
    - Test authentication checks in protected resolvers
    - _Requirements: 10.1, 10.2, 10.3, 10.5_

- [-] 10. Configure and start Apollo Server
  - [-] 10.1 Create server initialization module
    - Initialize Apollo Server with typeDefs, resolvers, and context function
    - Integrate Apollo Server with Express.js using applyMiddleware
    - Configure introspection and playground for development environment
    - Set up error formatting for production vs development
    - _Requirements: 12.1, 12.2, 12.3, 12.5_
  
  - [ ] 10.2 Create server startup script
    - Load environment variables from .env
    - Initialize database connection
    - Start Express server on configured PORT (default 4000)
    - Log server URL and GraphQL endpoint on startup
    - _Requirements: 12.4_
  
  - [ ]* 10.3 Write server configuration tests
    - **Infrastructure Property: Server Configuration**
    - Test server starts on configured port
    - Test GraphQL endpoint responds to queries
    - Test introspection is available in development
    - _Requirements: 12.1, 12.2, 12.4, 12.5_

- [ ] 11. Integration testing and end-to-end flows
  - [ ]* 11.1 Write integration test for complete user flow
    - Test full flow: register → login → create todo → retrieve todos → update todo → delete todo
    - Verify each step returns expected data
    - Verify final state matches expectations
    - _Requirements: 1.1, 2.1, 4.1, 5.1, 6.1, 7.1_
  
  - [ ]* 11.2 Write integration test for authorization scenarios
    - Test user A cannot access user B's todos
    - Test user A cannot update user B's todos
    - Test user A cannot delete user B's todos
    - _Requirements: 5.3, 6.2, 7.2_
  
  - [ ]* 11.3 Write integration test for authentication edge cases
    - Test todo creation without Authorization header fails
    - Test todo creation with malformed token fails
    - Test todo creation with expired token fails
    - _Requirements: 3.3, 3.4, 4.4_

- [ ] 12. Final checkpoint - Ensure all tests pass
  - Run complete test suite
  - Verify all property-based tests pass with 100+ iterations
  - Verify all unit tests pass
  - Verify all integration tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property-based tests use fast-check library with minimum 100 iterations
- Each property test is tagged with comment: `// Feature: graphql-todo-backend-api, Property {number}: {property_text}`
- Checkpoints ensure incremental validation at key milestones
- All 24 correctness properties from the design document are covered in property test tasks
- Infrastructure smoke tests verify schema structure, database schema, and server configuration
- Integration tests validate end-to-end user flows and authorization scenarios
