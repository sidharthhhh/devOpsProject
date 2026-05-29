'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRooms } from '@/hooks/useRooms';
import { useNotifications } from '@/hooks/useNotifications';
import { useChat } from '@/hooks/useChat';
import { useChatStore } from '@/store';
import { generateRoomKey, setRoomKey, getRoomKey } from '@/lib/roomKeys';

function useSessionTimer() {
  const user = useChatStore((s) => s.user);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!user?.token) return;
    // Decode JWT to get expiry
    try {
      const payload = JSON.parse(atob(user.token.split('.')[1]));
      const expiresAt = payload.exp * 1000;

      const update = () => {
        const remaining = expiresAt - Date.now();
        if (remaining <= 0) {
          setTimeLeft('Expired');
          return;
        }
        const hours = Math.floor(remaining / 3600000);
        const mins = Math.floor((remaining % 3600000) / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        setTimeLeft(`${hours}h ${mins}m ${secs}s`);
      };

      update();
      const interval = setInterval(update, 1000);
      return () => clearInterval(interval);
    } catch {
      setTimeLeft('');
    }
  }, [user?.token]);

  return timeLeft;
}

interface SidebarProps {
  onRoomSelect?: () => void;
}

export function Sidebar({ onRoomSelect }: SidebarProps) {
  const { user, logout } = useAuth();
  const { rooms, activeRoomId, setActiveRoomId, loadRooms, createRoom, joinRoom } = useRooms();
  const { unreadCount, loadUnreadCount } = useNotifications();
  const { notifyJoinRoom } = useChat();
  const timeLeft = useSessionTimer();
  const [newRoomName, setNewRoomName] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadRooms();
    loadUnreadCount();
  }, []);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    setError('');
    try {
      const room = await createRoom(newRoomName);
      // Generate and store E2EE key for this room
      const key = generateRoomKey();
      setRoomKey(room.id, key);
      setNewRoomName('');
      setShowCreate(false);
      await loadRooms();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinRoomId.trim()) return;
    setError('');
    try {
      await joinRoom(joinRoomId.trim());
      notifyJoinRoom(joinRoomId.trim());
      setJoinRoomId('');
      setShowJoin(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSelectRoom = (roomId: string) => {
    setActiveRoomId(roomId);
    onRoomSelect?.();
  };

  const copyRoomLink = (inviteCode: string, roomId: string) => {
    // Include encryption key in URL fragment (never sent to server)
    const key = getRoomKey(roomId);
    let link = `${window.location.origin}/join/${inviteCode}`;
    if (key) {
      link += `#key=${key}`;
    }
    navigator.clipboard.writeText(link);
    setCopied(inviteCode);
    setTimeout(() => setCopied(null), 2000);
  };

  const loadMembers = async (roomId: string) => {
    const token = user?.token;
    if (!token) return;
    try {
      const res = await fetch(`/api/rooms/${roomId}/members`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.members) {
        setMembers(data.members);
        setShowMembers(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="w-72 sm:w-80 md:w-72 bg-gray-800 h-full flex flex-col border-r border-gray-700">
      {/* User info */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-white text-sm font-medium">{user?.username}</p>
              <p className="text-green-400 text-xs flex items-center gap-1">
                <span className="w-2 h-2 bg-green-400 rounded-full inline-block"></span>
                Online
              </p>
            </div>
          </div>
          <button onClick={logout} className="text-gray-400 hover:text-red-400 text-xs px-2 py-1 rounded hover:bg-gray-700 transition-colors">
            Logout
          </button>
        </div>
      </div>

      {/* Session timer */}
      {timeLeft && (
        <div className="px-4 py-2 border-b border-gray-700 bg-orange-900/10">
          <p className="text-xs text-orange-300 flex items-center gap-1.5">
            <span>⏱️</span>
            <span>Session expires in: <strong>{timeLeft}</strong></span>
          </p>
        </div>
      )}

      {/* Notifications */}
      {unreadCount > 0 && (
        <div className="px-4 py-2 bg-blue-900/20 border-b border-blue-900/30 text-blue-300 text-xs flex items-center gap-2">
          <span className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">{unreadCount}</span>
          unread notification{unreadCount > 1 ? 's' : ''}
        </div>
      )}

      {/* Actions */}
      <div className="p-3 space-y-2 border-b border-gray-700">
        {error && <p className="text-red-400 text-xs bg-red-900/20 px-2 py-1 rounded">{error}</p>}

        {showCreate ? (
          <form onSubmit={handleCreateRoom} className="flex gap-2">
            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="Room name..."
              className="flex-1 px-3 py-1.5 bg-gray-700 text-white text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              autoFocus
            />
            <button type="submit" className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors">Create</button>
            <button type="button" onClick={() => setShowCreate(false)} className="px-2 py-1.5 bg-gray-600 text-white text-xs rounded-lg hover:bg-gray-500 transition-colors">✕</button>
          </form>
        ) : showJoin ? (
          <form onSubmit={handleJoinRoom} className="flex gap-2">
            <input
              type="text"
              value={joinRoomId}
              onChange={(e) => setJoinRoomId(e.target.value)}
              placeholder="Room ID or invite code"
              className="flex-1 px-3 py-1.5 bg-gray-700 text-white text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
              autoFocus
            />
            <button type="submit" className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors">Join</button>
            <button type="button" onClick={() => setShowJoin(false)} className="px-2 py-1.5 bg-gray-600 text-white text-xs rounded-lg hover:bg-gray-500 transition-colors">✕</button>
          </form>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => { setShowCreate(true); setShowJoin(false); setError(''); }}
              className="flex-1 py-2 bg-blue-600/20 text-blue-300 text-xs rounded-lg hover:bg-blue-600/30 border border-blue-600/30 transition-colors"
            >
              + Create
            </button>
            <button
              onClick={() => { setShowJoin(true); setShowCreate(false); setError(''); }}
              className="flex-1 py-2 bg-green-600/20 text-green-300 text-xs rounded-lg hover:bg-green-600/30 border border-green-600/30 transition-colors"
            >
              🔗 Join
            </button>
          </div>
        )}
      </div>

      {/* Room list */}
      <div className="flex-1 overflow-y-auto py-2">
        <p className="px-4 py-1 text-xs text-gray-500 uppercase tracking-wider font-semibold">Rooms</p>
        {rooms.length === 0 && (
          <p className="px-4 py-3 text-gray-600 text-xs">No rooms yet. Create or join one!</p>
        )}
        {rooms.map((room) => (
          <div
            key={room.id}
            className={`group mx-2 mb-0.5 px-3 py-2.5 flex items-center gap-2 rounded-lg cursor-pointer transition-all duration-150 ${
              activeRoomId === room.id
                ? 'bg-blue-600/20 border border-blue-600/30'
                : 'hover:bg-gray-700/50 border border-transparent'
            }`}
          >
            <button
              onClick={() => handleSelectRoom(room.id)}
              className="flex-1 text-left text-sm flex items-center gap-2 min-w-0"
            >
              <span className={`text-lg ${activeRoomId === room.id ? 'text-blue-400' : 'text-gray-500'}`}>#</span>
              <span className={`truncate ${activeRoomId === room.id ? 'text-white font-medium' : 'text-gray-300'}`}>
                {room.name}
              </span>
            </button>
            <span className="text-xs text-gray-500 bg-gray-700/50 px-1.5 py-0.5 rounded">{room.member_count}</span>
            <button
              onClick={(e) => { e.stopPropagation(); copyRoomLink(room.invite_code || room.id, room.id); }}
              className="text-xs text-gray-500 hover:text-blue-400 transition-colors"
              title={`Share invite link`}
            >
              {copied === (room.invite_code || room.id) ? '✓' : '🔗'}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); loadMembers(room.id); }}
              className="text-xs text-gray-500 hover:text-blue-400 transition-colors"
              title="View members"
            >
              👥
            </button>
          </div>
        ))}
      </div>

      {/* Members modal */}
      {showMembers && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowMembers(false)}>
          <div className="bg-gray-800 rounded-xl p-5 w-full max-w-xs max-h-80 overflow-y-auto shadow-2xl border border-gray-700" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-semibold">Members</h3>
              <button onClick={() => setShowMembers(false)} className="text-gray-400 hover:text-white w-6 h-6 flex items-center justify-center rounded hover:bg-gray-700">✕</button>
            </div>
            {members.map((m) => (
              <div key={m.user_id} className="flex items-center gap-3 py-2.5 border-b border-gray-700/50 last:border-0">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {m.username?.[0]?.toUpperCase()}
                </div>
                <span className="text-gray-200 text-sm flex-1">{m.username}</span>
                {m.online && <span className="w-2.5 h-2.5 bg-green-400 rounded-full shadow-sm shadow-green-400/50"></span>}
              </div>
            ))}
            {members.length === 0 && <p className="text-gray-500 text-sm text-center py-4">No members</p>}
          </div>
        </div>
      )}
    </div>
  );
}
