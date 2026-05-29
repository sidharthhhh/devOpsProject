'use client';
import { useChatStore } from '@/store';

export function useAuth() {
  const { user, setUser } = useChatStore();

  const register = async (username: string, password: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    const newUser = { userId: data.user_id, username, token: data.token };
    setUser(newUser);
    localStorage.setItem('chat_user', JSON.stringify(newUser));
    return newUser;
  };

  const login = async (username: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    const newUser = { userId: data.user_id, username, token: data.token };
    setUser(newUser);
    localStorage.setItem('chat_user', JSON.stringify(newUser));
    return newUser;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('chat_user');
  };

  const loadFromStorage = () => {
    const stored = localStorage.getItem('chat_user');
    if (stored) {
      setUser(JSON.parse(stored));
    }
  };

  return { user, register, login, logout, loadFromStorage };
}
