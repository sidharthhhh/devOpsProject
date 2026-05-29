import * as grpc from "@grpc/grpc-js";
import { Pool, RowDataPacket } from "mysql2/promise";
import { requireAuth } from "../interceptors/auth";
import { Hub } from "./hub";

function toTimestamp(date: Date) {
  return { seconds: Math.floor(date.getTime() / 1000), nanos: 0 };
}

export function createNotificationService(pool: Pool, hub: Hub, jwtSecret: string) {
  // Store notification streams for pushing real-time notifications
  const notificationStreams: Map<string, grpc.ServerWritableStream<any, any>> = new Map();

  // Helper to push a notification to a user's stream if they're subscribed
  function pushNotification(userId: string, notification: any) {
    const stream = notificationStreams.get(userId);
    if (stream) {
      stream.write(notification);
    }
  }

  return {
    // Expose pushNotification for use by ChatService
    pushNotification,

    SubscribeNotifications: (call: grpc.ServerWritableStream<any, any>) => {
      const user = requireAuth(call, jwtSecret);
      if (!user) {
        call.emit("error", { code: grpc.status.UNAUTHENTICATED, message: "Authentication required" });
        call.end();
        return;
      }

      // Register this stream for real-time notifications
      notificationStreams.set(user.userId, call);

      // Send existing unread notifications
      (async () => {
        try {
          const [rows] = await pool.execute<RowDataPacket[]>(
            `SELECT id, user_id, room_id, message_id, sender_username, content_preview, is_read, created_at
             FROM notifications
             WHERE user_id = ? AND is_read = FALSE
             ORDER BY created_at ASC`,
            [user.userId]
          );

          for (const row of rows) {
            call.write({
              notification_id: row.id,
              user_id: row.user_id,
              room_id: row.room_id,
              message_id: row.message_id || "",
              sender_username: row.sender_username,
              content_preview: row.content_preview || "",
              created_at: toTimestamp(new Date(row.created_at)),
              is_read: !!row.is_read,
            });
          }
        } catch (err) {
          console.error("Error sending initial notifications:", err);
        }
      })();

      // Clean up when client disconnects
      call.on("cancelled", () => {
        notificationStreams.delete(user.userId);
      });

      call.on("error", () => {
        notificationStreams.delete(user.userId);
      });
    },

    GetUnreadCount: async (call: any, callback: any) => {
      const user = requireAuth(call, jwtSecret);
      if (!user) {
        return callback({ code: grpc.status.UNAUTHENTICATED, message: "Authentication required" });
      }

      try {
        // Get total unread count
        const [totalRows] = await pool.execute<RowDataPacket[]>(
          "SELECT COUNT(*) as total FROM notifications WHERE user_id = ? AND is_read = FALSE",
          [user.userId]
        );
        const total = totalRows[0].total;

        // Get count by room
        const [roomRows] = await pool.execute<RowDataPacket[]>(
          "SELECT room_id, COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE GROUP BY room_id",
          [user.userId]
        );

        const byRoom: Record<string, number> = {};
        for (const row of roomRows) {
          byRoom[row.room_id] = row.count;
        }

        callback(null, { total, by_room: byRoom });
      } catch (err: any) {
        callback({ code: grpc.status.INTERNAL, message: err.message || "Failed to get unread count" });
      }
    },

    MarkNotificationsRead: async (call: any, callback: any) => {
      const user = requireAuth(call, jwtSecret);
      if (!user) {
        return callback({ code: grpc.status.UNAUTHENTICATED, message: "Authentication required" });
      }

      const { notification_ids } = call.request;

      if (!notification_ids || notification_ids.length === 0) {
        return callback(null, { success: true });
      }

      try {
        const placeholders = notification_ids.map(() => "?").join(",");
        await pool.execute(
          `UPDATE notifications SET is_read = TRUE WHERE id IN (${placeholders}) AND user_id = ?`,
          [...notification_ids, user.userId]
        );

        callback(null, { success: true });
      } catch (err: any) {
        callback({ code: grpc.status.INTERNAL, message: err.message || "Failed to mark notifications read" });
      }
    },
  };
}
