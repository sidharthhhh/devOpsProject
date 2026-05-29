import { Pool } from "mysql2/promise";

const TTL_HOURS = 2;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes

export function startCleanupJob(pool: Pool) {
  console.log(`Cleanup job started: deleting data older than ${TTL_HOURS}h every 5 minutes`);

  const cleanup = async () => {
    try {
      const cutoff = new Date(Date.now() - TTL_HOURS * 60 * 60 * 1000);

      // Delete old notifications
      await pool.execute(
        "DELETE FROM notifications WHERE created_at < ?",
        [cutoff]
      );

      // Delete old message receipts (for messages that will be deleted)
      await pool.execute(
        `DELETE mr FROM message_receipts mr
         INNER JOIN messages m ON mr.message_id = m.id
         WHERE m.created_at < ?`,
        [cutoff]
      );

      // Delete old messages
      await pool.execute(
        "DELETE FROM messages WHERE created_at < ?",
        [cutoff]
      );

      // Delete old files
      await pool.execute(
        "DELETE FROM files WHERE created_at < ?",
        [cutoff]
      );

      // Find rooms older than TTL that aren't direct messages
      // Delete room members first, then rooms
      await pool.execute(
        `DELETE rm FROM room_members rm
         INNER JOIN rooms r ON rm.room_id = r.id
         WHERE r.created_at < ?`,
        [cutoff]
      );

      await pool.execute(
        "DELETE FROM rooms WHERE created_at < ?",
        [cutoff]
      );

      // Delete users older than TTL
      // First remove any remaining room_members for these users
      await pool.execute(
        `DELETE rm FROM room_members rm
         INNER JOIN users u ON rm.user_id = u.id
         WHERE u.created_at < ?`,
        [cutoff]
      );

      const [result] = await pool.execute(
        "DELETE FROM users WHERE created_at < ?",
        [cutoff]
      ) as any;

      if (result.affectedRows > 0) {
        console.log(`Cleanup: removed ${result.affectedRows} expired users`);
      }
    } catch (err) {
      console.error("Cleanup error:", err);
    }
  };

  // Run immediately on start
  cleanup();

  // Then run every 5 minutes
  setInterval(cleanup, CLEANUP_INTERVAL_MS);
}
