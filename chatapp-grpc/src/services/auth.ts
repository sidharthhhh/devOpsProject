import * as grpc from "@grpc/grpc-js";
import { Pool } from "mysql2/promise";
import { v4 as uuidv4 } from "uuid";
import { hashPassword, checkPassword } from "../utils/password";
import { generateToken, validateToken, TokenPayload } from "../utils/jwt";
import { requireAuth } from "../interceptors/auth";

export function createAuthService(pool: Pool, jwtSecret: string) {
  return {
    Register: async (call: any, callback: any) => {
      try {
        const { username, password } = call.request;

        // Validate inputs
        if (!username || username.length < 3) {
          return callback({
            code: grpc.status.INVALID_ARGUMENT,
            message: "Username must be at least 3 characters",
          });
        }
        if (!password || password.length < 8) {
          return callback({
            code: grpc.status.INVALID_ARGUMENT,
            message: "Password must be at least 8 characters",
          });
        }

        // Check if username already exists
        const [existing] = await pool.execute(
          "SELECT id FROM users WHERE username = ?",
          [username]
        );
        if ((existing as any[]).length > 0) {
          return callback({
            code: grpc.status.ALREADY_EXISTS,
            message: "Username already taken",
          });
        }

        // Hash password and create user
        const passwordHash = await hashPassword(password);
        const userId = uuidv4();

        await pool.execute(
          "INSERT INTO users (id, username, password_hash, display_name, online) VALUES (?, ?, ?, ?, ?)",
          [userId, username, passwordHash, username, true]
        );

        // Generate JWT token
        const token = generateToken({ userId, username }, jwtSecret);

        callback(null, { token, user_id: userId });
      } catch (err: any) {
        callback({
          code: grpc.status.INTERNAL,
          message: err.message || "Internal server error",
        });
      }
    },

    Login: async (call: any, callback: any) => {
      try {
        const { username, password } = call.request;

        // Validate inputs
        if (!username || username.length < 3) {
          return callback({
            code: grpc.status.INVALID_ARGUMENT,
            message: "Username must be at least 3 characters",
          });
        }
        if (!password || password.length < 8) {
          return callback({
            code: grpc.status.INVALID_ARGUMENT,
            message: "Password must be at least 8 characters",
          });
        }

        // Find user by username
        const [rows] = await pool.execute(
          "SELECT id, username, password_hash FROM users WHERE username = ?",
          [username]
        );
        const users = rows as any[];
        if (users.length === 0) {
          return callback({
            code: grpc.status.NOT_FOUND,
            message: "User not found",
          });
        }

        const user = users[0];

        // Verify password
        const valid = await checkPassword(password, user.password_hash);
        if (!valid) {
          return callback({
            code: grpc.status.UNAUTHENTICATED,
            message: "Invalid password",
          });
        }

        // Update online status
        await pool.execute("UPDATE users SET online = ? WHERE id = ?", [
          true,
          user.id,
        ]);

        // Generate JWT token
        const token = generateToken(
          { userId: user.id, username: user.username },
          jwtSecret
        );

        callback(null, { token, user_id: user.id });
      } catch (err: any) {
        callback({
          code: grpc.status.INTERNAL,
          message: err.message || "Internal server error",
        });
      }
    },

    ValidateToken: async (call: any, callback: any) => {
      try {
        const { token } = call.request;

        const payload = validateToken(token, jwtSecret);
        if (!payload) {
          return callback(null, { valid: false, user_id: "", username: "" });
        }

        callback(null, {
          valid: true,
          user_id: payload.userId,
          username: payload.username,
        });
      } catch (err: any) {
        callback({
          code: grpc.status.INTERNAL,
          message: err.message || "Internal server error",
        });
      }
    },

    GetProfile: async (call: any, callback: any) => {
      try {
        // Require authentication
        const authPayload = requireAuth(call, jwtSecret);
        if (!authPayload) {
          return callback({
            code: grpc.status.UNAUTHENTICATED,
            message: "Authentication required",
          });
        }

        const { user_id } = call.request;

        // Fetch user profile
        const [rows] = await pool.execute(
          "SELECT id, username, display_name, avatar_url, online, created_at FROM users WHERE id = ?",
          [user_id]
        );
        const users = rows as any[];
        if (users.length === 0) {
          return callback({
            code: grpc.status.NOT_FOUND,
            message: "User not found",
          });
        }

        const user = users[0];
        const createdAt = new Date(user.created_at);

        callback(null, {
          user_id: user.id,
          username: user.username,
          display_name: user.display_name || "",
          avatar_url: user.avatar_url || "",
          online: Boolean(user.online),
          created_at: {
            seconds: Math.floor(createdAt.getTime() / 1000),
            nanos: 0,
          },
        });
      } catch (err: any) {
        callback({
          code: grpc.status.INTERNAL,
          message: err.message || "Internal server error",
        });
      }
    },

    UpdateProfile: async (call: any, callback: any) => {
      try {
        // Require authentication
        const authPayload = requireAuth(call, jwtSecret);
        if (!authPayload) {
          return callback({
            code: grpc.status.UNAUTHENTICATED,
            message: "Authentication required",
          });
        }

        const { display_name, avatar_url } = call.request;
        const userId = authPayload.userId;

        // Update profile fields
        await pool.execute(
          "UPDATE users SET display_name = ?, avatar_url = ? WHERE id = ?",
          [display_name, avatar_url, userId]
        );

        // Fetch updated profile
        const [rows] = await pool.execute(
          "SELECT id, username, display_name, avatar_url, online, created_at FROM users WHERE id = ?",
          [userId]
        );
        const users = rows as any[];
        if (users.length === 0) {
          return callback({
            code: grpc.status.NOT_FOUND,
            message: "User not found",
          });
        }

        const user = users[0];
        const createdAt = new Date(user.created_at);

        callback(null, {
          user_id: user.id,
          username: user.username,
          display_name: user.display_name || "",
          avatar_url: user.avatar_url || "",
          online: Boolean(user.online),
          created_at: {
            seconds: Math.floor(createdAt.getTime() / 1000),
            nanos: 0,
          },
        });
      } catch (err: any) {
        callback({
          code: grpc.status.INTERNAL,
          message: err.message || "Internal server error",
        });
      }
    },
  };
}
