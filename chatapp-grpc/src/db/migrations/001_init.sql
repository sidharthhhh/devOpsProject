-- 001_init.sql
-- MySQL 8 schema for gRPC Chat Application

CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) PRIMARY KEY,
    username VARCHAR(64) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(128),
    avatar_url TEXT,
    online BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rooms (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    is_direct BOOLEAN DEFAULT FALSE,
    created_by CHAR(36) NOT NULL,
    member_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_rooms_created_by FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS room_members (
    room_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (room_id, user_id),
    CONSTRAINT fk_room_members_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    CONSTRAINT fk_room_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
    id CHAR(36) PRIMARY KEY,
    room_id CHAR(36) NOT NULL,
    sender_id CHAR(36) NOT NULL,
    client_message_id VARCHAR(128),
    content TEXT NOT NULL,
    message_type INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_messages_dedup (sender_id, room_id, client_message_id),
    CONSTRAINT fk_messages_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS message_receipts (
    message_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    status INT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (message_id, user_id),
    CONSTRAINT fk_receipts_message FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    CONSTRAINT fk_receipts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS files (
    id CHAR(36) PRIMARY KEY,
    room_id CHAR(36) NOT NULL,
    uploader_id CHAR(36) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_files_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    CONSTRAINT fk_files_uploader FOREIGN KEY (uploader_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS notifications (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    room_id CHAR(36) NOT NULL,
    message_id CHAR(36),
    sender_username VARCHAR(64) NOT NULL,
    content_preview VARCHAR(100),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_notifications_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    CONSTRAINT fk_notifications_message FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_messages_room_created ON messages(room_id, created_at);
CREATE INDEX idx_messages_dedup ON messages(sender_id, room_id, client_message_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read);
CREATE INDEX idx_room_members_user ON room_members(user_id);
CREATE INDEX idx_files_room ON files(room_id);
