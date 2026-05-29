'use client';
import { useChatStore } from '@/store';

export function useRooms() {
  const { user, rooms, setRooms, addRoom, activeRoomId, setActiveRoomId } = useChatStore();

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${user?.token}`,
  });

  const loadRooms = async () => {
    const res = await fetch('/api/rooms', { headers: getHeaders() });
    const data = await res.json();
    if (res.ok && data.rooms) {
      setRooms(data.rooms);
    }
  };

  const createRoom = async (name: string) => {
    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, is_direct: false }),
    });
    const data = await res.json();
    if (res.ok) {
      addRoom(data);
      return data;
    }
    throw new Error(data.error || 'Failed to create room');
  };

  const joinRoom = async (roomId: string) => {
    const res = await fetch(`/api/rooms/${roomId}/join`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to join room');
    }
    await loadRooms();
  };

  const leaveRoom = async (roomId: string) => {
    const res = await fetch(`/api/rooms/${roomId}/leave`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to leave room');
    }
    await loadRooms();
  };

  const createDM = async (targetUserId: string) => {
    const res = await fetch('/api/rooms/dm', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ target_user_id: targetUserId }),
    });
    const data = await res.json();
    if (res.ok) {
      addRoom(data);
      return data;
    }
    throw new Error(data.error || 'Failed to create DM');
  };

  return { rooms, activeRoomId, setActiveRoomId, loadRooms, createRoom, joinRoom, leaveRoom, createDM };
}
