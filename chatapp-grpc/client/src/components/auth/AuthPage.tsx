'use client';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

function generateRandomName(): string {
  const adjectives = ['Swift', 'Silent', 'Cosmic', 'Neon', 'Shadow', 'Pixel', 'Cyber', 'Ghost', 'Mystic', 'Turbo'];
  const nouns = ['Fox', 'Wolf', 'Hawk', 'Raven', 'Tiger', 'Panda', 'Ninja', 'Wizard', 'Phoenix', 'Dragon'];
  const num = Math.floor(Math.random() * 99) + 1;
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj}${noun}${num}`;
}

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await login(username, password);
      } else {
        await register(username, password);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnonymousJoin = async () => {
    setError('');
    setLoading(true);
    const anonName = generateRandomName();
    const anonPass = `anon_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    try {
      await register(anonName, anonPass);
    } catch (err: any) {
      // If name taken, try again with different name
      try {
        const retryName = generateRandomName();
        await register(retryName, anonPass);
      } catch (err2: any) {
        setError(err2.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-blue-900/20 flex items-center justify-center p-4">
      <div className="bg-gray-800/80 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-700/50">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
            <span className="text-2xl">💬</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">gRPC Chat</h1>
          <p className="text-gray-500 text-xs mt-1">Anonymous • Ephemeral • 2hr sessions</p>
        </div>

        {/* Anonymous Quick Join */}
        <button
          onClick={handleAnonymousJoin}
          disabled={loading}
          className="w-full py-3 mb-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 disabled:opacity-40 font-medium text-sm transition-all shadow-lg shadow-purple-600/20"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              Joining...
            </span>
          ) : '⚡ Quick Join (Anonymous)'}
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gray-700"></div>
          <span className="text-gray-500 text-xs">or use credentials</span>
          <div className="flex-1 h-px bg-gray-700"></div>
        </div>
        
        <div className="flex mb-4 bg-gray-700/50 rounded-xl p-1">
          <button
            onClick={() => { setIsLogin(true); setError(''); }}
            className={`flex-1 py-2 text-sm text-center rounded-lg transition-all duration-200 ${
              isLogin ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(''); }}
            className={`flex-1 py-2 text-sm text-center rounded-lg transition-all duration-200 ${
              !isLogin ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-2.5 bg-gray-700/50 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-600/50 text-sm placeholder-gray-500 transition-all"
          />
          <input
            type="password"
            placeholder="Password (min 8 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2.5 bg-gray-700/50 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-600/50 text-sm placeholder-gray-500 transition-all"
          />
          {error && (
            <p className="text-red-400 text-xs bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-sm transition-all"
          >
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-gray-600 text-xs mt-4">
          ⏱️ All data auto-deletes after 2 hours
        </p>
      </div>
    </div>
  );
}
