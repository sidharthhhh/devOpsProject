'use client';
import { useChatStore } from '@/store';

export function useNotifications() {
  const { user, unreadCount, setUnreadCount } = useChatStore();

  const loadUnreadCount = async () => {
    const res = await fetch('/api/notifications', {
      headers: { 'Authorization': `Bearer ${user?.token}` },
    });
    const data = await res.json();
    if (res.ok) {
      setUnreadCount(data.total || 0);
    }
  };

  const markRead = async (notificationIds: string[]) => {
    await fetch('/api/notifications/read', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user?.token}`,
      },
      body: JSON.stringify({ notification_ids: notificationIds }),
    });
    await loadUnreadCount();
  };

  return { unreadCount, loadUnreadCount, markRead };
}
