import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { Pool, RowDataPacket } from "mysql2/promise";
import { v4 as uuidv4 } from "uuid";
import { validateToken, TokenPayload } from "../utils/jwt";
import { Hub } from "../services/hub";
import { RateLimiter } from "../interceptors/ratelimit";

interface WSClient {
  ws: WebSocket;
  user: TokenPayload;
  roomIds: string[];
}

export function startWebSocketServer(
  port: number,
  pool: Pool,
  hub: Hub,
  rateLimiter: RateLimiter,
  jwtSecret: string
) {
  const wss = new WebSocketServer({ port });
  const wsClients: Map<string, WSClient> = new Map();

  console.log(`WebSocket server running on port ${port}`);

  // Broadcast to all clients in a room
  function broadcastToRoom(roomId: string, message: any, excludeUserId?: string) {
    for (const [uid, c] of wsClients) {
      if (uid === excludeUserId) continue;
      if (c.roomIds.includes(roomId)) {
        c.ws.send(JSON.stringify(message));
      }
    }
  }

  // Broadcast to all clients in all rooms a user belongs to
  function broadcastPresence(userId: string, username: string, online: boolean, roomIds: string[]) {
    const msg = { type: "presence", data: { user_id: userId, username, online } };
    for (const roomId of roomIds) {
      broadcastToRoom(roomId, msg, userId);
    }
  }

  wss.on("connection", async (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url || "", `http://localhost:${port}`);
    const token = url.searchParams.get("token");

    if (!token) {
      ws.close(4001, "Missing token");
      return;
    }

    const user = validateToken(token, jwtSecret);
    if (!user) {
      ws.close(4001, "Invalid token");
      return;
    }

    // Load user's rooms
    const [roomRows] = await pool.execute<RowDataPacket[]>(
      "SELECT room_id FROM room_members WHERE user_id = ?",
      [user.userId]
    );
    const roomIds = roomRows.map((r) => r.room_id as string);

    // Register client
    const client: WSClient = { ws, user, roomIds };
    wsClients.set(user.userId, client);

    // Set user online
    await pool.execute("UPDATE users SET online = TRUE WHERE id = ?", [user.userId]);

    // Broadcast online presence to all rooms
    broadcastPresence(user.userId, user.username, true, roomIds);

    // Send list of online users to the newly connected client
    const onlineUsers: { user_id: string; username: string }[] = [];
    for (const [uid, c] of wsClients) {
      if (uid !== user.userId) {
        // Check if they share any room
        const shared = c.roomIds.some((rid) => roomIds.includes(rid));
        if (shared) {
          onlineUsers.push({ user_id: uid, username: c.user.username });
        }
      }
    }
    ws.send(JSON.stringify({ type: "online_users", data: onlineUsers }));

    // Deliver offline messages
    if (roomIds.length > 0) {
      const placeholders = roomIds.map(() => "?").join(",");
      const [offlineMessages] = await pool.execute<RowDataPacket[]>(
        `SELECT m.id, m.room_id, m.sender_id, m.client_message_id, m.content, m.message_type, m.created_at,
                u.username as sender_username
         FROM messages m
         JOIN room_members rm ON rm.room_id = m.room_id AND rm.user_id = ?
         JOIN users u ON u.id = m.sender_id
         LEFT JOIN message_receipts mr ON mr.message_id = m.id AND mr.user_id = ?
         WHERE mr.message_id IS NULL AND m.sender_id != ? AND m.room_id IN (${placeholders})
         ORDER BY m.created_at ASC`,
        [user.userId, user.userId, user.userId, ...roomIds]
      );

      for (const msg of offlineMessages) {
        ws.send(JSON.stringify({
          type: "message",
          data: {
            message_id: msg.id,
            client_message_id: msg.client_message_id || "",
            room_id: msg.room_id,
            sender_id: msg.sender_id,
            sender_username: msg.sender_username,
            content: msg.content,
            message_type: msg.message_type,
            created_at: new Date(msg.created_at).toISOString(),
          },
        }));

        await pool.execute(
          `INSERT INTO message_receipts (message_id, user_id, status) VALUES (?, ?, 1)
           ON DUPLICATE KEY UPDATE status = GREATEST(status, 1)`,
          [msg.id, user.userId]
        );
      }
    }

    // Handle incoming messages
    ws.on("message", async (raw) => {
      try {
        // Limit message size to 64KB
        if (raw.toString().length > 65536) {
          ws.send(JSON.stringify({ type: "error", data: { message: "Message too large" } }));
          return;
        }

        const payload = JSON.parse(raw.toString());

        if (payload.type === "send_message") {
          const { room_id, content, client_message_id } = payload.data || {};

          // Input validation
          if (!room_id || typeof room_id !== 'string' || room_id.length > 36) {
            ws.send(JSON.stringify({ type: "error", data: { message: "Invalid room_id" } }));
            return;
          }
          if (!content || typeof content !== 'string' || content.length === 0) {
            ws.send(JSON.stringify({ type: "error", data: { message: "Empty message" } }));
            return;
          }
          if (content.length > 10000) {
            ws.send(JSON.stringify({ type: "error", data: { message: "Message too long (max 10000 chars)" } }));
            return;
          }
          if (client_message_id && (typeof client_message_id !== 'string' || client_message_id.length > 128)) {
            ws.send(JSON.stringify({ type: "error", data: { message: "Invalid client_message_id" } }));
            return;
          }

          if (!rateLimiter.allow(user.userId)) {
            ws.send(JSON.stringify({ type: "error", data: { message: "Rate limit exceeded" } }));
            return;
          }

          // Validate room membership from DB
          const [memberCheck] = await pool.execute<RowDataPacket[]>(
            "SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?",
            [room_id, user.userId]
          );
          if (memberCheck.length === 0) {
            ws.send(JSON.stringify({ type: "error", data: { message: "Not a member of this room" } }));
            return;
          }

          if (!client.roomIds.includes(room_id)) {
            client.roomIds.push(room_id);
          }

          // Deduplication
          if (client_message_id) {
            const [existing] = await pool.execute<RowDataPacket[]>(
              "SELECT id FROM messages WHERE sender_id = ? AND room_id = ? AND client_message_id = ?",
              [user.userId, room_id, client_message_id]
            );
            if (existing.length > 0) {
              ws.send(JSON.stringify({ type: "ack", data: { message_id: existing[0].id, client_message_id } }));
              return;
            }
          }

          // Persist message
          const messageId = uuidv4();
          const now = new Date();

          await pool.execute(
            `INSERT INTO messages (id, room_id, sender_id, client_message_id, content, message_type, created_at)
             VALUES (?, ?, ?, ?, ?, 0, ?)`,
            [messageId, room_id, user.userId, client_message_id || null, content, now]
          );

          const outMsg = {
            type: "message",
            data: {
              message_id: messageId,
              client_message_id: client_message_id || "",
              room_id,
              sender_id: user.userId,
              sender_username: user.username,
              content,
              message_type: 0,
              created_at: now.toISOString(),
            },
          };

          // Broadcast to all WS clients in the room (including sender)
          for (const [uid, c] of wsClients) {
            if (c.roomIds.includes(room_id)) {
              c.ws.send(JSON.stringify(outMsg));
              if (uid !== user.userId) {
                await pool.execute(
                  `INSERT INTO message_receipts (message_id, user_id, status) VALUES (?, ?, 1)
                   ON DUPLICATE KEY UPDATE status = GREATEST(status, 1)`,
                  [messageId, uid]
                );
              }
            }
          }
        }

        // Typing indicator (rate limited: max 1 per second)
        if (payload.type === "typing") {
          const { room_id, is_typing } = payload.data || {};
          if (!room_id || typeof room_id !== 'string') return;
          if (typeof is_typing !== 'boolean') return;
          // Only broadcast if user is a member
          if (!client.roomIds.includes(room_id)) return;
          broadcastToRoom(room_id, {
            type: "typing",
            data: { user_id: user.userId, username: user.username, room_id, is_typing },
          }, user.userId);
        }

        // Join room (update cached list) - validate room_id
        if (payload.type === "join_room") {
          const { room_id } = payload.data || {};
          if (!room_id || typeof room_id !== 'string' || room_id.length > 36) return;
          if (!client.roomIds.includes(room_id)) {
            client.roomIds.push(room_id);
          }
        }

      } catch (err) {
        console.error("WS message error:", err);
      }
    });

    // Cleanup on disconnect
    ws.on("close", async () => {
      wsClients.delete(user.userId);
      broadcastPresence(user.userId, user.username, false, client.roomIds);
      try {
        await pool.execute("UPDATE users SET online = FALSE WHERE id = ?", [user.userId]);
      } catch (err) {
        console.error("Error setting user offline:", err);
      }
    });

    // Send connected confirmation
    ws.send(JSON.stringify({ type: "connected", data: { userId: user.userId, username: user.username, rooms: roomIds } }));
  });

  return wss;
}
