import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.realtechcomputer.com';

interface Notification {
  id: number;
  title: string;
  title_km: string | null;
  message: string;
  message_km: string | null;
  type: string;
  published_at: string | null;
  created_at: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const readIds: Set<string> = (() => {
    try {
      return new Set(JSON.parse(localStorage.getItem('macsofy_read_notifs') || '[]'));
    } catch {
      return new Set<string>();
    }
  })();

  const markAsRead = (id: number) => {
    readIds.add(String(id));
    localStorage.setItem('macsofy_read_notifs', JSON.stringify([...readIds]));
  };

  const unreadCount = notifications.filter(n => !readIds.has(String(n.id))).length;

  useEffect(() => {
    if (!user) return;
    
    const fetchNotifications = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('auth_token') || '';
        const res = await fetch(`${API_BASE_URL}/api/notifications/my`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
        });
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [user]);

  return { notifications, loading, unreadCount, markAsRead, readIds };
}
