# gRPC Chat Application

A real-time chat application using gRPC with TypeScript, featuring all four gRPC call types.

## Features
- User authentication (Register/Login with JWT)
- Chat rooms (create, join, leave, list)
- Direct messages
- Real-time messaging (bidirectional streaming)
- File upload (client streaming, 50MB max)
- Notifications (server streaming)
- Message deduplication
- Offline message delivery
- Rate limiting (30 msg/sec per user)

## Tech Stack
- TypeScript / Node.js
- @grpc/grpc-js + @grpc/proto-loader
- MySQL 8 (local)
- bcrypt + jsonwebtoken

## Prerequisites
- Node.js 20+
- MySQL 8 running locally
- grpcurl (for testing)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create MySQL database:
```sql
CREATE DATABASE chatdb;
```

3. Set environment variables (or use defaults):
```bash
export MYSQL_HOST=localhost
export MYSQL_PORT=3306
export MYSQL_USER=root
export MYSQL_PASSWORD=
export MYSQL_DATABASE=chatdb
export JWT_SECRET=your-secret-here
export GRPC_PORT=50051
export UPLOAD_DIR=./uploads
```

4. Run the server:
```bash
npm run dev
```

The server will run migrations automatically on startup.

## Testing with grpcurl

Register:
```bash
grpcurl -plaintext -d '{"username":"alice","password":"password123"}' localhost:50051 chat.AuthService/Register
```

Login:
```bash
grpcurl -plaintext -d '{"username":"alice","password":"password123"}' localhost:50051 chat.AuthService/Login
```

Create Room (with auth):
```bash
grpcurl -plaintext -H "authorization: Bearer <token>" -d '{"name":"general"}' localhost:50051 chat.RoomService/CreateRoom
```

List services:
```bash
grpcurl -plaintext localhost:50051 list
```

## gRPC Services

| Service | Method | Type |
|---------|--------|------|
| AuthService | Register, Login, ValidateToken, GetProfile, UpdateProfile | Unary |
| RoomService | CreateRoom, GetRoom, JoinRoom, LeaveRoom, ListRooms, ListRoomMembers, CreateDirectMessage, GetRoomHistory | Unary |
| ChatService | Chat | Bidirectional Streaming |
| FileService | UploadFile | Client Streaming |
| FileService | GetFileURL, DeleteFile | Unary |
| NotificationService | SubscribeNotifications | Server Streaming |
| NotificationService | GetUnreadCount, MarkNotificationsRead | Unary |

## Project Structure
```
├── proto/chat/chat.proto    # gRPC service definitions
├── src/
│   ├── index.ts             # Server entry point
│   ├── config/index.ts      # Configuration
│   ├── db/index.ts          # MySQL pool + migrations
│   ├── db/migrations/       # SQL schema
│   ├── interceptors/        # Auth + rate limiting
│   ├── services/            # Service implementations
│   └── utils/               # JWT + password helpers
├── package.json
└── tsconfig.json
```
