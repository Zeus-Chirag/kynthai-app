'use client';

import * as React from 'react';
import {
  Bell,
  CheckCheck,
  X,
  Pill,
  Calendar,
  Trophy,
  Users,
  Info,
  AlertTriangle,
  Siren,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SosToast } from './sos-toast';

type NotificationType = 'reminder' | 'alert' | 'achievement' | 'family' | 'system';

interface Notification {
  id: string;
  channel: string;
  type: NotificationType;
  title: string;
  body: string;
  status: string;
  createdAt: string;
  read: boolean;
}

interface NotificationCenterProps {
  userId: string;
  isDemo: boolean;
  onNavigate?: (tab: string) => void;
}

export function NotificationCenter({ userId, isDemo, onNavigate }: NotificationCenterProps) {
  const [open, setOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [marking, setMarking] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const [sosAlert, setSosAlert] = React.useState<Notification | null>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const loadNotifications = React.useCallback(async () => {
    setLoading(true);
    if (isDemo) {
      setNotifications([
        { id: '1', channel: 'app', type: 'reminder', title: 'Time for Metformin', body: 'Take your 500mg dose', status: 'sent', createdAt: new Date().toISOString(), read: false },
        { id: '2', channel: 'app', type: 'achievement', title: '7-Day Streak!', body: 'Great job!', status: 'sent', createdAt: new Date().toISOString(), read: true },
      ]);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/notifications', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [isDemo]);

  React.useEffect(() => { loadNotifications(); }, [loadNotifications]);

  React.useEffect(() => {
    if (isDemo) return;
    const interval = setInterval(() => { loadNotifications(); }, 15000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  React.useEffect(() => {
    const unreadSos = notifications.find((n) => n.type === 'alert' && !n.read && n.title?.toLowerCase().includes('sos'));
    if (unreadSos) { setSosAlert(unreadSos); }
  }, [notifications]);

  const markAllRead = async () => {
    setMarking(true);
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (isDemo) { setNotifications((prev) => prev.map((n) => ({ ...n, read: true }))); setMarking(false); return; }
    try {
      await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notificationIds: unreadIds }) });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch { /* silent */ } finally { setMarking(false); }
  };

  const handleClick = (notif: Notification) => {
    if (onNavigate) {
      if (notif.type === 'reminder') onNavigate('meds');
      else if (notif.type === 'achievement' || notif.type === 'family') onNavigate('care');
      else onNavigate('home');
    }
    setOpen(false);
  };

  const TYPE_CONFIG: Record<string, { icon: React.ElementType; colorClass: string; bg: string }> = {
    reminder: { icon: Pill, colorClass: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900' },
    alert: { icon: AlertTriangle, colorClass: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900' },
    achievement: { icon: Trophy, colorClass: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900' },
    family: { icon: Users, colorClass: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900' },
    system: { icon: Info, colorClass: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-900' },
  };

  const BORDER_COLORS: Record<string, string> = {
    reminder: 'border-l-blue-500',
    alert: 'border-l-amber-500',
    achievement: 'border-l-emerald-500',
    family: 'border-l-purple-500',
    system: 'border-l-slate-400',
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => { setOpen((prev) => !prev); if (!open) loadNotifications(); }}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors hover:bg-muted"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-muted-foreground" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span key="badge" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 top-full mt-2 w-96 rounded-2xl border bg-background shadow-xl z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-sm font-semibold">Notifications</h3>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllRead} disabled={marking}
                  className="h-7 text-[11px] text-muted-foreground hover:text-foreground">
                  <CheckCheck className="h-3.5 w-3.5 mr-1" /> Mark all read
                </Button>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <span className="text-sm">Loading...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Bell className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[400px]">
                <div role="list" aria-label="Notifications" className="p-2 space-y-1">
                  {notifications.slice(0, 20).map((notif) => {
                    const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.system;
                    const Icon = config.icon;
                    const bgClass = notif.read ? 'bg-transparent opacity-70' : 'bg-muted';
                    return (
                      <button
                        key={notif.id}
                        onClick={() => handleClick(notif)}
                        className={cn(
                          'w-full flex gap-3 rounded-xl border-l-[3px] p-3 text-left transition-all',
                          BORDER_COLORS[notif.type],
                          bgClass,
                          'hover:bg-muted'
                        )}
                      >
                        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', config.bg)}>
                          <Icon className={cn('h-4 w-4', config.colorClass)} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={cn('text-sm leading-tight', !notif.read && 'font-semibold')}>{notif.title}</p>
                            {!notif.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.body}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </motion.div>
        )}
        {sosAlert && <SosToast alert={sosAlert as unknown as { memberName: string; location?: string; notes?: string; medicalInfo?: string; timestamp: string; }} onDismiss={() => setSosAlert(null)} onNavigate={onNavigate} />}
      </AnimatePresence>
    </div>
  );
}