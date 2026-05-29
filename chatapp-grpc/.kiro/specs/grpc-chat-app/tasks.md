# Implementation Plan: gRPC Chat Application

## Overview

A real-time gRPC chat application in TypeScript with local MySQL. Run the TypeScript gRPC server with ts-node. Test with grpcurl or any gRPC client.

**Stack:**
- Language: TypeScript (Node.js)
- gRPC: @grpc/grpc-js + @grpc/proto-loader
- Database: MySQL 8 (Docker) with mysql2 driver (raw SQL, no ORM)
- Auth: JWT via jsonwebtoken
- Password hashing: bcrypt
- File storage: Local filesystem

## Tasks

- [ ] 1. Project scaffold and infrastructure
  - [ ] 1.1 Initialize Node.js project and directory structure
    - Create `package.json` with TypeScript, @grpc/grpc-js, @grpc/proto-loader, mysql2, jsonwebtoken, bcrypt, uuid
    - Create `tsconfig.json`
    - Create directory tree: `src/config/`, `src/db/`, `src/interceptors/`, `src/services/`, `src/utils/`, `proto/`
    - _Requirements: 18.1_

  - [ ] 1.2 Create server configuration loader
    - Write `src/config/index.ts` that reads MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE, JWT_SECRET, GRPC_PORT, UPLOAD_DIR, MAX_FILE_SIZE from env with defaults
    - _Requirements: 18.3_

- [ ] 2. Proto definitions
  - [ ] 2.1 Write chat.proto with all service and message definitions
    - Keep the existing proto/chat/chat.proto (already written, works with any language)
    - _Requirements: 9.1, 13.1, 15.1_

- [ ] 3. Database layer
  - [ ] 3.1 Create SQL migration file
    - Write `src/db/migrations/001_init.sql` with all tables for MySQL: users, rooms, room_members, messages, message_receipts, files, notifications
    - Use MySQL syntax (UUID as CHAR(36), TIMESTAMP, etc.)
    - _Requirements: 18.5_

  - [ ] 3.2 Implement database connection and migration runner
    - Write `src/db/index.ts` with mysql2 pool initialization
    - Implement `runMigrations()` that reads and executes SQL migration files on startup
    - Export pool for services to use
    - _Requirements: 18.3, 18.4, 18.5_

- [ ] 4. Auth utilities and interceptors
  - [ ] 4.1 Implement password hashing utilities
    - Write `src/utils/password.ts` with hashPassword and checkPassword using bcrypt
    - _Requirements: 1.3_

  - [ ] 4.2 Implement JWT generation and validation utilities
    - Write `src/utils/jwt.ts` with generateToken and validateToken using jsonwebtoken
    - 24-hour expiry, claims: userId, username
    - _Requirements: 2.1, 2.3, 3.3_

  - [ ] 4.3 Implement auth interceptor
    - Write `src/interceptors/auth.ts` with a gRPC server interceptor that validates JWT from metadata
    - Skip validation for Register and Login methods
    - _Requirements: 3.1, 3.2, 3.4_

  - [ ] 4.4 Implement rate limit interceptor
    - Write `src/interceptors/ratelimit.ts` with token bucket (30 tokens, 1/sec refill) per user
    - _Requirements: 11.1, 11.2, 11.3_

- [ ] 5. Auth and Room service implementations
  - [ ] 5.1 Implement AuthService
    - Write `src/services/auth.ts` implementing Register, Login, ValidateToken, GetProfile, UpdateProfile
    - Raw SQL queries with mysql2
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 3.3, 4.1, 4.2, 4.3_

  - [ ] 5.2 Implement RoomService
    - Write `src/services/room.ts` implementing CreateRoom, JoinRoom, LeaveRoom, ListRooms, GetRoom, ListRoomMembers, CreateDirectMessage, GetRoomHistory
    - Raw SQL queries with mysql2
    - _Requirements: 5.1, 5.2, 5.3, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.3, 12.1, 12.2, 12.3_

- [ ] 6. Chat service with Hub pattern (bidirectional streaming)
  - [ ] 6.1 Implement the Hub
    - Write `src/services/hub.ts` with Hub class: register, unregister, broadcast, isOnline, getOnlineMembers
    - _Requirements: 9.1, 16.1, 16.2, 16.3_

  - [ ] 6.2 Implement ChatService with bidirectional streaming
    - Write `src/services/chat.ts` implementing the Chat bidirectional stream RPC
    - On stream open: register with Hub, deliver queued offline messages
    - Message handling: validate membership, deduplicate, persist, broadcast, queue for offline
    - On stream close: unregister from Hub
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 10.1, 10.2, 10.3, 17.1, 17.3, 17.4_

- [ ] 7. File service and Notification service
  - [ ] 7.1 Implement FileService with client streaming upload
    - Write `src/services/file.ts` implementing UploadFile (client streaming), GetFileURL (unary), DeleteFile (unary)
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 14.1, 14.2, 14.3, 14.4_

  - [ ] 7.2 Implement NotificationService with server streaming
    - Write `src/services/notification.ts` implementing SubscribeNotifications (server streaming), GetUnreadCount (unary), MarkNotificationsRead (unary)
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

- [ ] 8. Server bootstrap and wiring
  - [ ] 8.1 Implement server entry point
    - Write `src/index.ts`: load config, init DB + migrations, create Hub, create gRPC server with interceptors, register all 5 services, listen on GRPC_PORT, graceful shutdown
    - _Requirements: 18.1, 18.3, 18.5_

- [ ] 9. Documentation
  - [ ] 9.1 Write README with setup and usage instructions
    - Document: prerequisites (Node.js 20+, MySQL), how to run (npm run dev), env vars, how to test with grpcurl
    - _Requirements: 18.1_

## Notes

- No tests, no Docker, no Envoy, no frontend
- TypeScript with @grpc/grpc-js and @grpc/proto-loader (dynamic proto loading, no code generation needed)
- Local MySQL, raw SQL with mysql2 (no ORM)
- Run with: `npm run dev` (server connects to local MySQL)
- Test manually with grpcurl

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1"] },
    { "id": 2, "tasks": ["3.1"] },
    { "id": 3, "tasks": ["3.2"] },
    { "id": 4, "tasks": ["4.1", "4.2"] },
    { "id": 5, "tasks": ["4.3", "4.4"] },
    { "id": 6, "tasks": ["5.1", "5.2"] },
    { "id": 7, "tasks": ["6.1"] },
    { "id": 8, "tasks": ["6.2"] },
    { "id": 9, "tasks": ["7.1", "7.2"] },
    { "id": 10, "tasks": ["8.1"] },
    { "id": 11, "tasks": ["9.1"] }
  ]
}
```
