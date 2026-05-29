import * as grpc from "@grpc/grpc-js";

interface ConnectedClient {
  userId: string;
  username: string;
  stream: grpc.ServerDuplexStream<any, any>;
  roomIds: string[];
}

export class Hub {
  private clients: Map<string, ConnectedClient> = new Map(); // userId -> client

  register(userId: string, username: string, stream: grpc.ServerDuplexStream<any, any>, roomIds: string[]): void {
    this.clients.set(userId, { userId, username, stream, roomIds });
  }

  unregister(userId: string): void {
    this.clients.delete(userId);
  }

  isOnline(userId: string): boolean {
    return this.clients.has(userId);
  }

  getClient(userId: string): ConnectedClient | undefined {
    return this.clients.get(userId);
  }

  // Send a message to a specific user's stream
  sendToUser(userId: string, message: any): boolean {
    const client = this.clients.get(userId);
    if (client) {
      client.stream.write(message);
      return true;
    }
    return false;
  }

  // Broadcast a message to all members of a room (except excludeUserId)
  broadcastToRoom(roomId: string, message: any, excludeUserId?: string): string[] {
    const deliveredTo: string[] = [];
    for (const [userId, client] of this.clients) {
      if (userId === excludeUserId) continue;
      if (client.roomIds.includes(roomId)) {
        client.stream.write(message);
        deliveredTo.push(userId);
      }
    }
    return deliveredTo;
  }

  // Get all online user IDs in a room
  getOnlineMembers(roomId: string): string[] {
    const online: string[] = [];
    for (const [userId, client] of this.clients) {
      if (client.roomIds.includes(roomId)) {
        online.push(userId);
      }
    }
    return online;
  }

  // Add a room to a user's room list (when they join a room while connected)
  addRoomToUser(userId: string, roomId: string): void {
    const client = this.clients.get(userId);
    if (client && !client.roomIds.includes(roomId)) {
      client.roomIds.push(roomId);
    }
  }

  // Remove a room from a user's room list
  removeRoomFromUser(userId: string, roomId: string): void {
    const client = this.clients.get(userId);
    if (client) {
      client.roomIds = client.roomIds.filter(id => id !== roomId);
    }
  }
}
