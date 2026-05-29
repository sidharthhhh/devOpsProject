import * as grpc from "@grpc/grpc-js";
import { Pool, RowDataPacket } from "mysql2/promise";
import { v4 as uuidv4 } from "uuid";
import { Hub } from "./hub";
import { requireAuth } from "../interceptors/auth";
import { RateLimiter } from "../interceptors/ratelimit";

interface MessageRow extends RowDataPacket {
  id: string;
  room_id: string;
  sender_id: string;
  client_message_id: string;
  content: string;
  message_type: number;
  created_at: Date;
}

function toTimestamp(date: Date): { seconds: number; nanos: number } {
  const ms = date.getTime();
  return {
    seconds: Math.floor(ms / 1000),
    nanos: (ms % 1000) * 1_000_000,
  };
}

function buildChatMessage(row: MessageRow): any {
  return {
    message_id: row.id,
    client_message_id: row.client_message_id || "",
    room_id: row.room_id,
    sender_id: row.sender_id,
    content: row.content,
    timestamp: toTimestamp(row.created_at),
    type: row.message_type,
  };
}

export function createChatService(
  pool: Pool,
  hub: Hub,
  rateLimiter: RateLimiter,
  jwtSecret: string
) {
  return {
    Chat: (stream: grpc.ServerDuplexStream<any, any>) => {
      // 1. Authenticate from metadata
      const user = requireAuth(stream, jwtSecret);
      if (!user) {
        stream.emit("error", {
          code: grpc.status.UNAUTHENTICATED,
          message: "Authentication required",
        });
        stream.end();
        return;
      }

      const userId = user.userId;
      const username = user.username;

      (async () => {
        try {
          // 2. Load user's rooms from DB
          const [roomRows] = await pool.execute<RowDataPacket[]>(
            "SELECT room_id FROM room_members WHERE user_id = ?",
            [userId]
          );
          const roomIds = roomRows.map((r) => r.room_id as string);

          // 3. Register with Hub
          hub.register(userId, username, stream, roomIds);

          // 4. Set user online in DB
          await pool.execute("UPDATE users SET online = TRUE WHERE id = ?", [
            userId,
          ]);

          // 5. Deliver queued offline messages
          if (roomIds.length > 0) {
            const placeholders = roomIds.map(() => "?").join(",");
            const [offlineMessages] = await pool.execute<MessageRow[]>(
              `SELECT m.id, m.room_id, m.sender_id, m.client_message_id, m.content, m.message_type, m.created_at
               FROM messages m
               JOIN room_members rm ON rm.room_id = m.room_id AND rm.user_id = ?
               LEFT JOIN message_receipts mr ON mr.message_id = m.id AND mr.user_id = ?
               WHERE mr.message_id IS NULL AND m.sender_id != ? AND m.room_id IN (${placeholders})
               ORDER BY m.created_at ASC`,
              [userId, userId, userId, ...roomIds]
            );

            for (const msg of offlineMessages) {
              const chatMsg = buildChatMessage(msg);
              stream.write(chatMsg);

              // Create DELIVERED receipt
              await pool.execute(
                `INSERT INTO message_receipts (message_id, user_id, status) VALUES (?, ?, 1)
                 ON DUPLICATE KEY UPDATE status = GREATEST(status, 1)`,
                [msg.id, userId]
              );
            }
          }

          // 6. Listen for incoming messages
          stream.on("data", (message: any) => {
            handleIncomingMessage(message).catch((err) => {
              console.error("Error handling incoming message:", err);
            });
          });

          stream.on("end", () => {
            cleanup();
            stream.end();
          });

          stream.on("error", () => {
            cleanup();
          });

          async function cleanup() {
            hub.unregister(userId);
            try {
              await pool.execute(
                "UPDATE users SET online = FALSE WHERE id = ?",
                [userId]
              );
            } catch (err) {
              console.error("Error setting user offline:", err);
            }
          }

          async function handleIncomingMessage(message: any) {
            const roomId = message.room_id;
            const clientMessageId = message.client_message_id;
            const content = message.content;
            const messageType = message.type || 0;

            // Rate limit check
            if (!rateLimiter.allow(userId)) {
              const errorMsg = {
                message_id: uuidv4(),
                client_message_id: "",
                room_id: roomId || "",
                sender_id: "system",
                content: "Rate limit exceeded",
                timestamp: toTimestamp(new Date()),
                type: 1, // SYSTEM
              };
              stream.write(errorMsg);
              return;
            }

            // Validate room membership
            if (!roomIds.includes(roomId)) {
              const errorMsg = {
                message_id: uuidv4(),
                client_message_id: clientMessageId || "",
                room_id: roomId || "",
                sender_id: "system",
                content: "You are not a member of this room",
                timestamp: toTimestamp(new Date()),
                type: 1, // SYSTEM
              };
              stream.write(errorMsg);
              return;
            }

            // Deduplication check via client_message_id
            if (clientMessageId) {
              const [existing] = await pool.execute<RowDataPacket[]>(
                "SELECT id, room_id, sender_id, client_message_id, content, message_type, created_at FROM messages WHERE sender_id = ? AND room_id = ? AND client_message_id = ?",
                [userId, roomId, clientMessageId]
              );

              if (existing.length > 0) {
                // Message already exists, echo back the existing one
                const existingMsg = existing[0] as MessageRow;
                const chatMsg = buildChatMessage(existingMsg);
                stream.write(chatMsg);
                return;
              }
            }

            // Persist message to DB
            const messageId = uuidv4();
            const now = new Date();

            await pool.execute(
              `INSERT INTO messages (id, room_id, sender_id, client_message_id, content, message_type, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                messageId,
                roomId,
                userId,
                clientMessageId || null,
                content,
                messageType,
                now,
              ]
            );

            const chatMsg = {
              message_id: messageId,
              client_message_id: clientMessageId || "",
              room_id: roomId,
              sender_id: userId,
              content: content,
              timestamp: toTimestamp(now),
              type: messageType,
            };

            // Broadcast to room via hub (exclude sender)
            const deliveredTo = hub.broadcastToRoom(roomId, chatMsg, userId);

            // Create DELIVERED receipts for online recipients
            for (const recipientId of deliveredTo) {
              await pool.execute(
                `INSERT INTO message_receipts (message_id, user_id, status) VALUES (?, ?, 1)
                 ON DUPLICATE KEY UPDATE status = GREATEST(status, 1)`,
                [messageId, recipientId]
              );
            }

            // Send back to sender with server-assigned fields
            stream.write(chatMsg);
          }
        } catch (err) {
          console.error("ChatService initialization error:", err);
          stream.emit("error", {
            code: grpc.status.INTERNAL,
            message: "Internal server error",
          });
          stream.end();
        }
      })();
    },
  };
}
