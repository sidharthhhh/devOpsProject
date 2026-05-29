'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useChatStore } from '@/store';
import { useAuth } from '@/hooks/useAuth';
import { setRoomKey } from '@/lib/roomKeys';

export default function JoinRoomPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.roomId as string; // This is the invite code (6-digit number)
  const { user, loadFromStorage } = useAuth();
  const setActiveRoomId = useChatStore((s) => s.setActiveRoomId);
  const [status, setStatus] = useState<'loading' | 'joining' | 'success' | 'error' | 'needsLogin'>('loading');
  const [error, setError] = useState('');
  const [roomName, setRoomName] = useState('');

  useEffect(() => {
    loadFromStorage();
  }, []);

  useEffect(() => {
    // Fetch room info by invite code
    fetch(`/api/rooms/invite/${code}`)
      .then(res => res.json())
      .then(data => {
        if (data.name) setRoomName(data.name);
      })
      .catch(() => {});
  }, [code]);

  useEffect(() => {
    if (status !== 'loading') return;

    if (!user) {
      const timer = setTimeout(() => {
        if (!useChatStore.getState().user) {
          setStatus('needsLogin');
        }
      }, 500);
      return () => clearTimeout(timer);
    }

    joinRoom();
  }, [user, status]);

  const joinRoom = async () => {
    if (!user) return;
    setStatus('joining');
    try {
      const res = await fetch(`/api/rooms/invite/${code}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user.token}` },
      });
      const data = await res.json();

      if (res.ok) {
        setStatus('success');
        // Store encryption key from URL fragment if present
        if (data.room_id) {
          const hash = window.location.hash;
          const keyMatch = hash.match(/key=([^&]+)/);
          if (keyMatch) {
            setRoomKey(data.room_id, keyMatch[1]);
          }
          setActiveRoomId(data.room_id);
        }
        setTimeout(() => router.push('/'), 1000);
      } else {
        setError(data.error || 'Failed to join room');
        setStatus('error');
      }
    } catch (err: any) {
      setError(err.message);
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md text-center">
        <h1 className="text-2xl font-bold text-white mb-2">gRPC Chat</h1>
        <p className="text-gray-400 text-sm mb-6">Room Invite</p>

        {roomName && (
          <div className="mb-4 p-3 bg-gray-700 rounded-lg">
            <p className="text-gray-400 text-xs">You're invited to join</p>
            <p className="text-white font-semibold text-lg"># {roomName}</p>
            <p className="text-gray-500 text-xs mt-1">Code: {code}</p>
          </div>
        )}

        {status === 'loading' && (
          <p className="text-gray-400">Loading...</p>
        )}

        {status === 'needsLogin' && (
          <div>
            <p className="text-gray-300 mb-4">Log in to join this room.</p>
            <button
              onClick={() => {
                localStorage.setItem('pending_join_code', code);
                router.push('/');
              }}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go to Login
            </button>
          </div>
        )}

        {status === 'joining' && (
          <div>
            <p className="text-gray-300">Joining room...</p>
            <div className="mt-3 w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        )}

        {status === 'success' && (
          <div>
            <p className="text-green-400 text-lg">✓ Joined successfully!</p>
            <p className="text-gray-500 text-sm mt-2">Redirecting to chat...</p>
          </div>
        )}

        {status === 'error' && (
          <div>
            <p className="text-red-400 mb-3">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
            >
              Go to Chat
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
