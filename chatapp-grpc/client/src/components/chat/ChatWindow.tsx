'use client';
import { useState, useEffect, useRef } from 'react';
import { useChat } from '@/hooks/useChat';
import { useRooms } from '@/hooks/useRooms';
import { useChatStore } from '@/store';
import { getRoomKey } from '@/lib/roomKeys';

interface ChatWindowProps {
  onMenuClick?: () => void;
}

export function ChatWindow({ onMenuClick }: ChatWindowProps) {
  const { activeRoomId, rooms, leaveRoom, loadRooms } = useRooms();
  const { messages, typingUsers, loadHistory, sendMessage, handleTypingInput } = useChat();
  const user = useChatStore((s) => s.user);
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const setActiveRoomId = useChatStore((s) => s.setActiveRoomId);
  const [input, setInput] = useState('');
  const [showRoomInfo, setShowRoomInfo] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeRoom = rooms.find((r) => r.id === activeRoomId);
  const isE2EE = activeRoomId ? !!getRoomKey(activeRoomId) : false;

  useEffect(() => {
    if (activeRoomId) {
      loadHistory(activeRoomId);
    }
  }, [activeRoomId, loadHistory]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeRoomId) return;
    sendMessage(activeRoomId, input.trim());
    setInput('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (activeRoomId) handleTypingInput(activeRoomId);
  };

  const handleLeaveRoom = async () => {
    if (!activeRoomId) return;
    try {
      await leaveRoom(activeRoomId);
      setActiveRoomId(null);
      await loadRooms();
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeRoomId) return;
    sendMessage(activeRoomId, `📎 ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
    e.target.value = '';
  };

  if (!activeRoomId) {
    return (
      <div className="flex-1 bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">💬</span>
          </div>
          <p className="text-gray-400 text-lg font-medium mb-1">Welcome to gRPC Chat</p>
          <p className="text-gray-600 text-sm">Select a room from the sidebar to start chatting</p>
          <button
            onClick={onMenuClick}
            className="md:hidden mt-4 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg text-sm"
          >
            ☰ Open Rooms
          </button>
        </div>
      </div>
    );
  }

  const typingText = typingUsers.length > 0
    ? typingUsers.length === 1
      ? `${typingUsers[0].username} is typing...`
      : `${typingUsers.map(u => u.username).join(', ')} are typing...`
    : null;

  return (
    <div className="flex-1 bg-gray-900 flex flex-col min-w-0">
      {/* Header */}
      <div className="px-4 sm:px-6 py-3 border-b border-gray-700 bg-gray-800/95 backdrop-blur-sm flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onMenuClick} className="md:hidden text-gray-400 hover:text-white p-1">
            ☰
          </button>
          <div className="min-w-0">
            <h2 className="text-white font-semibold text-sm sm:text-base flex items-center gap-1.5 truncate">
              <span className="text-blue-400">#</span>
              {activeRoom?.name || 'Chat'}
              {isE2EE && <span className="text-green-400 text-xs" title="End-to-end encrypted">🔒</span>}
            </h2>
            <p className="text-gray-500 text-xs">{activeRoom?.member_count} members</p>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            onClick={() => setShowRoomInfo(!showRoomInfo)}
            className="text-xs text-gray-400 hover:text-white px-2 py-1.5 rounded-lg hover:bg-gray-700 transition-colors"
          >
            ℹ️
          </button>
          <button
            onClick={handleLeaveRoom}
            className="text-xs text-red-400 hover:text-red-300 px-2 py-1.5 rounded-lg hover:bg-red-900/20 transition-colors"
          >
            Leave
          </button>
        </div>
      </div>

      {/* Room info panel */}
      {showRoomInfo && (
        <div className="px-4 sm:px-6 py-2 bg-gray-800/50 border-b border-gray-700 text-xs text-gray-400 space-y-1">
          <p>Room ID: <code className="bg-gray-700 px-1.5 py-0.5 rounded text-gray-300">{activeRoomId?.slice(0, 8)}...</code></p>
          {activeRoom?.invite_code && <p>Invite Code: <code className="bg-gray-700 px-1.5 py-0.5 rounded text-green-300">{activeRoom.invite_code}</code></p>}
          <p>Online: {Array.from(onlineUsers.values()).length > 0 ? Array.from(onlineUsers.values()).join(', ') : 'No one else'}</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-2">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 text-sm">No messages yet. Say hello! 👋</p>
          </div>
        )}
        {messages.map((msg, idx) => {
          const isMine = msg.sender_id === user?.userId;
          const senderName = msg.sender_username || msg.sender_id.slice(0, 8);
          const showSender = !isMine && (idx === 0 || messages[idx - 1]?.sender_id !== msg.sender_id);
          return (
            <div key={msg.message_id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] sm:max-w-[70%] ${isMine ? '' : 'flex gap-2'}`}>
                {!isMine && showSender && (
                  <div className="w-7 h-7 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-1">
                    {senderName[0]?.toUpperCase()}
                  </div>
                )}
                {!isMine && !showSender && <div className="w-7 shrink-0" />}
                <div className={`px-3 sm:px-4 py-2 rounded-2xl ${
                  isMine
                    ? 'bg-blue-600 text-white rounded-br-md'
                    : 'bg-gray-750 bg-gray-700 text-gray-200 rounded-bl-md'
                }`}>
                  {showSender && !isMine && (
                    <p className="text-xs font-medium text-blue-300 mb-0.5">{senderName}</p>
                  )}
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                  <p className={`text-xs mt-1 ${isMine ? 'text-blue-200/60' : 'text-gray-500'} text-right`}>
                    {new Date(Number(msg.timestamp.seconds) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      {typingText && (
        <div className="px-4 sm:px-6 py-1.5 text-xs text-gray-400 italic flex items-center gap-2">
          <span className="flex gap-0.5">
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
          </span>
          {typingText}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className="px-3 sm:px-6 py-3 border-t border-gray-700 bg-gray-800/95 backdrop-blur-sm">
        <div className="flex gap-2 items-center">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-700 transition-colors shrink-0"
            title="Attach file"
          >
            📎
          </button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder={`Message #${activeRoom?.name || 'chat'}...`}
            className="flex-1 px-4 py-2.5 bg-gray-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm placeholder-gray-500 transition-all min-w-0"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed text-sm font-medium transition-all shrink-0"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
