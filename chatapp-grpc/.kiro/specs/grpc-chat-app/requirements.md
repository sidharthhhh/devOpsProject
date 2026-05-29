# Requirements Document

## Introduction

A real-time gRPC chat application built with a Go monolithic backend, PostgreSQL database, and Envoy proxy for grpc-web support. The system provides user authentication, room-based messaging, file sharing, and notifications using all four gRPC call types (Unary, Server Streaming, Client Streaming, Bidirectional Streaming). A Hub pattern manages connected client streams for real-time message delivery with queue-and-push semantics for offline users.

## Glossary

- **ChatServer**: The monolithic Go gRPC server application handling all services
- **AuthService**: The gRPC service responsible for user registration, login, token validation, and profile management
- **RoomService**: The gRPC service responsible for room creation, membership management, and message history retrieval
- **ChatService**: The gRPC service responsible for real-time bidirectional message streaming via the Hub pattern
- **FileService**: The gRPC service responsible for chunked file uploads and file URL retrieval
- **NotificationService**: The gRPC service responsible for streaming notifications and managing read state
- **Hub**: The in-memory component that manages active client stream connections and routes messages to recipients
- **MessageQueue**: The persistence layer that stores undelivered messages for offline users
- **User**: A registered account in the system identified by a unique ID
- **Room**: A named conversation space that contains one or more members
- **DirectMessage**: A special room type containing exactly two members
- **JWT**: A JSON Web Token used for authenticating gRPC requests with 24-hour expiry
- **EnvoyProxy**: The Envoy sidecar that translates grpc-web requests into native gRPC calls
- **TokenBucket**: The rate limiting algorithm applied to ChatService with 30 tokens and 1 token per second refill
- **ClientMessageID**: A client-generated unique identifier used for message deduplication

## Requirements

### Requirement 1: User Registration

**User Story:** As a new user, I want to register an account with a username and password, so that I can access the chat system.

#### Acceptance Criteria

1. WHEN a registration request is received with a valid username and password, THE AuthService SHALL create a new User record in the database and return a JWT.
2. WHEN a registration request is received with a username that already exists, THE AuthService SHALL reject the request with an ALREADY_EXISTS error code.
3. THE AuthService SHALL store passwords using a bcrypt hash, never in plaintext.
4. WHEN a registration request is received with an empty username or password, THE AuthService SHALL reject the request with an INVALID_ARGUMENT error code.

### Requirement 2: User Login

**User Story:** As a registered user, I want to log in with my credentials, so that I can receive a token to access protected services.

#### Acceptance Criteria

1. WHEN a login request is received with valid credentials, THE AuthService SHALL return a JWT with a 24-hour expiry.
2. WHEN a login request is received with invalid credentials, THE AuthService SHALL reject the request with an UNAUTHENTICATED error code.
3. THE AuthService SHALL include the User ID and username in the JWT claims.

### Requirement 3: Token Validation and Authentication

**User Story:** As a system operator, I want all protected endpoints to require valid authentication, so that unauthorized access is prevented.

#### Acceptance Criteria

1. WHEN a request is received without a valid JWT in the metadata, THE ChatServer SHALL reject the request with an UNAUTHENTICATED error code.
2. WHEN a request is received with an expired JWT, THE ChatServer SHALL reject the request with an UNAUTHENTICATED error code.
3. WHEN a ValidateToken request is received with a valid JWT, THE AuthService SHALL return the decoded user claims.
4. THE ChatServer SHALL enforce authentication on all RPC methods except Register and Login.

### Requirement 4: User Profile Management

**User Story:** As a registered user, I want to view and update my profile, so that other users can identify me.

#### Acceptance Criteria

1. WHEN a GetProfile request is received with a valid user ID, THE AuthService SHALL return the profile data for the specified User.
2. WHEN an UpdateProfile request is received with valid fields, THE AuthService SHALL persist the updated profile data and return the updated profile.
3. WHEN a GetProfile request is received for a non-existent user ID, THE AuthService SHALL reject the request with a NOT_FOUND error code.

### Requirement 5: Room Creation

**User Story:** As an authenticated user, I want to create chat rooms, so that I can organize conversations with other users.

#### Acceptance Criteria

1. WHEN a CreateRoom request is received with a valid room name, THE RoomService SHALL create a new Room record and add the requesting User as a member.
2. WHEN a CreateRoom request is received with an empty room name, THE RoomService SHALL reject the request with an INVALID_ARGUMENT error code.
3. THE RoomService SHALL assign a unique identifier to each created Room.

### Requirement 6: Room Membership Management

**User Story:** As a room member, I want to join and leave rooms, so that I can participate in conversations I choose.

#### Acceptance Criteria

1. WHEN a JoinRoom request is received from an authenticated User, THE RoomService SHALL add the User to the specified Room's membership list.
2. WHEN a LeaveRoom request is received from a room member, THE RoomService SHALL remove the User from the specified Room's membership list.
3. WHEN a JoinRoom request is received for a non-existent Room, THE RoomService SHALL reject the request with a NOT_FOUND error code.
4. WHEN a JoinRoom request is received from a User who is already a member, THE RoomService SHALL reject the request with an ALREADY_EXISTS error code.
5. WHEN a LeaveRoom request is received from a User who is not a member, THE RoomService SHALL reject the request with a FAILED_PRECONDITION error code.

### Requirement 7: Room Listing and Details

**User Story:** As an authenticated user, I want to list available rooms and view room details, so that I can discover and inspect conversations.

#### Acceptance Criteria

1. WHEN a ListRooms request is received from an authenticated User, THE RoomService SHALL return the list of Rooms the User is a member of.
2. WHEN a GetRoom request is received for a Room the User is a member of, THE RoomService SHALL return the Room details including name and member count.
3. WHEN a GetRoom request is received for a Room the User is not a member of, THE RoomService SHALL reject the request with a PERMISSION_DENIED error code.
4. WHEN a ListRoomMembers request is received from a Room member, THE RoomService SHALL return the list of members in the specified Room.

### Requirement 8: Direct Messaging

**User Story:** As an authenticated user, I want to start a direct message conversation with another user, so that I can have private one-on-one chats.

#### Acceptance Criteria

1. WHEN a CreateDirectMessage request is received with a valid target user ID, THE RoomService SHALL create a DirectMessage Room containing exactly the requesting User and the target User.
2. WHEN a CreateDirectMessage request is received for a pair of users that already have a DirectMessage Room, THE RoomService SHALL return the existing DirectMessage Room.
3. WHEN a CreateDirectMessage request is received with a non-existent target user ID, THE RoomService SHALL reject the request with a NOT_FOUND error code.

### Requirement 9: Real-Time Chat Messaging

**User Story:** As a room member, I want to send and receive messages in real time, so that I can communicate with other room members instantly.

#### Acceptance Criteria

1. WHEN a User opens a bidirectional stream to ChatService, THE Hub SHALL register the User's stream as active.
2. WHEN a message is sent on the chat stream with a valid room ID, THE ChatService SHALL persist the message and broadcast the message to all active streams of Room members.
3. WHEN a message is sent to a Room the User is not a member of, THE ChatService SHALL reject the message with a PERMISSION_DENIED error.
4. THE ChatService SHALL deliver messages within a Room in chronological order based on server-assigned timestamps.
5. WHEN a message is received with a ClientMessageID that already exists for the same User and Room, THE ChatService SHALL discard the duplicate and acknowledge the original message.

### Requirement 10: Offline Message Delivery

**User Story:** As a user who was temporarily disconnected, I want to receive messages sent while I was offline, so that I never miss a conversation.

#### Acceptance Criteria

1. WHEN a message is sent to a Room member who has no active stream, THE MessageQueue SHALL store the message for later delivery.
2. WHEN a User reconnects and opens a new chat stream, THE ChatService SHALL deliver all queued messages for that User in chronological order before accepting new messages.
3. THE MessageQueue SHALL retain undelivered messages until the target User reconnects and receives the messages.

### Requirement 11: Chat Rate Limiting

**User Story:** As a system operator, I want to limit the rate of messages a user can send, so that the system is protected from abuse.

#### Acceptance Criteria

1. THE ChatService SHALL enforce a TokenBucket rate limit of 30 tokens with a refill rate of 1 token per second per User stream.
2. WHEN a User sends a message and the TokenBucket has no available tokens, THE ChatService SHALL reject the message with a RESOURCE_EXHAUSTED error code.
3. WHEN a User sends a message and the TokenBucket has available tokens, THE ChatService SHALL decrement the token count by one and process the message.

### Requirement 12: Message History

**User Story:** As a room member, I want to retrieve past messages in a room, so that I can review conversation history.

#### Acceptance Criteria

1. WHEN a GetRoomHistory request is received from a Room member, THE RoomService SHALL return messages in chronological order.
2. WHEN a GetRoomHistory request is received from a User who is not a Room member, THE RoomService SHALL reject the request with a PERMISSION_DENIED error code.
3. THE RoomService SHALL support pagination for GetRoomHistory via cursor-based parameters.

### Requirement 13: File Upload

**User Story:** As a room member, I want to upload files to share with others, so that I can exchange documents and media.

#### Acceptance Criteria

1. WHEN a client streaming UploadFile request is received, THE FileService SHALL accept file data in 64KB chunks and persist the assembled file to the local filesystem.
2. WHEN the total uploaded file size exceeds 50MB, THE FileService SHALL abort the upload and return a RESOURCE_EXHAUSTED error code.
3. THE FileService SHALL store file metadata (filename, size, uploader, room association) in the database upon successful upload.
4. WHEN an UploadFile request is received from a User who is not a member of the associated Room, THE FileService SHALL reject the request with a PERMISSION_DENIED error code.

### Requirement 14: File Retrieval and Deletion

**User Story:** As a room member, I want to retrieve and manage shared files, so that I can access or remove uploaded content.

#### Acceptance Criteria

1. WHEN a GetFileURL request is received from a Room member, THE FileService SHALL return a URL path for downloading the specified file.
2. WHEN a DeleteFile request is received from the User who uploaded the file, THE FileService SHALL remove the file from the filesystem and delete the metadata record.
3. WHEN a DeleteFile request is received from a User who did not upload the file, THE FileService SHALL reject the request with a PERMISSION_DENIED error code.
4. WHEN a GetFileURL request is received for a non-existent file, THE FileService SHALL reject the request with a NOT_FOUND error code.

### Requirement 15: Real-Time Notifications

**User Story:** As an authenticated user, I want to receive real-time notifications, so that I am informed of new messages and events without polling.

#### Acceptance Criteria

1. WHEN a User opens a SubscribeNotifications server stream, THE NotificationService SHALL push notification events to the stream as they occur.
2. WHEN a new message is sent to a Room, THE NotificationService SHALL generate a notification for each Room member who is not the message sender.
3. WHEN a GetUnreadCount request is received, THE NotificationService SHALL return the count of unread notifications for the requesting User.
4. WHEN a MarkNotificationsRead request is received with notification IDs, THE NotificationService SHALL mark the specified notifications as read for the requesting User.

### Requirement 16: User Presence

**User Story:** As a room member, I want to see which users are currently online, so that I know who is available for conversation.

#### Acceptance Criteria

1. WHEN a User opens a bidirectional chat stream, THE Hub SHALL mark the User's presence status as online.
2. WHEN a User's chat stream disconnects, THE Hub SHALL mark the User's presence status as offline.
3. THE Hub SHALL ensure presence status reflects the actual connection state at all times; a User with no active stream SHALL have offline status.

### Requirement 17: Message Receipt Tracking

**User Story:** As a message sender, I want to know when my messages are delivered and read, so that I have visibility into message status.

#### Acceptance Criteria

1. WHEN a message is delivered to a recipient's active stream, THE ChatService SHALL create a message receipt with DELIVERED status.
2. WHEN a recipient marks a message as read, THE ChatService SHALL update the message receipt to READ status.
3. THE ChatService SHALL enforce receipt monotonicity: a message receipt status SHALL only transition forward from SENT to DELIVERED to READ, never backward.
4. WHEN a receipt status update is received that would move the status backward, THE ChatService SHALL discard the update.

### Requirement 18: Infrastructure and Deployment

**User Story:** As a developer, I want the application containerized with Docker Compose, so that I can run the entire stack locally with a single command.

#### Acceptance Criteria

1. THE ChatServer SHALL be deployable via Docker Compose with services for the Go application, PostgreSQL database, and EnvoyProxy.
2. THE EnvoyProxy SHALL translate incoming grpc-web requests to native gRPC and forward them to the ChatServer.
3. THE ChatServer SHALL connect to PostgreSQL using the pgx driver with connection parameters sourced from environment variables.
4. THE ChatServer SHALL execute raw SQL queries via pgx without an ORM layer.
5. THE ChatServer SHALL run database migrations on startup to create the required tables: users, rooms, room_members, messages, message_receipts, files, and notifications.

### Requirement 19: Minimal Frontend Scaffold

**User Story:** As a developer, I want a minimal test client, so that I can verify gRPC service functionality during development.

#### Acceptance Criteria

1. THE ChatServer project SHALL include a minimal frontend scaffold or test client capable of invoking each gRPC service through the EnvoyProxy.
2. THE test client SHALL demonstrate connectivity to AuthService, RoomService, ChatService, FileService, and NotificationService.
