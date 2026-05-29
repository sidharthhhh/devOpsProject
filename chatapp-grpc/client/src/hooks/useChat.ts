'use client';
import { useEffect, useCallback, useRef } from 'react';
import { useChatStore, Message } from '@/store';
import { encryptMessage, decryptMessage, isEncrypted } from '@/lib/crypto';
import { getRoomKey } from '@/lib/roomKeys';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:50052';

let globalWs: WebSocket | null = null;
let globalToken: string | null = null;

function getOrCreateWs(token: string): WebSocket {
  if (globalWs && globalWs.readyState === WebSocket.OPEN && globalToken === token) {
    return globalWs;
  }
  if (globalWs && globalWs.readyState === WebSocket.CONNECTING && globalToken === token) {
    return globalWs;
  }
  if (globalWs) {
    globalWs.close();
  }

  globalToken = token;
  const ws = new WebSocket(`${WS_URL}?token=${token}`);

  ws.onopen = () => {
    console.log('WebSocket connected');
  };

  ws.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      const store = useChatStore.getState();

      switch (payload.type) {
        case 'message': {
          const msg = payload.data;
          let content = msg.content;
          
          // Decrypt if message is encrypted and we have the room key
          const roomKey = getRoomKey(msg.room_id);
          if (roomKey && isEncrypted(content)) {
            decryptMessage(content, roomKey).then(decrypted => {
              const newMessage: Message = {
                message_id: msg.message_id,
                client_message_id: msg.client_message_id || '',
                room_id: msg.room_id,
                sender_id: msg.sender_id,
                sender_username: msg.sender_username || '',
                content: decrypted,
                timestamp: { seconds: String(Math.floor(new Date(msg.created_at).getTime() / 1000)), nanos: 0 },
                type: msg.message_type || 0,
              };
              store.addMessage(msg.room_id, newMessage);
            });
          } else {
            const newMessage: Message = {
              message_id: msg.message_id,
              client_message_id: msg.client_message_id || '',
              room_id: msg.room_id,
              sender_id: msg.sender_id,
              sender_username: msg.sender_username || '',
              content,
              timestamp: { seconds: String(Math.floor(new Date(msg.created_at).getTime() / 1000)), nanos: 0 },
              type: msg.message_type || 0,
            };
            store.addMessage(msg.room_id, newMessage);
          }
          // Clear typing for this user
          store.setTyping(msg.room_id, msg.sender_id, msg.sender_username || '', false);
          break;
        }
        case 'typing': {
          const { user_id, username, room_id, is_typing } = payload.data;
          store.setTyping(room_id, user_id, username, is_typing);
          break;
        }
        case 'presence': {
          const { user_id, username, online } = payload.data;
          if (online) {
            store.setUserOnline(user_id, username);
          } else {
            store.setUserOffline(user_id);
          }
          break;
        }
        case 'online_users': {
          store.setOnlineUsers(payload.data);
          break;
        }
      }
    } catch (err) {
      console.error('WS message parse error:', err);
    }
  };

  ws.onclose = () => {
    console.log('WebSocket disconnected');
    globalWs = null;
    setTimeout(() => {
      const currentToken = useChatStore.getState().user?.token;
      if (currentToken) {
        getOrCreateWs(currentToken);
      }
    }, 3000);
  };

  ws.onerror = () => {
    ws.close();
  };

  globalWs = ws;
  return ws;
}

export function useChat() {
  const user = useChatStore((s) => s.user);
  const activeRoomId = useChatStore((s) => s.activeRoomId);
  const allMessages = useChatStore((s) => s.messages);
  const typingUsers = useChatStore((s) => s.typingUsers);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    if (user?.token) {
      getOrCreateWs(user.token);
    }
  }, [user?.token]);

  const loadHistory = useCallback(async (roomId: string) => {
    const token = useChatStore.getState().user?.token;
    if (!token) return;
    try {
      const res = await fetch(`/api/rooms/${roomId}/history`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.messages) {
        useChatStore.getState().setMessages(roomId, data.messages);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  }, []);

  const sendMessage = useCallback(async (roomId: string, content: string) => {
    if (!globalWs || globalWs.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      return;
    }
    // Encrypt if we have a room key
    let messageContent = content;
    const roomKey = getRoomKey(roomId);
    if (roomKey) {
      messageContent = await encryptMessage(content, roomKey);
    }
    globalWs.send(JSON.stringify({
      type: 'send_message',
      data: { room_id: roomId, content: messageContent, client_message_id: crypto.randomUUID() },
    }));
    // Stop typing indicator
    sendTyping(roomId, false);
  }, []);

  const sendTyping = useCallback((roomId: string, isTyping: boolean) => {
    if (!globalWs || globalWs.readyState !== WebSocket.OPEN) return;
    if (isTyping === isTypingRef.current) return;
    isTypingRef.current = isTyping;
    globalWs.send(JSON.stringify({
      type: 'typing',
      data: { room_id: roomId, is_typing: isTyping },
    }));
  }, []);

  const handleTypingInput = useCallback((roomId: string) => {
    sendTyping(roomId, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(roomId, false);
    }, 2000);
  }, [sendTyping]);

  const notifyJoinRoom = useCallback((roomId: string) => {
    if (globalWs?.readyState === WebSocket.OPEN) {
      globalWs.send(JSON.stringify({ type: 'join_room', data: { room_id: roomId } }));
    }
  }, []);

  const roomMessages = activeRoomId ? (allMessages[activeRoomId] || []) : [];
  const roomTyping = activeRoomId ? (typingUsers[activeRoomId] || []) : [];

  return { messages: roomMessages, typingUsers: roomTyping, loadHistory, sendMessage, handleTypingInput, notifyJoinRoom };
}
