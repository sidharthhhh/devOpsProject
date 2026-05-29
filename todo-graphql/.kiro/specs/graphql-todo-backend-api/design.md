# Design Document: GraphQL Todo Backend API

## Overview

The GraphQL Todo Backend API is a learning project demonstrating core GraphQL concepts through a practical todo management system. The API provides authenticated users with the ability to register, login, and perform CRUD operations on todo items through a GraphQL interface.

### Technology Stack

- **Runtime**: Node.js (v20+)
- **GraphQL Server**: Apollo Server 5.x
- **Web Framework**: Express.js 4.x
- **Database**: MySQL or SQLite with raw SQL queries
- **Authentication**: JWT (jsonwebtoken library)
- **Password Hashing**: bcrypt with 10+ salt rounds
- **Language**: JavaScript/TypeScript

### Key Design Principles

1. **Schema-First Design**: GraphQL schema defines the contract between client and server, mirroring the business domain rather than database structure
2. **Context-Based Authentication**: JWT verification occurs in Apollo Server's context function, making authenticated user available to all resolvers
3. **Layered Architecture**: Clear separation between GraphQL layer (schema/resolvers), service layer (business logic), and data layer (database access)
4. **Stateless Authentication**: JWT tokens enable scalable, stateless authentication without server-side session storage
5. **Security by Default**: Passwords are hashed with bcrypt, tokens are verified on protected operations, and authorization checks prevent unauthorized access

## Architecture

### System Architecture

The system follows a three-layer architecture:

```
┌─────────────────────────────────────────────────────────┐
│                    GraphQL Client                        │
│              (GraphQL Playground / App)                  │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP POST /graphql
                     │ Authorization: Bearer <JWT>
                     ▼
┌─────────────────────────────────────────────────────────┐
│                   Apollo Server                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Context Function (JWT Verification)             │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  GraphQL Schema (Types, Queries, Mutations)      │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Resolvers (Query & Mutation Handlers)           │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  Service Layer                           │
│  ┌──────────────────┐      ┌──────────────────┐        │
│  │  User Service    │      │  Todo Service    │        │
│  │  - register()    │      │  - create()      │        │
│  │  - login()       │      │  - findAll()     │        │
│  │  - findById()    │      │  - findById()    │        │
│  └──────────────────┘      │  - update()      │        │
│                             │  - delete()      │        │
│                             └──────────────────┘        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  Data Layer                              │
│              MySQL / SQLite Database                     │
│  ┌──────────────────┐      ┌──────────────────┐        │
│  │   users table    │      │   todos table    │        │
│  └──────────────────┘      └──────────────────┘        │
└─────────────────────────────────────────────────────────┘
```

### Request Flow

#### Authentication Flow (Register/Login)

1. Client sends `register` or `login` mutation with credentials
2. Apollo Server routes to appropriate resolver
3. Resolver delegates to User Service
4. User Service validates input, hashes password (register) or verifies password (login)
5. User Service generates JWT token containing user ID
6. Resolver returns AuthPayload with token and user data
7. Client stores token for subsequent requests

#### Protected Operation Flow (Todo CRUD)

1. Client sends query/mutation with `Authorization: Bearer <token>` header
2. Apollo Server context function extracts and verifies JWT
3. Context function attaches authenticated user to GraphQL context
4. Resolver accesses user from context
5. Resolver delegates to Todo Service with user information
6. Todo Service performs authorization check (e.g., user owns todo)
7. Todo Service executes database operation
8. Resolver returns result to client

### Authentication Strategy

The API uses JWT-based authentication with the following approach:

- **Token Generation**: On successful registration or login, a JWT is generated containing the user ID as payload, signed with a secret key
- **Token Transmission**: Clients include the token in the `Authorization` header using the format `Bearer <token>`
- **Token Verification**: Apollo Server's context function extracts and verifies the token before resolver execution
- **Context Population**: Verified user information is attached to the GraphQL context, making it available to all resolvers
- **Selective Protection**: Public operations (register, login) skip authentication; protected operations (todo CRUD, myTodos) require authenticated user in context

## Components and Interfaces

### GraphQL Schema

The GraphQL schema defines the API contract. Key design decisions:

- **Domain-Oriented Types**: Types represent business entities (User, Todo) rather than database tables
- **Input Types**: Mutations use explicit input parameters rather than input objects for simplicity
- **Non-Nullable Fields**: Critical fields use `!` to enforce presence (e.g., `id: ID!`, `email: String!`)
- **AuthPayload Pattern**: Authentication operations return both token and user data in a single response

```graphql
type User {
  id: ID!
  name: String!
  email: String!
  created_at: String!
}

type Todo {
  id: ID!
  title: String!
  description: String
  completed: Boolean!
  user_id: ID!
  created_at: String!
}

type AuthPayload {
  token: String!
  user: User!
}

type Query {
  todos: [Todo!]!
  todo(id: ID!): Todo
  myTodos: [Todo!]!
}

type Mutation {
  register(name: String!, email: String!, password: String!): AuthPayload!
  login(email: String!, password: String!): AuthPayload!
  createTodo(title: String!, description: String): Todo!
  updateTodo(id: ID!, title: String, description: String, completed: Boolean): Todo!
  deleteTodo(id: ID!): Todo!
}
```

### Resolver Structure

Resolvers are organized by operation type and delegate business logic to services:

```javascript
const resolvers = {
  Query: {
    todos: async () => {
      // Returns all todos (no auth required for demo)
      return await TodoService.findAll();
    },
    
    todo: async (_, { id }) => {
      // Returns specific todo by ID
      return await TodoService.findById(id);
    },
    
    myTodos: async (_, __, context) => {
      // Requires authentication
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      return await TodoService.findByUserId(context.user.id);
    }
  },
  
  Mutation: {
    register: async (_, { name, email, password }) => {
      // Public operation - no auth required
      const { user, token } = await UserService.register(name, email, password);
      return { user, token };
    },
    
    login: async (_, { email, password }) => {
      // Public operation - no auth required
      const { user, token } = await UserService.login(email, password);
      return { user, token };
    },
    
    createTodo: async (_, { title, description }, context) => {
      // Requires authentication
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      return await TodoService.create(context.user.id, title, description);
    },
    
    updateTodo: async (_, { id, title, description, completed }, context) => {
      // Requires authentication and ownership
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      return await TodoService.update(id, context.user.id, { title, description, completed });
    },
    
    deleteTodo: async (_, { id }, context) => {
      // Requires authentication and ownership
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      return await TodoService.delete(id, context.user.id);
    }
  }
};
```

### Service Layer

#### User Service

Handles user registration, authentication, and JWT operations:

```javascript
class UserService {
  async register(name, email, password) {
    // Validate input
    // Check if email already exists
    // Hash password with bcrypt (10 salt rounds)
    // Insert user into database
    // Generate JWT token
    // Return { user, token }
  }
  
  async login(email, password) {
    // Find user by email
    // Verify password with bcrypt.compare()
    // Generate JWT token
    // Return { user, token }
  }
  
  async findById(userId) {
    // Query user by ID
    // Return user object (without password_hash)
  }
  
  generateToken(userId) {
    // Create JWT with payload { userId }
    // Sign with secret key
    // Return token string
  }
}
```

#### Todo Service

Handles todo CRUD operations with authorization:

```javascript
class TodoService {
  async create(userId, title, description) {
    // Validate input
    // Insert todo with user_id, completed=false, created_at=now
    // Return created todo
  }
  
  async findAll() {
    // Query all todos
    // Return array of todos
  }
  
  async findById(todoId) {
    // Query todo by ID
    // Return todo or null
  }
  
  async findByUserId(userId) {
    // Query todos where user_id = userId
    // Return array of todos
  }
  
  async update(todoId, userId, updates) {
    // Find todo by ID
    // Verify todo.user_id === userId (authorization)
    // Update specified fields
    // Return updated todo
  }
  
  async delete(todoId, userId) {
    // Find todo by ID
    // Verify todo.user_id === userId (authorization)
    // Delete todo from database
    // Return deleted todo
  }
}
```

### Context Function

The context function runs before each GraphQL operation and handles JWT verification:

```javascript
const context = async ({ req }) => {
  // Extract token from Authorization header
  const authHeader = req.headers.authorization || '';
  
  if (!authHeader.startsWith('Bearer ')) {
    return { user: null };
  }
  
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  try {
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Fetch user from database
    const user = await UserService.findById(decoded.userId);
    
    return { user };
  } catch (error) {
    // Invalid or expired token
    return { user: null };
  }
};
```

### Server Configuration

Apollo Server is integrated with Express.js:

```javascript
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context,
  // Enable GraphQL Playground in development
  introspection: process.env.NODE_ENV !== 'production',
  playground: process.env.NODE_ENV !== 'production'
});

const app = express();

// Apply Apollo middleware to Express
server.applyMiddleware({ app, path: '/graphql' });

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}${server.graphqlPath}`);
});
```

## Data Models

### Database Schema

The database consists of two tables with a foreign key relationship:

#### Users Table

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Field Descriptions:**
- `id`: Auto-incrementing primary key
- `name`: User's display name
- `email`: Unique email address for login (enforced by UNIQUE constraint)
- `password_hash`: Bcrypt hash of user's password (never stored in plain text)
- `created_at`: Timestamp of account creation

#### Todos Table

```sql
CREATE TABLE todos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT FALSE,
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Field Descriptions:**
- `id`: Auto-incrementing primary key
- `title`: Todo title (required)
- `description`: Optional detailed description
- `completed`: Boolean flag indicating completion status (defaults to false)
- `user_id`: Foreign key referencing the owning user
- `created_at`: Timestamp of todo creation

**Relationships:**
- One-to-Many: A user can have many todos
- Foreign Key Constraint: `todos.user_id` references `users.id` with CASCADE delete (when user is deleted, their todos are also deleted)

### Data Access Patterns

The service layer uses raw SQL queries for database operations:

**User Operations:**
- `INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)` - Register new user
- `SELECT id, name, email, created_at FROM users WHERE email = ?` - Find user by email for login
- `SELECT id, name, email, created_at FROM users WHERE id = ?` - Find user by ID

**Todo Operations:**
- `INSERT INTO todos (title, description, user_id) VALUES (?, ?, ?)` - Create todo
- `SELECT * FROM todos` - Get all todos
- `SELECT * FROM todos WHERE id = ?` - Get todo by ID
- `SELECT * FROM todos WHERE user_id = ?` - Get user's todos
- `UPDATE todos SET title = ?, description = ?, completed = ? WHERE id = ? AND user_id = ?` - Update todo with authorization
- `DELETE FROM todos WHERE id = ? AND user_id = ?` - Delete todo with authorization

### JWT Token Structure

JWT tokens contain minimal payload for stateless authentication:

```json
{
  "userId": 123,
  "iat": 1234567890,
  "exp": 1234571490
}
```

**Fields:**
- `userId`: The authenticated user's ID
- `iat`: Issued at timestamp (automatically added by jsonwebtoken)
- `exp`: Expiration timestamp (optional, recommended for production)


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, several redundancies were identified:

- **Properties 7.1 and 7.5**: Both test that deletion removes todos from the database - combined into single property
- **Properties 1.3 and 9.4**: Both test email uniqueness constraint - 1.3 is more comprehensive
- **Properties 1.2, 11.3**: Both test that passwords are hashed, not stored in plain text - combined
- **Properties 3.2 and 12.3**: Both test context population with authenticated user - combined
- **Properties 8.1-8.5, 9.1-9.2, 9.5, 10.1-10.2, 11.5, 12.1-12.2, 12.4-12.5**: Schema and infrastructure smoke tests - grouped separately
- **Properties 10.3, 10.5, 11.2**: Implementation details covered by other functional tests

The following properties represent unique, testable behaviors:

### Property 1: User Registration Creates Database Record

*For any* valid name, email, and password, when a user registers, the system SHALL create a user record in the database with the provided name and email.

**Validates: Requirements 1.1**

### Property 2: Password Hashing with Bcrypt

*For any* password, when stored during registration, the system SHALL hash it using bcrypt with at least 10 salt rounds, and the stored password_hash SHALL be in bcrypt format (starting with $2a$ or $2b$) and SHALL NOT equal the plain text password.

**Validates: Requirements 1.2, 11.1, 11.3**

### Property 3: Email Uniqueness Enforcement

*For any* email address, when a user registers successfully with that email, subsequent registration attempts with the same email SHALL fail with an error indicating the email is already registered.

**Validates: Requirements 1.3, 9.4**

### Property 4: Registration Input Validation

*For any* invalid registration input (empty name, malformed email, or insufficient password), the system SHALL return a descriptive validation error and SHALL NOT create a user record.

**Validates: Requirements 1.4**

### Property 5: Registration Response Structure

*For any* successful registration, the system SHALL return an AuthPayload containing both a User object (with id, name, email, created_at) and a valid JWT token that can be decoded to extract the user ID.

**Validates: Requirements 1.5, 2.5**

### Property 6: Login Round-Trip Authentication

*For any* registered user, when logging in with the correct email and password, the system SHALL verify the password against the stored bcrypt hash and return an AuthPayload with a valid JWT token containing the user's ID.

**Validates: Requirements 2.1, 2.2**

### Property 7: Login Rejects Incorrect Credentials

*For any* registered user, when attempting to login with an incorrect password, the system SHALL return an authentication error and SHALL NOT issue a token.

**Validates: Requirements 2.3**

### Property 8: Login Rejects Non-Existent Users

*For any* email address not registered in the system, login attempts SHALL return an authentication error.

**Validates: Requirements 2.4**

### Property 9: Valid JWT Token Grants Access

*For any* valid JWT token in the Authorization header (format "Bearer <token>"), when invoking a protected operation, the system SHALL extract and verify the token, attach the authenticated user to the GraphQL context, and allow the operation to proceed.

**Validates: Requirements 3.1, 3.2, 3.5, 12.3**

### Property 10: Invalid JWT Tokens Are Rejected

*For any* invalid, malformed, or expired JWT token, when invoking a protected operation, the system SHALL return an authentication error.

**Validates: Requirements 3.4**

### Property 11: Todo Creation Associates with User

*For any* authenticated user and valid todo title and description, when creating a todo, the system SHALL create a todo record with the provided title and description, associate it with the user's ID, set completed to false by default, and set created_at to the current timestamp.

**Validates: Requirements 4.1, 4.2, 4.3**

### Property 12: Todo Creation Response Structure

*For any* successful todo creation, the system SHALL return a Todo object containing all fields: id, title, description, completed, user_id, and created_at.

**Validates: Requirements 4.5**

### Property 13: User-Specific Todo Retrieval

*For any* authenticated user with todos, when querying myTodos, the system SHALL return all and only the todos where user_id matches the authenticated user's ID.

**Validates: Requirements 5.1**

### Property 14: Single Todo Retrieval with Ownership

*For any* authenticated user and todo ID belonging to that user, when querying todo(id), the system SHALL return the specific todo with all fields populated.

**Validates: Requirements 5.2**

### Property 15: Todo Access Authorization

*For any* authenticated user and todo ID belonging to a different user, when querying todo(id), the system SHALL return an authorization error or null.

**Validates: Requirements 5.3**

### Property 16: All Todos Query Returns Complete Set

*For any* set of todos in the database, when querying todos, the system SHALL return all todos regardless of ownership.

**Validates: Requirements 5.4**

### Property 17: Non-Existent Todo Handling

*For any* todo ID that does not exist in the database, when querying todo(id), the system SHALL return null or an appropriate error.

**Validates: Requirements 5.5, 6.3, 7.3**

### Property 18: Todo Update Modifies Specified Fields

*For any* authenticated user, todo owned by that user, and valid update fields (title, description, completed), when invoking updateTodo, the system SHALL update only the specified fields and return the updated Todo object.

**Validates: Requirements 6.1, 6.4, 6.5**

### Property 19: Todo Update Authorization

*For any* authenticated user and todo owned by a different user, when attempting to update the todo, the system SHALL return an authorization error and SHALL NOT modify the todo.

**Validates: Requirements 6.2**

### Property 20: Todo Deletion Removes Record

*For any* authenticated user and todo owned by that user, when invoking deleteTodo, the system SHALL permanently remove the todo from the database and return a success confirmation.

**Validates: Requirements 7.1, 7.4, 7.5**

### Property 21: Todo Deletion Authorization

*For any* authenticated user and todo owned by a different user, when attempting to delete the todo, the system SHALL return an authorization error and SHALL NOT delete the todo.

**Validates: Requirements 7.2**

### Property 22: Foreign Key Constraint Enforcement

*For any* non-existent user_id, when attempting to insert a todo with that user_id, the database SHALL reject the operation with a foreign key constraint error.

**Validates: Requirements 9.3**

### Property 23: GraphQL Error Response Format

*For any* error condition (validation error, authentication error, authorization error, not found error), the system SHALL return a properly formatted GraphQL error response with a descriptive message.

**Validates: Requirements 10.4**

### Property 24: Password Hash Exclusion from Responses

*For any* GraphQL query or mutation that returns User objects, the response SHALL NOT include the password_hash field.

**Validates: Requirements 11.4**

### Infrastructure Properties (Smoke Tests)

The following properties verify one-time infrastructure and schema configuration:

- **Schema Structure**: GraphQL schema defines User, Todo, and AuthPayload types with correct fields (Requirements 8.1-8.3)
- **Schema Operations**: GraphQL schema defines Query operations (todos, todo, myTodos) and Mutation operations (register, login, createTodo, updateTodo, deleteTodo) (Requirements 8.4-8.5)
- **Database Schema**: Database includes users and todos tables with correct columns and data types (Requirements 9.1, 9.2, 9.5)
- **Resolver Implementation**: All Query and Mutation operations have implemented resolvers (Requirements 10.1, 10.2)
- **Server Configuration**: Apollo Server initializes with schema and resolvers, integrates with Express, and listens on configurable port (Requirements 12.1, 12.2, 12.4, 12.5)


## Error Handling

The API implements comprehensive error handling across all layers:

### Error Categories

#### 1. Authentication Errors

**Trigger Conditions:**
- Missing Authorization header on protected operations
- Invalid JWT token format
- Expired JWT token
- Token signature verification failure

**Response:**
```json
{
  "errors": [
    {
      "message": "Not authenticated",
      "extensions": {
        "code": "UNAUTHENTICATED"
      }
    }
  ]
}
```

**Implementation:**
- Context function returns `{ user: null }` for invalid tokens
- Resolvers check `context.user` and throw `AuthenticationError` if null
- Apollo Server automatically formats authentication errors

#### 2. Authorization Errors

**Trigger Conditions:**
- User attempts to access/modify todo owned by another user
- User attempts to perform operation without required permissions

**Response:**
```json
{
  "errors": [
    {
      "message": "Not authorized to access this todo",
      "extensions": {
        "code": "FORBIDDEN"
      }
    }
  ]
}
```

**Implementation:**
- Service layer checks ownership: `todo.user_id === requestingUserId`
- Throw `ForbiddenError` when authorization check fails
- Return descriptive message indicating the authorization issue

#### 3. Validation Errors

**Trigger Conditions:**
- Empty or whitespace-only required fields (name, email, password, title)
- Invalid email format
- Password too short (< 6 characters recommended)
- Invalid input types

**Response:**
```json
{
  "errors": [
    {
      "message": "Validation error: Email is required and must be valid",
      "extensions": {
        "code": "BAD_USER_INPUT",
        "field": "email"
      }
    }
  ]
}
```

**Implementation:**
- Service layer validates inputs before database operations
- Throw `UserInputError` with descriptive message
- Include field name in error extensions for client-side form handling

#### 4. Duplicate Email Errors

**Trigger Conditions:**
- Registration with email that already exists in database

**Response:**
```json
{
  "errors": [
    {
      "message": "Email already registered",
      "extensions": {
        "code": "BAD_USER_INPUT",
        "field": "email"
      }
    }
  ]
}
```

**Implementation:**
- Check for existing email before insertion
- Catch database unique constraint violations
- Return user-friendly error message

#### 5. Not Found Errors

**Trigger Conditions:**
- Query for todo with non-existent ID
- Update/delete operation on non-existent todo

**Response:**
```json
{
  "errors": [
    {
      "message": "Todo not found",
      "extensions": {
        "code": "NOT_FOUND",
        "id": "123"
      }
    }
  ]
}
```

**Implementation:**
- Service layer checks if record exists before operations
- Return null for queries (GraphQL convention)
- Throw error for mutations to distinguish from authorization failures

#### 6. Database Errors

**Trigger Conditions:**
- Database connection failures
- Foreign key constraint violations
- SQL syntax errors (development only)

**Response:**
```json
{
  "errors": [
    {
      "message": "Internal server error",
      "extensions": {
        "code": "INTERNAL_SERVER_ERROR"
      }
    }
  ]
}
```

**Implementation:**
- Catch database exceptions in service layer
- Log detailed error for debugging
- Return generic error message to client (avoid exposing internal details)
- In development: include more details for debugging

### Error Handling Strategy

**Layered Error Handling:**

1. **GraphQL Layer (Resolvers)**:
   - Validate authentication (check `context.user`)
   - Catch and format errors from service layer
   - Use Apollo Server error types: `AuthenticationError`, `ForbiddenError`, `UserInputError`

2. **Service Layer**:
   - Validate business logic and input constraints
   - Check authorization (ownership, permissions)
   - Throw descriptive errors with context
   - Handle database errors and translate to business errors

3. **Data Layer**:
   - Catch database-specific errors
   - Translate database errors to service-level errors
   - Log technical details for debugging

**Error Response Consistency:**

All errors follow GraphQL error format:
- `message`: Human-readable error description
- `extensions.code`: Machine-readable error code for client handling
- `extensions.*`: Additional context (field names, IDs, etc.)
- `path`: GraphQL operation path where error occurred (automatically added)

**Security Considerations:**

- Never expose password hashes in errors
- Avoid revealing whether email exists during login (use generic "Invalid credentials")
- Don't expose internal database structure or SQL in production errors
- Log sensitive details server-side only
- Rate limit authentication attempts (recommended for production)


## Testing Strategy

The testing strategy employs a dual approach combining property-based testing for universal behaviors and example-based testing for specific scenarios and infrastructure validation.

### Property-Based Testing

**Library Selection:** [fast-check](https://github.com/dubzzz/fast-check) for JavaScript/TypeScript

Property-based tests validate universal properties across randomly generated inputs, providing comprehensive coverage of edge cases and input variations.

**Configuration:**
- Minimum 100 iterations per property test
- Each test tagged with comment referencing design property
- Tag format: `// Feature: graphql-todo-backend-api, Property {number}: {property_text}`

**Test Organization:**

```javascript
// test/properties/user.properties.test.js
describe('User Registration Properties', () => {
  
  // Feature: graphql-todo-backend-api, Property 1: User Registration Creates Database Record
  it('creates database record for any valid registration input', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),  // name
        fc.emailAddress(),                             // email
        fc.string({ minLength: 6, maxLength: 50 }),   // password
        async (name, email, password) => {
          // Register user
          const result = await registerUser(name, email, password);
          
          // Verify user exists in database
          const user = await findUserByEmail(email);
          expect(user).toBeDefined();
          expect(user.name).toBe(name);
          expect(user.email).toBe(email);
          
          // Cleanup
          await deleteUser(user.id);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  // Feature: graphql-todo-backend-api, Property 2: Password Hashing with Bcrypt
  it('hashes passwords with bcrypt for any password input', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 6, maxLength: 50 }),
        async (password) => {
          const name = 'Test User';
          const email = `test-${Date.now()}@example.com`;
          
          // Register user
          await registerUser(name, email, password);
          
          // Verify password is hashed
          const user = await findUserByEmail(email);
          expect(user.password_hash).toMatch(/^\$2[ab]\$/);  // bcrypt format
          expect(user.password_hash).not.toBe(password);     // not plain text
          
          // Verify cost factor is at least 10
          const costFactor = parseInt(user.password_hash.split('$')[2]);
          expect(costFactor).toBeGreaterThanOrEqual(10);
          
          // Cleanup
          await deleteUser(user.id);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  // Feature: graphql-todo-backend-api, Property 3: Email Uniqueness Enforcement
  it('rejects duplicate email registrations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        async (email) => {
          const name = 'Test User';
          const password = 'password123';
          
          // First registration should succeed
          const result1 = await registerUser(name, email, password);
          expect(result1.success).toBe(true);
          
          // Second registration with same email should fail
          await expect(
            registerUser(name, email, password)
          ).rejects.toThrow(/email already registered/i);
          
          // Cleanup
          const user = await findUserByEmail(email);
          await deleteUser(user.id);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

**Property Test Coverage:**

The following properties will be implemented as property-based tests:

- **User Registration & Authentication** (Properties 1-8): Test registration, password hashing, email uniqueness, login round-trips, credential validation
- **JWT Token Handling** (Properties 9-10): Test token verification, invalid token rejection, context population
- **Todo CRUD Operations** (Properties 11-21): Test todo creation, retrieval, updates, deletion with ownership and authorization
- **Data Integrity** (Properties 22-24): Test foreign key constraints, error responses, password hash exclusion

**Generator Strategies:**

- **Valid Inputs**: Use constrained generators (minLength, maxLength, email format)
- **Invalid Inputs**: Use separate tests with generators for empty strings, malformed emails, short passwords
- **Edge Cases**: Include boundary values (empty descriptions, maximum lengths, special characters)
- **User Isolation**: Generate unique emails using timestamps or UUIDs to avoid test interference
- **Cleanup**: Always delete test data after assertions to maintain database cleanliness

### Example-Based Unit Testing

**Library:** Jest or Mocha with Chai

Example-based tests cover specific scenarios, integration points, and cases where property-based testing is not suitable.

**Test Categories:**

#### 1. Specific Scenario Tests

```javascript
describe('Authentication Edge Cases', () => {
  it('rejects todo creation without Authorization header', async () => {
    const response = await graphqlRequest({
      query: CREATE_TODO_MUTATION,
      variables: { title: 'Test', description: 'Test' }
      // No Authorization header
    });
    
    expect(response.errors).toBeDefined();
    expect(response.errors[0].extensions.code).toBe('UNAUTHENTICATED');
  });
  
  it('rejects todo creation with malformed Bearer token', async () => {
    const response = await graphqlRequest({
      query: CREATE_TODO_MUTATION,
      variables: { title: 'Test', description: 'Test' },
      headers: { Authorization: 'InvalidFormat token123' }
    });
    
    expect(response.errors).toBeDefined();
    expect(response.errors[0].extensions.code).toBe('UNAUTHENTICATED');
  });
});
```

#### 2. Infrastructure Smoke Tests

```javascript
describe('GraphQL Schema Structure', () => {
  it('defines User type with correct fields', async () => {
    const schema = await introspectSchema();
    const userType = schema.types.find(t => t.name === 'User');
    
    expect(userType).toBeDefined();
    expect(userType.fields.map(f => f.name)).toEqual(
      expect.arrayContaining(['id', 'name', 'email', 'created_at'])
    );
    expect(userType.fields.find(f => f.name === 'password_hash')).toBeUndefined();
  });
  
  it('defines Todo type with correct fields', async () => {
    const schema = await introspectSchema();
    const todoType = schema.types.find(t => t.name === 'Todo');
    
    expect(todoType).toBeDefined();
    expect(todoType.fields.map(f => f.name)).toEqual(
      expect.arrayContaining(['id', 'title', 'description', 'completed', 'user_id', 'created_at'])
    );
  });
  
  it('defines all required Query operations', async () => {
    const schema = await introspectSchema();
    const queryType = schema.types.find(t => t.name === 'Query');
    
    expect(queryType.fields.map(f => f.name)).toEqual(
      expect.arrayContaining(['todos', 'todo', 'myTodos'])
    );
  });
  
  it('defines all required Mutation operations', async () => {
    const schema = await introspectSchema();
    const mutationType = schema.types.find(t => t.name === 'Mutation');
    
    expect(mutationType.fields.map(f => f.name)).toEqual(
      expect.arrayContaining(['register', 'login', 'createTodo', 'updateTodo', 'deleteTodo'])
    );
  });
});

describe('Database Schema', () => {
  it('has users table with correct columns', async () => {
    const columns = await getTableColumns('users');
    
    expect(columns).toEqual(
      expect.arrayContaining(['id', 'name', 'email', 'password_hash', 'created_at'])
    );
  });
  
  it('has todos table with correct columns', async () => {
    const columns = await getTableColumns('todos');
    
    expect(columns).toEqual(
      expect.arrayContaining(['id', 'title', 'description', 'completed', 'user_id', 'created_at'])
    );
  });
  
  it('enforces unique constraint on users.email', async () => {
    const constraints = await getTableConstraints('users');
    
    expect(constraints.unique).toContain('email');
  });
});

describe('Server Configuration', () => {
  it('starts server on configured port', async () => {
    const port = 4001;
    const server = await startServer({ port });
    
    const response = await fetch(`http://localhost:${port}/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ __typename }' })
    });
    
    expect(response.status).toBe(200);
    
    await server.stop();
  });
});
```

#### 3. Integration Tests

```javascript
describe('End-to-End User Flows', () => {
  it('completes full user registration and todo management flow', async () => {
    // Register user
    const registerResponse = await graphqlRequest({
      query: REGISTER_MUTATION,
      variables: {
        name: 'Integration Test User',
        email: 'integration@test.com',
        password: 'testpass123'
      }
    });
    
    expect(registerResponse.data.register.token).toBeDefined();
    const token = registerResponse.data.register.token;
    
    // Create todo
    const createResponse = await graphqlRequest({
      query: CREATE_TODO_MUTATION,
      variables: { title: 'Test Todo', description: 'Test Description' },
      headers: { Authorization: `Bearer ${token}` }
    });
    
    expect(createResponse.data.createTodo.id).toBeDefined();
    const todoId = createResponse.data.createTodo.id;
    
    // Retrieve todos
    const todosResponse = await graphqlRequest({
      query: MY_TODOS_QUERY,
      headers: { Authorization: `Bearer ${token}` }
    });
    
    expect(todosResponse.data.myTodos).toHaveLength(1);
    expect(todosResponse.data.myTodos[0].id).toBe(todoId);
    
    // Update todo
    const updateResponse = await graphqlRequest({
      query: UPDATE_TODO_MUTATION,
      variables: { id: todoId, completed: true },
      headers: { Authorization: `Bearer ${token}` }
    });
    
    expect(updateResponse.data.updateTodo.completed).toBe(true);
    
    // Delete todo
    const deleteResponse = await graphqlRequest({
      query: DELETE_TODO_MUTATION,
      variables: { id: todoId },
      headers: { Authorization: `Bearer ${token}` }
    });
    
    expect(deleteResponse.data.deleteTodo.id).toBe(todoId);
    
    // Verify deletion
    const finalTodosResponse = await graphqlRequest({
      query: MY_TODOS_QUERY,
      headers: { Authorization: `Bearer ${token}` }
    });
    
    expect(finalTodosResponse.data.myTodos).toHaveLength(0);
  });
});
```

### Test Environment Setup

**Database:**
- Use separate test database (SQLite in-memory or dedicated MySQL test database)
- Reset database before each test suite
- Clean up test data after each test

**Configuration:**
- Use environment variables for test configuration
- Separate JWT secret for testing
- Disable rate limiting in tests
- Enable detailed error messages

**Mocking:**
- Mock external dependencies if any (email services, etc.)
- Do not mock database for integration tests
- Mock time for timestamp testing if needed

### Test Execution

**Local Development:**
```bash
npm test                    # Run all tests
npm run test:unit          # Run unit tests only
npm run test:properties    # Run property-based tests only
npm run test:integration   # Run integration tests only
npm run test:coverage      # Generate coverage report
```

**CI/CD Pipeline:**
- Run all tests on every commit
- Require 80%+ code coverage
- Run property tests with 100 iterations minimum
- Fail build on any test failure

### Coverage Goals

- **Line Coverage**: 80%+ overall
- **Branch Coverage**: 75%+ for business logic
- **Property Coverage**: All 24 correctness properties implemented
- **Smoke Test Coverage**: All infrastructure properties verified
- **Integration Coverage**: Key user flows tested end-to-end

### Testing Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Cleanup**: Always clean up test data to avoid interference
3. **Determinism**: Tests should produce consistent results (handle timestamps, random data)
4. **Fast Execution**: Keep unit tests fast (<1s each), integration tests reasonable (<5s each)
5. **Clear Assertions**: Use descriptive assertion messages
6. **Test Data**: Use realistic but clearly identifiable test data
7. **Error Testing**: Test both success and failure paths
8. **Security Testing**: Verify authentication and authorization in multiple scenarios

