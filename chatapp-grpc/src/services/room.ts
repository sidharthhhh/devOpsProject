import * as grpc from "@grpc/grpc-js";
import { Pool, RowDataPacket } from "mysql2/promise";
import { v4 as uuidv4 } from "uuid";
import { requireAuth } from "../interceptors/auth";

function toTimestamp(date: Date) {
  return { seconds: Math.floor(date.getTime() / 1000), nanos: 0 };
}

function generateInviteCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6-digit number
}

export function createRoomService(pool: Pool, jwtSecret: string) {
  return {
    CreateRoom: async (
      call: grpc.ServerUnaryCall<any, any>,
      callback: grpc.sendUnaryData<any>
    ) => {
      const user = requireAuth(call, jwtSecret);
      if (!user) {
        return callback({
          code: grpc.status.UNAUTHENTICATED,
          message: "Authentication required",
        });
      }

      const { name, is_direct } = call.request;
      if (!name || name.trim() === "") {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: "Room name is required",
        });
      }

      try {
        const roomId = uuidv4();
        const inviteCode = generateInviteCode();
        const now = new Date();

        await pool.execute(
          "INSERT INTO rooms (id, name, is_direct, created_by, member_count, invite_code, created_at) VALUES (?, ?, ?, ?, 1, ?, ?)",
          [roomId, name, is_direct ? 1 : 0, user.userId, inviteCode, now]
        );

        await pool.execute(
          "INSERT INTO room_members (room_id, user_id, joined_at) VALUES (?, ?, ?)",
          [roomId, user.userId, now]
        );

        callback(null, {
          id: roomId,
          name,
          created_by: user.userId,
          is_direct: !!is_direct,
          member_count: 1,
          invite_code: inviteCode,
          created_at: toTimestamp(now),
        });
      } catch (err: any) {
        callback({
          code: grpc.status.INTERNAL,
          message: "Failed to create room",
        });
      }
    },

    GetRoom: async (
      call: grpc.ServerUnaryCall<any, any>,
      callback: grpc.sendUnaryData<any>
    ) => {
      const user = requireAuth(call, jwtSecret);
      if (!user) {
        return callback({
          code: grpc.status.UNAUTHENTICATED,
          message: "Authentication required",
        });
      }

      const { room_id } = call.request;

      try {
        // Check membership
        const [members] = await pool.execute<RowDataPacket[]>(
          "SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?",
          [room_id, user.userId]
        );

        if (members.length === 0) {
          return callback({
            code: grpc.status.PERMISSION_DENIED,
            message: "Not a member of this room",
          });
        }

        const [rooms] = await pool.execute<RowDataPacket[]>(
          "SELECT id, name, created_by, is_direct, member_count, created_at FROM rooms WHERE id = ?",
          [room_id]
        );

        if (rooms.length === 0) {
          return callback({
            code: grpc.status.NOT_FOUND,
            message: "Room not found",
          });
        }

        const room = rooms[0];
        callback(null, {
          id: room.id,
          name: room.name,
          created_by: room.created_by,
          is_direct: !!room.is_direct,
          member_count: room.member_count,
          created_at: toTimestamp(new Date(room.created_at)),
        });
      } catch (err: any) {
        callback({
          code: grpc.status.INTERNAL,
          message: "Failed to get room",
        });
      }
    },

    JoinRoom: async (
      call: grpc.ServerUnaryCall<any, any>,
      callback: grpc.sendUnaryData<any>
    ) => {
      const user = requireAuth(call, jwtSecret);
      if (!user) {
        return callback({
          code: grpc.status.UNAUTHENTICATED,
          message: "Authentication required",
        });
      }

      const { room_id } = call.request;

      try {
        // Check room exists
        const [rooms] = await pool.execute<RowDataPacket[]>(
          "SELECT id FROM rooms WHERE id = ?",
          [room_id]
        );

        if (rooms.length === 0) {
          return callback({
            code: grpc.status.NOT_FOUND,
            message: "Room not found",
          });
        }

        // Check not already a member
        const [existing] = await pool.execute<RowDataPacket[]>(
          "SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?",
          [room_id, user.userId]
        );

        if (existing.length > 0) {
          return callback({
            code: grpc.status.ALREADY_EXISTS,
            message: "Already a member of this room",
          });
        }

        await pool.execute(
          "INSERT INTO room_members (room_id, user_id, joined_at) VALUES (?, ?, ?)",
          [room_id, user.userId, new Date()]
        );

        await pool.execute(
          "UPDATE rooms SET member_count = member_count + 1 WHERE id = ?",
          [room_id]
        );

        callback(null, { success: true });
      } catch (err: any) {
        callback({
          code: grpc.status.INTERNAL,
          message: "Failed to join room",
        });
      }
    },

    LeaveRoom: async (
      call: grpc.ServerUnaryCall<any, any>,
      callback: grpc.sendUnaryData<any>
    ) => {
      const user = requireAuth(call, jwtSecret);
      if (!user) {
        return callback({
          code: grpc.status.UNAUTHENTICATED,
          message: "Authentication required",
        });
      }

      const { room_id } = call.request;

      try {
        // Check is member
        const [members] = await pool.execute<RowDataPacket[]>(
          "SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?",
          [room_id, user.userId]
        );

        if (members.length === 0) {
          return callback({
            code: grpc.status.FAILED_PRECONDITION,
            message: "Not a member of this room",
          });
        }

        await pool.execute(
          "DELETE FROM room_members WHERE room_id = ? AND user_id = ?",
          [room_id, user.userId]
        );

        await pool.execute(
          "UPDATE rooms SET member_count = member_count - 1 WHERE id = ?",
          [room_id]
        );

        callback(null, { success: true });
      } catch (err: any) {
        callback({
          code: grpc.status.INTERNAL,
          message: "Failed to leave room",
        });
      }
    },

    ListRooms: async (
      call: grpc.ServerUnaryCall<any, any>,
      callback: grpc.sendUnaryData<any>
    ) => {
      const user = requireAuth(call, jwtSecret);
      if (!user) {
        return callback({
          code: grpc.status.UNAUTHENTICATED,
          message: "Authentication required",
        });
      }

      try {
        const [rows] = await pool.execute<RowDataPacket[]>(
          `SELECT r.id, r.name, r.created_by, r.is_direct, r.member_count, r.invite_code, r.created_at
           FROM rooms r
           INNER JOIN room_members rm ON r.id = rm.room_id
           WHERE rm.user_id = ?`,
          [user.userId]
        );

        const rooms = rows.map((row) => ({
          id: row.id,
          name: row.name,
          created_by: row.created_by,
          is_direct: !!row.is_direct,
          member_count: row.member_count,
          invite_code: row.invite_code || '',
          created_at: toTimestamp(new Date(row.created_at)),
        }));

        callback(null, { rooms });
      } catch (err: any) {
        callback({
          code: grpc.status.INTERNAL,
          message: "Failed to list rooms",
        });
      }
    },

    ListRoomMembers: async (
      call: grpc.ServerUnaryCall<any, any>,
      callback: grpc.sendUnaryData<any>
    ) => {
      const user = requireAuth(call, jwtSecret);
      if (!user) {
        return callback({
          code: grpc.status.UNAUTHENTICATED,
          message: "Authentication required",
        });
      }

      const { room_id } = call.request;

      try {
        // Check caller is member
        const [membership] = await pool.execute<RowDataPacket[]>(
          "SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?",
          [room_id, user.userId]
        );

        if (membership.length === 0) {
          return callback({
            code: grpc.status.PERMISSION_DENIED,
            message: "Not a member of this room",
          });
        }

        const [rows] = await pool.execute<RowDataPacket[]>(
          `SELECT u.id as user_id, u.username, u.display_name, u.avatar_url, u.online, u.created_at
           FROM users u
           INNER JOIN room_members rm ON u.id = rm.user_id
           WHERE rm.room_id = ?`,
          [room_id]
        );

        const members = rows.map((row) => ({
          user_id: row.user_id,
          username: row.username,
          display_name: row.display_name || "",
          avatar_url: row.avatar_url || "",
          online: !!row.online,
          created_at: toTimestamp(new Date(row.created_at)),
        }));

        callback(null, { members });
      } catch (err: any) {
        callback({
          code: grpc.status.INTERNAL,
          message: "Failed to list room members",
        });
      }
    },

    CreateDirectMessage: async (
      call: grpc.ServerUnaryCall<any, any>,
      callback: grpc.sendUnaryData<any>
    ) => {
      const user = requireAuth(call, jwtSecret);
      if (!user) {
        return callback({
          code: grpc.status.UNAUTHENTICATED,
          message: "Authentication required",
        });
      }

      const { target_user_id } = call.request;

      try {
        // Check target user exists
        const [users] = await pool.execute<RowDataPacket[]>(
          "SELECT id FROM users WHERE id = ?",
          [target_user_id]
        );

        if (users.length === 0) {
          return callback({
            code: grpc.status.NOT_FOUND,
            message: "Target user not found",
          });
        }

        // Check if DM room already exists between the two users
        const [existingRooms] = await pool.execute<RowDataPacket[]>(
          `SELECT r.id, r.name, r.created_by, r.is_direct, r.member_count, r.created_at
           FROM rooms r
           INNER JOIN room_members rm1 ON r.id = rm1.room_id AND rm1.user_id = ?
           INNER JOIN room_members rm2 ON r.id = rm2.room_id AND rm2.user_id = ?
           WHERE r.is_direct = true`,
          [user.userId, target_user_id]
        );

        if (existingRooms.length > 0) {
          const room = existingRooms[0];
          return callback(null, {
            id: room.id,
            name: room.name,
            created_by: room.created_by,
            is_direct: true,
            member_count: room.member_count,
            created_at: toTimestamp(new Date(room.created_at)),
          });
        }

        // Create new DM room
        const roomId = uuidv4();
        const now = new Date();

        await pool.execute(
          "INSERT INTO rooms (id, name, is_direct, created_by, member_count, created_at) VALUES (?, ?, true, ?, 2, ?)",
          [roomId, "DM", user.userId, now]
        );

        await pool.execute(
          "INSERT INTO room_members (room_id, user_id, joined_at) VALUES (?, ?, ?)",
          [roomId, user.userId, now]
        );

        await pool.execute(
          "INSERT INTO room_members (room_id, user_id, joined_at) VALUES (?, ?, ?)",
          [roomId, target_user_id, now]
        );

        callback(null, {
          id: roomId,
          name: "DM",
          created_by: user.userId,
          is_direct: true,
          member_count: 2,
          created_at: toTimestamp(now),
        });
      } catch (err: any) {
        callback({
          code: grpc.status.INTERNAL,
          message: "Failed to create direct message",
        });
      }
    },

    GetRoomHistory: async (
      call: grpc.ServerUnaryCall<any, any>,
      callback: grpc.sendUnaryData<any>
    ) => {
      const user = requireAuth(call, jwtSecret);
      if (!user) {
        return callback({
          code: grpc.status.UNAUTHENTICATED,
          message: "Authentication required",
        });
      }

      const { room_id, cursor, limit: requestedLimit } = call.request;

      try {
        // Check caller is member
        const [membership] = await pool.execute<RowDataPacket[]>(
          "SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?",
          [room_id, user.userId]
        );

        if (membership.length === 0) {
          return callback({
            code: grpc.status.PERMISSION_DENIED,
            message: "Not a member of this room",
          });
        }

        // Default limit to 50, max 100
        let limit = requestedLimit || 50;
        if (limit > 100) {
          limit = 100;
        }

        let rows: RowDataPacket[];

        if (cursor) {
          // Decode cursor as ISO timestamp
          const cursorDate = new Date(cursor);
          [rows] = await pool.execute<RowDataPacket[]>(
            `SELECT id, room_id, sender_id, client_message_id, content, message_type, created_at
             FROM messages
             WHERE room_id = ? AND created_at < ?
             ORDER BY created_at DESC
             LIMIT ${limit + 1}`,
            [room_id, cursorDate]
          );
        } else {
          [rows] = await pool.execute<RowDataPacket[]>(
            `SELECT id, room_id, sender_id, client_message_id, content, message_type, created_at
             FROM messages
             WHERE room_id = ?
             ORDER BY created_at DESC
             LIMIT ${limit + 1}`,
            [room_id]
          );
        }

        let hasMore = false;
        let nextCursor = "";

        if (rows.length > limit) {
          hasMore = true;
          rows = rows.slice(0, limit);
          const lastMessage = rows[rows.length - 1];
          nextCursor = new Date(lastMessage.created_at).toISOString();
        }

        // Reverse to chronological order
        const messages = rows.reverse().map((row) => ({
          message_id: row.id,
          client_message_id: row.client_message_id || "",
          room_id: row.room_id,
          sender_id: row.sender_id,
          content: row.content,
          timestamp: toTimestamp(new Date(row.created_at)),
          type: row.message_type,
        }));

        callback(null, { messages, next_cursor: nextCursor, has_more: hasMore });
      } catch (err: any) {
        callback({
          code: grpc.status.INTERNAL,
          message: "Failed to get room history",
        });
      }
    },
  };
}
