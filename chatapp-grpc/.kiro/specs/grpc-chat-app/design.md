# Design Document: gRPC Chat Application

## Overview

A real-time gRPC chat application built as a Go monolithic server with PostgreSQL persistence, Envoy proxy for grpc-web support, and an in-memory Hub pattern for managing bidirectional streams. The system provides user authentication (JWT), room-based messaging, file sharing via chunked uploads, notifications, and offline message delivery using all four gRPC call types.

## Architecture

The system follows a monolithic gRPC server architecture written in Go. A single binary hosts all services (Auth, Room, Chat, File, Notification) and uses an in-memory Hub for real-time stream management. PostgreSQL provides persistence via the pgx driver with raw SQL. An Envoy proxy sits in front for grpc-web translation, enabling browser-based clients.

### High-Level Architecture

```
┌─────────────┐     grpc-web      ┌──────────────┐     gRPC      ┌──────────────────────────────┐
│   Browser   │ ─────────────────▶│ Envoy Proxy  │─────────────▶│       ChatServer (Go)         │
│   Client    │                   │  :8080       │              │         :50051                │
└─────────────┘                   └──────────────┘              │                              │
                                                                 │  ┌─────────────────────────┐ │
                                                                 │  │   gRPC Interceptors     │ │
                                                                 │  │  (Auth + RateLimit)     │ │
                                                                 │  └───────────┬─────────────┘ │
                                                                 │              │               │
                                                                 │  ┌───────────▼─────────────┐ │
                                                                 │  │      Services           │ │
                                                                 │  │  Auth│Room│Chat│File│   │ │
                                                                 │  │  Notification           │ │
                                                                 │  └───────────┬─────────────┘ │
                                                                 │              │               │
                                                                 │  ┌───────────▼─────────────┐ │
                                                                 │  │         Hub             │ │
                                                                 │  │  (Stream Registry +     │ │
                                                                 │  │   Message Routing)      │ │
                                                                 │  └───────────┬─────────────┘ │
                                                                 │              │               │
                                                                 └──────────────┼───────────────┘
                                                                                │
                                                                 ┌──────────────▼───────────────┐
                                                                 │     PostgreSQL + Local FS    │
                                                                 └──────────────────────────────┘
```

### gRPC Call Types Usage

| Service             | RPC Method              | Call Type              |
|---------------------|-------------------------|------------------------|
| AuthService         | Register, Login, etc.   | Unary                  |
| RoomService         | CRUD + History          | Unary                  |
| ChatService         | Chat                    | Bidirectional Streaming|
| FileService         | UploadFile              | Client Streaming       |
| NotificationService | SubscribeNotifications  | Server Streaming       |


## Components and Interfaces

### 1. gRPC Interceptors

**Auth Interceptor** (`server/interceptors/auth.go`):
- Extracts JWT from `authorization` metadata key
- Validates token signature and expiry using HMAC-SHA256
- Injects user claims (user_id, username) into the gRPC context
- Skips validation for Register and Login methods

**Rate Limit Interceptor** (`server/interceptors/ratelimit.go`):
- Applies only to ChatService stream messages
- Maintains a per-user TokenBucket (30 tokens, 1 token/sec refill)
- Returns `RESOURCE_EXHAUSTED` when bucket is empty

### 2. AuthService (`server/services/auth_service.go`)

Handles user lifecycle: registration, login, token validation, and profile management. All methods are unary RPCs.

### 3. RoomService (`server/services/room_service.go`)

Manages rooms, memberships, direct messages, and message history. All methods are unary RPCs. Supports cursor-based pagination for history.

### 4. ChatService (`server/services/chat_service.go`)

Exposes a single bidirectional streaming RPC. On stream open:
1. Registers stream with Hub
2. Delivers queued offline messages
3. Enters send/receive loop

On each incoming message:
- Validates room membership
- Checks rate limit
- Deduplicates via ClientMessageID
- Persists message
- Routes through Hub to active recipients
- Queues for offline recipients

### 5. FileService (`server/services/file_service.go`)

Client streaming RPC for uploads. First chunk contains metadata (filename, room_id). Subsequent chunks contain file bytes (64KB each). Tracks cumulative size and aborts at 50MB. Unary RPCs for GetFileURL and DeleteFile.

### 6. NotificationService (`server/services/notification_service.go`)

Server streaming RPC for real-time notifications. Unary RPCs for GetUnreadCount and MarkNotificationsRead. Listens to Hub events to push notifications.

### 7. Hub (`server/services/hub.go`)

Central in-memory registry for active client streams and presence state.


```go
type Hub struct {
    mu          sync.RWMutex
    streams     map[string]chan *ChatMessage  // userID -> message channel
    presence    map[string]bool               // userID -> online status
}

func (h *Hub) Register(userID string, ch chan *ChatMessage)
func (h *Hub) Unregister(userID string)
func (h *Hub) Broadcast(roomID string, msg *ChatMessage, memberIDs []string)
func (h *Hub) IsOnline(userID string) bool
func (h *Hub) GetOnlineMembers(roomID string, memberIDs []string) []string
```

### 8. Database Layer (`server/db/db.go`)

Thin wrapper around pgx connection pool. Exposes `*pgxpool.Pool` for services to execute raw SQL queries directly.

### 9. Configuration (`server/config/config.go`)

Reads environment variables for:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — HMAC signing key
- `GRPC_PORT` — server listen port (default 50051)
- `UPLOAD_DIR` — file storage directory (default `./uploads`)
- `MAX_FILE_SIZE` — upload limit in bytes (default 50MB)

### 10. Proto Service Definitions (Interfaces)

```protobuf
syntax = "proto3";
package chat;
option go_package = "grpc-chat/proto/chat";

service AuthService {
  rpc Register(RegisterRequest) returns (AuthResponse);
  rpc Login(LoginRequest) returns (AuthResponse);
  rpc ValidateToken(ValidateTokenRequest) returns (UserClaims);
  rpc GetProfile(GetProfileRequest) returns (UserProfile);
  rpc UpdateProfile(UpdateProfileRequest) returns (UserProfile);
}

service RoomService {
  rpc CreateRoom(CreateRoomRequest) returns (Room);
  rpc JoinRoom(JoinRoomRequest) returns (JoinRoomResponse);
  rpc LeaveRoom(LeaveRoomRequest) returns (LeaveRoomResponse);
  rpc ListRooms(ListRoomsRequest) returns (ListRoomsResponse);
  rpc GetRoom(GetRoomRequest) returns (Room);
  rpc ListRoomMembers(ListRoomMembersRequest) returns (ListRoomMembersResponse);
  rpc CreateDirectMessage(CreateDirectMessageRequest) returns (Room);
  rpc GetRoomHistory(GetRoomHistoryRequest) returns (GetRoomHistoryResponse);
}

service ChatService {
  rpc Chat(stream ChatMessage) returns (stream ChatMessage);
}

service FileService {
  rpc UploadFile(stream FileChunk) returns (UploadFileResponse);
  rpc GetFileURL(GetFileURLRequest) returns (GetFileURLResponse);
  rpc DeleteFile(DeleteFileRequest) returns (DeleteFileResponse);
}

service NotificationService {
  rpc SubscribeNotifications(SubscribeRequest) returns (stream Notification);
  rpc GetUnreadCount(GetUnreadCountRequest) returns (UnreadCountResponse);
  rpc MarkNotificationsRead(MarkReadRequest) returns (MarkReadResponse);
}
```


### Key Message Types

```protobuf
message RegisterRequest {
  string username = 1;
  string password = 2;
}

message AuthResponse {
  string token = 1;
  string user_id = 2;
}

message ChatMessage {
  string message_id = 1;
  string client_message_id = 2;
  string room_id = 3;
  string sender_id = 4;
  string content = 5;
  google.protobuf.Timestamp timestamp = 6;
  MessageType type = 7;
}

enum MessageType {
  TEXT = 0;
  SYSTEM = 1;
  FILE_SHARE = 2;
}

message FileChunk {
  oneof data {
    FileMetadata metadata = 1;
    bytes chunk = 2;
  }
}

message FileMetadata {
  string filename = 1;
  string room_id = 2;
}

message GetRoomHistoryRequest {
  string room_id = 1;
  string cursor = 2;    // message_id for cursor-based pagination
  int32 limit = 3;      // page size, default 50
}

message GetRoomHistoryResponse {
  repeated ChatMessage messages = 1;
  string next_cursor = 2;
  bool has_more = 3;
}

message Notification {
  string notification_id = 1;
  string user_id = 2;
  string room_id = 3;
  string message_id = 4;
  string sender_username = 5;
  string content_preview = 6;
  google.protobuf.Timestamp created_at = 7;
  bool is_read = 8;
}
```

## Data Models

### PostgreSQL Schema

```sql
-- 001_init.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(64) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(128),
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


```sql
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(128) NOT NULL,
    is_direct BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE room_members (
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (room_id, user_id)
);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id),
    client_message_id VARCHAR(128),
    content TEXT NOT NULL,
    message_type INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(sender_id, room_id, client_message_id)
);

CREATE TABLE message_receipts (
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status INT NOT NULL DEFAULT 0,  -- 0=SENT, 1=DELIVERED, 2=READ
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (message_id, user_id)
);

CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    uploader_id UUID NOT NULL REFERENCES users(id),
    filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    sender_username VARCHAR(64) NOT NULL,
    content_preview VARCHAR(100),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_room_created ON messages(room_id, created_at);
CREATE INDEX idx_messages_dedup ON messages(sender_id, room_id, client_message_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_room_members_user ON room_members(user_id);
CREATE INDEX idx_files_room ON files(room_id);
```


## Key Algorithms and Patterns

### Token Bucket Rate Limiting

```go
type TokenBucket struct {
    mu         sync.Mutex
    tokens     float64
    maxTokens  float64
    refillRate float64       // tokens per second
    lastRefill time.Time
}

func NewTokenBucket(maxTokens float64, refillRate float64) *TokenBucket {
    return &TokenBucket{
        tokens:     maxTokens,
        maxTokens:  maxTokens,
        refillRate: refillRate,
        lastRefill: time.Now(),
    }
}

func (tb *TokenBucket) Allow() bool {
    tb.mu.Lock()
    defer tb.mu.Unlock()

    now := time.Now()
    elapsed := now.Sub(tb.lastRefill).Seconds()
    tb.tokens = math.Min(tb.maxTokens, tb.tokens+(elapsed*tb.refillRate))
    tb.lastRefill = now

    if tb.tokens >= 1 {
        tb.tokens--
        return true
    }
    return false
}
```

### Hub Message Routing

```go
func (h *Hub) Broadcast(roomID string, msg *ChatMessage, memberIDs []string) {
    h.mu.RLock()
    defer h.mu.RUnlock()

    for _, memberID := range memberIDs {
        if ch, ok := h.streams[memberID]; ok {
            select {
            case ch <- msg:
                // delivered to active stream
            default:
                // channel full, message will be queued by caller
            }
        }
        // offline members handled by caller (queue to DB)
    }
}
```

### Offline Message Queue (Queue-and-Push)

Messages for offline users are stored in the `messages` table. On reconnect, the ChatService queries undelivered messages:

```go
func (s *ChatService) deliverQueuedMessages(ctx context.Context, userID string, stream ChatService_ChatServer) error {
    rows, err := s.db.Query(ctx, `
        SELECT m.id, m.room_id, m.sender_id, m.content, m.message_type, m.created_at
        FROM messages m
        JOIN room_members rm ON rm.room_id = m.room_id AND rm.user_id = $1
        LEFT JOIN message_receipts mr ON mr.message_id = m.id AND mr.user_id = $1
        WHERE mr.message_id IS NULL AND m.sender_id != $1
        ORDER BY m.created_at ASC
    `, userID)
    // iterate and send each message on stream
    // create DELIVERED receipt for each
}
```

### JWT Utilities

```go
// server/utils/jwt.go
func GenerateToken(userID, username, secret string, expiry time.Duration) (string, error)
func ValidateToken(tokenStr, secret string) (*Claims, error)

type Claims struct {
    UserID   string `json:"user_id"`
    Username string `json:"username"`
    jwt.RegisteredClaims
}
```

### File Upload Assembly

```go
func (s *FileService) UploadFile(stream FileService_UploadFileServer) error {
    var metadata *FileMetadata
    var file *os.File
    var totalSize int64

    for {
        chunk, err := stream.Recv()
        if err == io.EOF {
            break
        }
        switch data := chunk.Data.(type) {
        case *FileChunk_Metadata:
            metadata = data.Metadata
            // validate room membership, create temp file
        case *FileChunk_Chunk:
            totalSize += int64(len(data.Chunk))
            if totalSize > s.maxFileSize {
                return status.Error(codes.ResourceExhausted, "file exceeds 50MB limit")
            }
            file.Write(data.Chunk)
        }
    }
    // persist metadata to DB, return response
}
```


## Error Handling

All errors use standard gRPC status codes:

| Scenario                          | gRPC Code            |
|-----------------------------------|----------------------|
| Missing/expired JWT               | UNAUTHENTICATED      |
| Empty username/password/room name | INVALID_ARGUMENT     |
| Duplicate username                | ALREADY_EXISTS        |
| Already a room member             | ALREADY_EXISTS        |
| Wrong credentials                 | UNAUTHENTICATED      |
| Non-member access                 | PERMISSION_DENIED    |
| Non-owner file deletion           | PERMISSION_DENIED    |
| Room/User/File not found          | NOT_FOUND            |
| Leave room when not member        | FAILED_PRECONDITION  |
| Rate limit exceeded               | RESOURCE_EXHAUSTED   |
| File too large                    | RESOURCE_EXHAUSTED   |
| Internal DB/IO errors             | INTERNAL             |

Services return structured gRPC errors with descriptive messages. The auth interceptor wraps all unhandled panics with `INTERNAL` status.

## Infrastructure

### Docker Compose

```yaml
# docker-compose.yml
version: "3.8"
services:
  chatserver:
    build: ./server
    ports:
      - "50051:50051"
    environment:
      - DATABASE_URL=postgres://chat:chat@postgres:5432/chatdb?sslmode=disable
      - JWT_SECRET=dev-secret-change-in-prod
      - GRPC_PORT=50051
      - UPLOAD_DIR=/data/uploads
    volumes:
      - uploads:/data/uploads
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=chat
      - POSTGRES_PASSWORD=chat
      - POSTGRES_DB=chatdb
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U chat"]
      interval: 5s
      timeout: 3s
      retries: 5

  envoy:
    image: envoyproxy/envoy:v1.28-latest
    ports:
      - "8080:8080"
    volumes:
      - ./envoy/envoy.yaml:/etc/envoy/envoy.yaml
    depends_on:
      - chatserver

volumes:
  pgdata:
  uploads:
```

### Envoy Configuration

```yaml
# envoy/envoy.yaml
static_resources:
  listeners:
    - name: listener_0
      address:
        socket_address: { address: 0.0.0.0, port_value: 8080 }
      filter_chains:
        - filters:
            - name: envoy.filters.network.http_connection_manager
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                codec_type: auto
                stat_prefix: ingress_http
                route_config:
                  name: local_route
                  virtual_hosts:
                    - name: local_service
                      domains: ["*"]
                      routes:
                        - match: { prefix: "/" }
                          route: { cluster: grpc_service, timeout: 0s }
                      cors:
                        allow_origin_string_match:
                          - prefix: "*"
                        allow_methods: GET, PUT, DELETE, POST, OPTIONS
                        allow_headers: keep-alive,user-agent,cache-control,content-type,content-transfer-encoding,x-custom-header,x-accept-content-transfer-encoding,x-accept-response-streaming,x-user-agent,x-grpc-web,grpc-timeout,authorization
                        expose_headers: grpc-status,grpc-message
                http_filters:
                  - name: envoy.filters.http.grpc_web
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.grpc_web.v3.GrpcWeb
                  - name: envoy.filters.http.cors
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.cors.v3.Cors
                  - name: envoy.filters.http.router
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
  clusters:
    - name: grpc_service
      connect_timeout: 0.25s
      type: logical_dns
      lb_policy: round_robin
      typed_extension_protocol_options:
        envoy.extensions.upstreams.http.v3.HttpProtocolOptions:
          "@type": type.googleapis.com/envoy.extensions.upstreams.http.v3.HttpProtocolOptions
          explicit_http_config:
            http2_protocol_options: {}
      load_assignment:
        cluster_name: grpc_service
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address: { address: chatserver, port_value: 50051 }
```


## Directory Structure

```
grpc-chat/
├── proto/
│   └── chat/
│       └── chat.proto              # All service and message definitions
├── server/
│   ├── main.go                     # Server bootstrap, interceptor wiring, service registration
│   ├── config/
│   │   └── config.go               # Environment variable loading
│   ├── db/
│   │   ├── db.go                   # pgx pool initialization
│   │   └── migrations/
│   │       └── 001_init.sql        # Schema creation
│   ├── interceptors/
│   │   ├── auth.go                 # JWT validation interceptor
│   │   └── ratelimit.go            # Token bucket interceptor
│   ├── services/
│   │   ├── auth_service.go         # AuthService implementation
│   │   ├── room_service.go         # RoomService implementation
│   │   ├── chat_service.go         # ChatService (bidirectional streaming)
│   │   ├── file_service.go         # FileService (client streaming upload)
│   │   ├── notification_service.go # NotificationService (server streaming)
│   │   └── hub.go                  # Hub (stream registry + routing)
│   └── utils/
│       ├── jwt.go                  # JWT generation and validation
│       └── password.go             # bcrypt hashing utilities
├── client/                         # Minimal test client scaffold
├── envoy/
│   └── envoy.yaml                  # Envoy grpc-web proxy config
├── docker-compose.yml              # Full stack orchestration
├── Makefile                        # Build, proto gen, test, docker commands
└── go.mod                          # Go module definition
```

## Testing Strategy

### Unit Tests (Example-Based)
- Auth validation edge cases: empty credentials, whitespace-only inputs
- Room operations edge cases: non-existent rooms, non-existent users for DMs
- File size boundary: exactly 50MB (pass) vs 50MB+1 byte (fail)
- Non-member file access and deletion attempts
- GetFileURL for non-existent files

### Property-Based Tests
- All 21 correctness properties below, each with minimum 100 iterations
- Generators for: usernames, passwords, room names, message content, file bytes, UUIDs
- Test the pure logic layer (token bucket, JWT encode/decode, Hub routing, receipt state machine) with mocks for DB

### Integration Tests
- Docker Compose full-stack smoke test: all services start and respond
- Envoy grpc-web translation: browser client can reach ChatServer
- Database migration verification: all tables created on startup
- End-to-end flow: register → login → create room → send message → receive notification

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Password hashing irreversibility

*For any* password provided during registration, the stored value in the database SHALL be a valid bcrypt hash that does not equal the plaintext password, and bcrypt.CompareHashAndPassword SHALL succeed when given the original password.

**Validates: Requirements 1.3**

### Property 2: Duplicate registration rejection

*For any* username that has been successfully registered, a subsequent registration attempt with the same username SHALL return an ALREADY_EXISTS error and SHALL NOT create a second user record.

**Validates: Requirements 1.2**

### Property 3: JWT claims round-trip

*For any* registered user who logs in, the returned JWT SHALL contain claims with the correct user_id and username, and calling ValidateToken with that JWT SHALL return identical claims. The JWT expiry SHALL be 24 hours from issuance.

**Validates: Requirements 2.1, 2.3, 3.3**

### Property 4: Authentication enforcement

*For any* protected RPC method and any invalid JWT (missing, malformed, or expired), the server SHALL reject the request with an UNAUTHENTICATED error code. Register and Login SHALL remain accessible without a JWT.

**Validates: Requirements 3.1, 3.2, 3.4**


### Property 5: Profile update round-trip

*For any* registered user and any valid profile update (display_name, avatar_url), applying UpdateProfile and then calling GetProfile SHALL return the updated values.

**Validates: Requirements 4.1, 4.2**

### Property 6: Room membership join/leave round-trip

*For any* authenticated user and any existing room, joining the room SHALL add the user to the membership list, and subsequently leaving SHALL remove them. After leave, the user SHALL NOT appear in ListRoomMembers.

**Validates: Requirements 6.1, 6.2**

### Property 7: Duplicate join rejection

*For any* user who is already a member of a room, a subsequent JoinRoom request SHALL return an ALREADY_EXISTS error and SHALL NOT create a duplicate membership record.

**Validates: Requirements 6.4**

### Property 8: Room listing completeness

*For any* user who is a member of N rooms, ListRooms SHALL return exactly those N rooms and no others. GetRoom SHALL return correct name and member count for each.

**Validates: Requirements 7.1, 7.2**

### Property 9: Non-member access denial

*For any* user who is NOT a member of a room, GetRoom, GetRoomHistory, and sending messages to that room SHALL all return PERMISSION_DENIED.

**Validates: Requirements 7.3, 9.3, 12.2**

### Property 10: Direct message idempotence

*For any* pair of users (A, B), creating a DirectMessage between them SHALL produce a room with exactly two members. Creating the same DirectMessage again SHALL return the same room ID.

**Validates: Requirements 8.1, 8.2**

### Property 11: Message deduplication

*For any* message sent with a given ClientMessageID by the same user to the same room, sending it multiple times SHALL result in exactly one stored message in the database.

**Validates: Requirements 9.5**

### Property 12: Message ordering invariant

*For any* sequence of messages sent to a room, GetRoomHistory SHALL return them in chronological order by server-assigned timestamp. Cursor-based pagination SHALL produce no duplicates and complete coverage across pages.

**Validates: Requirements 9.4, 12.1, 12.3**

### Property 13: Offline message delivery completeness

*For any* user who was offline when N messages were sent to their rooms, reconnecting SHALL deliver all N messages in chronological order before any new messages are processed.

**Validates: Requirements 10.1, 10.2, 10.3**


### Property 14: Token bucket rate limiting

*For any* user stream, sending messages SHALL succeed while tokens are available (up to 30 in burst) and SHALL return RESOURCE_EXHAUSTED when the bucket is empty. After waiting T seconds, floor(T) additional messages SHALL be allowed (1 token/sec refill).

**Validates: Requirements 11.1, 11.2, 11.3**

### Property 15: File upload chunk assembly round-trip

*For any* file content split into 64KB chunks and uploaded via client streaming, the assembled file on the filesystem SHALL be byte-for-byte identical to the original content. File metadata (filename, size, uploader, room) SHALL be correctly stored in the database.

**Validates: Requirements 13.1, 13.3**

### Property 16: File ownership enforcement

*For any* uploaded file, only the original uploader SHALL be able to delete it. A DeleteFile request from any other user SHALL return PERMISSION_DENIED and the file SHALL remain intact.

**Validates: Requirements 14.2, 14.3**

### Property 17: Notification generation for room messages

*For any* message sent to a room with N members, the system SHALL generate exactly N-1 notifications (one for each member except the sender). GetUnreadCount SHALL reflect the correct count of unread notifications.

**Validates: Requirements 15.2, 15.3**

### Property 18: Notification read state transition

*For any* set of notification IDs marked as read, those notifications SHALL have is_read=true, and GetUnreadCount SHALL decrease by the number of newly-marked notifications.

**Validates: Requirements 15.4**

### Property 19: Presence reflects connection state

*For any* user, their presence status SHALL be online if and only if they have an active bidirectional chat stream registered with the Hub. Opening a stream SHALL set status to online; disconnecting SHALL set status to offline.

**Validates: Requirements 16.1, 16.2, 16.3**

### Property 20: Receipt status monotonicity

*For any* message receipt, the status SHALL only transition forward through SENT → DELIVERED → READ. Any update attempting a backward transition SHALL be discarded, leaving the status unchanged.

**Validates: Requirements 17.3, 17.4**

### Property 21: Message broadcast to active members

*For any* message sent to a room, all room members with active streams SHALL receive the message on their stream, and a DELIVERED receipt SHALL be created for each recipient.

**Validates: Requirements 9.2, 17.1**
