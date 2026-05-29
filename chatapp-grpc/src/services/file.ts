import * as grpc from "@grpc/grpc-js";
import { Pool, RowDataPacket } from "mysql2/promise";
import { v4 as uuidv4 } from "uuid";
import * as fs from "fs";
import * as path from "path";
import { requireAuth } from "../interceptors/auth";
import { Config } from "../config";

export function createFileService(pool: Pool, config: Config, jwtSecret: string) {
  return {
    UploadFile: (stream: grpc.ServerReadableStream<any, any>, callback: grpc.sendUnaryData<any>) => {
      // Auth check from metadata
      const user = requireAuth(stream, jwtSecret);
      if (!user) {
        return callback({ code: grpc.status.UNAUTHENTICATED, message: "Authentication required" });
      }

      let metadata: { filename: string; room_id: string; total_size: number } | null = null;
      let fileId = uuidv4();
      let totalReceived = 0;
      const chunks: Buffer[] = [];

      stream.on("data", (chunk: any) => {
        // First message should contain metadata
        if (chunk.metadata) {
          metadata = {
            filename: chunk.metadata.filename,
            room_id: chunk.metadata.room_id,
            total_size: Number(chunk.metadata.total_size) || 0,
          };
        } else if (chunk.chunk) {
          // Subsequent messages contain file bytes
          const data = Buffer.from(chunk.chunk);
          totalReceived += data.length;

          // Check max file size (50MB)
          if (totalReceived > config.maxFileSize) {
            stream.destroy();
            return callback({ code: grpc.status.RESOURCE_EXHAUSTED, message: "File exceeds 50MB limit" });
          }

          chunks.push(data);
        }
      });

      stream.on("end", async () => {
        try {
          if (!metadata) {
            return callback({ code: grpc.status.INVALID_ARGUMENT, message: "No file metadata received" });
          }

          // Validate room membership
          const [members] = await pool.execute<RowDataPacket[]>(
            "SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?",
            [metadata.room_id, user.userId]
          );
          if (members.length === 0) {
            return callback({ code: grpc.status.PERMISSION_DENIED, message: "Not a member of this room" });
          }

          // Write file to disk
          const uploadDir = path.join(config.uploadDir, metadata.room_id);
          fs.mkdirSync(uploadDir, { recursive: true });
          const filePath = path.join(uploadDir, `${fileId}_${metadata.filename}`);
          const fileBuffer = Buffer.concat(chunks);
          fs.writeFileSync(filePath, fileBuffer);

          // Save metadata to DB
          await pool.execute(
            "INSERT INTO files (id, room_id, uploader_id, filename, file_path, file_size) VALUES (?, ?, ?, ?, ?, ?)",
            [fileId, metadata.room_id, user.userId, metadata.filename, filePath, totalReceived]
          );

          callback(null, {
            file_id: fileId,
            filename: metadata.filename,
            size: totalReceived,
            success: true,
          });
        } catch (err: any) {
          callback({ code: grpc.status.INTERNAL, message: err.message || "Upload failed" });
        }
      });

      stream.on("error", (err) => {
        console.error("File upload stream error:", err);
      });
    },

    GetFileURL: async (call: any, callback: any) => {
      const user = requireAuth(call, jwtSecret);
      if (!user) {
        return callback({ code: grpc.status.UNAUTHENTICATED, message: "Authentication required" });
      }

      const { file_id } = call.request;

      try {
        const [rows] = await pool.execute<RowDataPacket[]>(
          "SELECT id, room_id, file_path FROM files WHERE id = ?",
          [file_id]
        );

        if (rows.length === 0) {
          return callback({ code: grpc.status.NOT_FOUND, message: "File not found" });
        }

        const file = rows[0];

        // Check room membership
        const [members] = await pool.execute<RowDataPacket[]>(
          "SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?",
          [file.room_id, user.userId]
        );
        if (members.length === 0) {
          return callback({ code: grpc.status.PERMISSION_DENIED, message: "Not a member of this room" });
        }

        callback(null, { url: file.file_path });
      } catch (err: any) {
        callback({ code: grpc.status.INTERNAL, message: err.message || "Failed to get file URL" });
      }
    },

    DeleteFile: async (call: any, callback: any) => {
      const user = requireAuth(call, jwtSecret);
      if (!user) {
        return callback({ code: grpc.status.UNAUTHENTICATED, message: "Authentication required" });
      }

      const { file_id } = call.request;

      try {
        const [rows] = await pool.execute<RowDataPacket[]>(
          "SELECT id, uploader_id, file_path FROM files WHERE id = ?",
          [file_id]
        );

        if (rows.length === 0) {
          return callback({ code: grpc.status.NOT_FOUND, message: "File not found" });
        }

        const file = rows[0];

        // Only uploader can delete
        if (file.uploader_id !== user.userId) {
          return callback({ code: grpc.status.PERMISSION_DENIED, message: "Only the uploader can delete this file" });
        }

        // Delete from filesystem
        if (fs.existsSync(file.file_path)) {
          fs.unlinkSync(file.file_path);
        }

        // Delete from DB
        await pool.execute("DELETE FROM files WHERE id = ?", [file_id]);

        callback(null, { success: true });
      } catch (err: any) {
        callback({ code: grpc.status.INTERNAL, message: err.message || "Failed to delete file" });
      }
    },
  };
}
