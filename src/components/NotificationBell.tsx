import { Bell } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDistanceToNow } from 'date-fns';

export function NotificationBell() {
  const { language } = useLanguage();
  const { notifications, unreadCount, markAsRead, readIds } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const getTitle = (n: typeof notifications[0]) =>
    language === 'km' && n.title_km ? n.title_km : n.title;

  const getMessage = (n: typeof notifications[0]) =>
    language === 'km' && n.message_km ? n.message_km : n.message;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute top-full right-0 mt-1.5 w-80 bg-popover border border-border rounded-xl shadow-lg overflow-hidden z-50 animate-fade-in"
          style={{ boxShadow: 'var(--shadow-window)' }}
        >
          <div className="px-4 py-2.5 border-b border-border/50 flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              {language === 'km' ? 'ការជូនដំណឹង' : 'Notifications'}
            </h3>
            {unreadCount > 0 && (
              <span className="text-[10px] bg-destructive/10 text-destructive font-medium px-2 py-0.5 rounded-full">
                {unreadCount} {language === 'km' ? 'ថ្មី' : 'new'}
              </span>
            )}
          </div>

          <div className="max-h-[320px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">{language === 'km' ? 'មិនមានការជូនដំណឹង' : 'No notifications yet'}</p>
              </div>
            ) : (
              notifications.slice(0, 20).map((n) => {
                const isUnread = !readIds.has(String(n.id));
                return (
                  <button
                    key={n.id}
                    className={`w-full text-left px-4 py-3 hover:bg-accent/50 transition-colors border-b border-border/30 last:border-0 ${isUnread ? 'bg-primary/5' : ''}`}
                    onClick={() => { markAsRead(n.id); }}
                  >
                    <div className="flex items-start gap-2.5">
                      {isUnread && <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-foreground line-clamp-1">{getTitle(n)}</p>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{getMessage(n)}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                          {formatDistanceToNow(new Date(n.published_at || n.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
