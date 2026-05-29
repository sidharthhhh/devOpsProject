import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import * as path from "path";
import * as fs from "fs";
import * as dotenv from "dotenv";

// Load .env file
dotenv.config();

import { loadConfig } from "./config";
import { createPool, runMigrations } from "./db";
import { Hub } from "./services/hub";
import { RateLimiter } from "./interceptors/ratelimit";
import { createAuthService } from "./services/auth";
import { createRoomService } from "./services/room";
import { createChatService } from "./services/chat";
import { createFileService } from "./services/file";
import { createNotificationService } from "./services/notification";
import { startWebSocketServer } from "./ws";
import { startCleanupJob } from "./cleanup";

async function main() {
  const config = loadConfig();

  // Create MySQL pool and run migrations
  const pool = createPool(config);
  await runMigrations(pool);

  // Create upload directory
  fs.mkdirSync(config.uploadDir, { recursive: true });

  // Create Hub and RateLimiter
  const hub = new Hub();
  const rateLimiter = new RateLimiter();

  // Load proto definition
  const PROTO_PATH = path.join(__dirname, "../proto/chat/chat.proto");
  const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  const chatProto = grpc.loadPackageDefinition(packageDefinition).chat as any;

  // Create gRPC server
  const server = new grpc.Server();

  // Create service instances
  const authService = createAuthService(pool, config.jwtSecret);
  const roomService = createRoomService(pool, config.jwtSecret);
  const chatService = createChatService(pool, hub, rateLimiter, config.jwtSecret);
  const fileService = createFileService(pool, config, config.jwtSecret);
  const notificationService = createNotificationService(pool, hub, config.jwtSecret);

  // Register services
  server.addService(chatProto.AuthService.service, authService);
  server.addService(chatProto.RoomService.service, roomService);
  server.addService(chatProto.ChatService.service, chatService);
  server.addService(chatProto.FileService.service, fileService);

  // Extract only gRPC handlers from notification service (exclude pushNotification helper)
  const { pushNotification, ...notificationHandlers } = notificationService;
  server.addService(chatProto.NotificationService.service, notificationHandlers);

  // Start server
  const address = `0.0.0.0:${config.grpcPort}`;
  server.bindAsync(address, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      console.error("Failed to bind server:", err);
      process.exit(1);
    }
    console.log(`gRPC Chat Server running on port ${port}`);
  });

  // Start WebSocket server for real-time browser communication
  const wsPort = config.grpcPort + 1; // 50052 by default
  startWebSocketServer(wsPort, pool, hub, rateLimiter, config.jwtSecret);

  // Start cleanup job (deletes everything older than 2 hours)
  startCleanupJob(pool);

  // Graceful shutdown
  const shutdown = () => {
    console.log("Shutting down...");
    server.tryShutdown(() => {
      pool.end();
      console.log("Server stopped");
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
