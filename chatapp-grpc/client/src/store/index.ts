import { create } from 'zustand';

interface User {
  userId: string;
  username: string;
  token: string;
}

interface Room {
  id: string;
  name: string;
  created_by: string;
  is_direct: boolean;
  member_count: number;
  invite_code?: string;
}

interface Message {
  message_id: string;
  client_message_id: string;
  room_id: string;
  sender_id: string;
  sender_username?: string;
  content: string;
  timestamp: { seconds: string; nanos: number };
  type: number;
}

interface TypingUser {
  user_id: string;
  username: string;
}

interface ChatStore {
  // Auth
  user: User | null;
  setUser: (user: User | null) => void;
  
  // Rooms
  rooms: Room[];
  setRooms: (rooms: Room[]) => void;
  addRoom: (room: Room) => void;
  removeRoom: (roomId: string) => void;
  activeRoomId: string | null;
  setActiveRoomId: (id: string | null) => void;
  
  // Messages
  messages: Record<string, Message[]>;
  setMessages: (roomId: string, messages: Message[]) => void;
  addMessage: (roomId: string, message: Message) => void;
  
  // Online users
  onlineUsers: Map<string, string>; // userId -> username
  setOnlineUsers: (users: { user_id: string; username: string }[]) => void;
  setUserOnline: (userId: string, username: string) => void;
  setUserOffline: (userId: string) => void;

  // Typing
  typingUsers: Record<string, TypingUser[]>; // roomId -> typing users
  setTyping: (roomId: string, userId: string, username: string, isTyping: boolean) => void;

  // Notifications
  unreadCount: number;
  setUnreadCount: (count: number) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  // Auth
  user: null,
  setUser: (user) => set({ user }),
  
  // Rooms
  rooms: [],
  setRooms: (rooms) => set({ rooms }),
  addRoom: (room) => set((state) => ({ rooms: [...state.rooms, room] })),
  removeRoom: (roomId) => set((state) => ({ rooms: state.rooms.filter(r => r.id !== roomId) })),
  activeRoomId: null,
  setActiveRoomId: (id) => set({ activeRoomId: id }),
  
  // Messages
  messages: {},
  setMessages: (roomId, messages) => set((state) => ({
    messages: { ...state.messages, [roomId]: messages }
  })),
  addMessage: (roomId, message) => set((state) => {
    const existing = state.messages[roomId] || [];
    if (existing.some(m => m.message_id === message.message_id)) {
      return state;
    }
    return {
      messages: {
        ...state.messages,
        [roomId]: [...existing, message]
      }
    };
  }),

  // Online users
  onlineUsers: new Map(),
  setOnlineUsers: (users) => set(() => {
    const map = new Map<string, string>();
    users.forEach(u => map.set(u.user_id, u.username));
    return { onlineUsers: map };
  }),
  setUserOnline: (userId, username) => set((state) => {
    const newMap = new Map(state.onlineUsers);
    newMap.set(userId, username);
    return { onlineUsers: newMap };
  }),
  setUserOffline: (userId) => set((state) => {
    const newMap = new Map(state.onlineUsers);
    newMap.delete(userId);
    return { onlineUsers: newMap };
  }),

  // Typing
  typingUsers: {},
  setTyping: (roomId, userId, username, isTyping) => set((state) => {
    const current = state.typingUsers[roomId] || [];
    if (isTyping) {
      if (current.some(u => u.user_id === userId)) return state;
      return { typingUsers: { ...state.typingUsers, [roomId]: [...current, { user_id: userId, username }] } };
    } else {
      return { typingUsers: { ...state.typingUsers, [roomId]: current.filter(u => u.user_id !== userId) } };
    }
  }),
  
  // Notifications
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: count }),
}));

export type { User, Room, Message, TypingUser };
