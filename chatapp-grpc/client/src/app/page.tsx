'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRooms } from '@/hooks/useRooms';
import { AuthPage } from '@/components/auth/AuthPage';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { useChatStore } from '@/store';

export default function Home() {
  const { user, loadFromStorage } = useAuth();
  const { joinRoom } = useRooms();
  const setActiveRoomId = useChatStore((s) => s.setActiveRoomId);
  const activeRoomId = useChatStore((s) => s.activeRoomId);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    loadFromStorage();
  }, []);

  useEffect(() => {
    if (!user) return;
    const pendingRoom = localStorage.getItem('pending_join_room');
    if (pendingRoom) {
      localStorage.removeItem('pending_join_room');
      joinRoom(pendingRoom).then(() => setActiveRoomId(pendingRoom)).catch(() => setActiveRoomId(pendingRoom));
    }
    const pendingCode = localStorage.getItem('pending_join_code');
    if (pendingCode) {
      localStorage.removeItem('pending_join_code');
    }
  }, [user]);

  // On mobile, close sidebar when a room is selected
  useEffect(() => {
    if (activeRoomId && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, [activeRoomId]);

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="flex h-screen bg-gray-900 overflow-hidden">
      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden fixed top-3 left-3 z-50 p-2 bg-gray-800 rounded-lg text-white shadow-lg"
      >
        {sidebarOpen ? '✕' : '☰'}
      </button>

      {/* Sidebar overlay on mobile */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed md:relative z-40 h-full transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <Sidebar onRoomSelect={() => { if (window.innerWidth < 768) setSidebarOpen(false); }} />
      </div>

      {/* Chat area */}
      <ChatWindow onMenuClick={() => setSidebarOpen(true)} />
    </div>
  );
}
