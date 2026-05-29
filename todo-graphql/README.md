# GraphQL Todo Backend API

A learning project demonstrating core GraphQL concepts through a todo management system with authentication.

## Technology Stack

- **Runtime**: Node.js
- **GraphQL Server**: Apollo Server 3.x
- **Web Framework**: Express.js 4.x
- **Database**: SQLite (better-sqlite3)
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcrypt
- **Testing**: Jest + fast-check (property-based testing)

## Project Structure

```
├── src/
│   ├── db/              # Database connection and schema
│   ├── schema/          # GraphQL type definitions
│   ├── resolvers/       # GraphQL resolvers
│   ├── services/        # Business logic layer
│   ├── context.js       # Apollo Server context (JWT verification)
│   └── index.js         # Server entry point
├── test/
│   ├── unit/            # Unit tests
│   ├── properties/      # Property-based tests
│   ├── integration/     # Integration tests
│   └── helpers/         # Test utilities
└── .env                 # Environment configuration
```

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env and set JWT_SECRET to a secure random string
```

3. Initialize the database (will be implemented in Task 2)

4. Start the server:
```bash
npm start
```

## Development

- `npm run dev` - Start server with auto-reload
- `npm test` - Run all tests
- `npm run test:unit` - Run unit tests only
- `npm run test:properties` - Run property-based tests only
- `npm run test:integration` - Run integration tests only
- `npm run test:coverage` - Generate coverage report

## GraphQL Endpoint

Once running, access the GraphQL playground at:
```
http://localhost:4000/graphql
```

## Features

- User registration and authentication with JWT
- Todo CRUD operations (Create, Read, Update, Delete)
- Authorization (users can only modify their own todos)
- Password hashing with bcrypt
- Property-based testing for comprehensive validation

## Requirements

- Node.js v20+
- npm or yarn
