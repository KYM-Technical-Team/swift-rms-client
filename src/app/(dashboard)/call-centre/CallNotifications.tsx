'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  getNotifications,
  getUnreadCount,
  markAllAsRead,
  markAsRead,
  type Notification,
} from '@/lib/api/notifications';

const isRead = (notification: Notification) =>
  notification.status === 'READ' || Boolean(notification.readAt);

/**
 * Console-styled notification bell. The shared NotificationDropdown is built for the
 * dark app chrome, so the call centre uses its own presentation over the same endpoints.
 */
export function CallNotifications() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  const { data: unread } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: getUnreadCount,
    refetchInterval: 30000,
  });

  const { data: list, isLoading, isError } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => getNotifications(1, 8),
    enabled: open,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['notifications'] });
  const readOne = useMutation({ mutationFn: markAsRead, onSuccess: invalidate });
  const readAll = useMutation({ mutationFn: markAllAsRead, onSuccess: invalidate });

  const unreadCount = unread?.count ?? 0;
  const notifications = list?.data ?? [];

  return (
    <div className="cc-notif" ref={containerRef}>
      <button
        type="button"
        className={`cc-icon-button cc-icon-button--dark ${open ? 'is-active' : ''}`}
        onClick={() => setOpen((value) => !value)}
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={open}
      >
        <Bell size={16} />
        {unreadCount > 0 && <b>{unreadCount > 99 ? '99+' : unreadCount}</b>}
      </button>

      {open && (
        <div className="cc-notif__panel" role="dialog" aria-label="Notifications">
          <div className="cc-notif__head">
            <span className="cc-eyebrow">Notifications{unreadCount > 0 ? ` · ${unreadCount} unread` : ''}</span>
            {unreadCount > 0 && (
              <button type="button" onClick={() => readAll.mutate()} disabled={readAll.isPending}>
                <CheckCheck size={12} /> Mark all read
              </button>
            )}
          </div>
          <div className="cc-notif__list">
            {isLoading && [0, 1, 2].map((row) => <div className="cc-skeleton cc-skeleton--row" key={row} />)}
            {isError && !isLoading && <p className="cc-empty-copy">Notifications are unavailable right now.</p>}
            {!isLoading && !isError && !notifications.length && (
              <p className="cc-empty-copy">No notifications yet.</p>
            )}
            {notifications.map((notification) => (
              <button
                type="button"
                className={`cc-notif__item ${isRead(notification) ? '' : 'is-unread'}`}
                key={notification.id}
                onClick={() => {
                  if (!isRead(notification)) readOne.mutate(notification.id);
                  setOpen(false);
                }}
              >
                <i data-priority={notification.priority} />
                <div>
                  <strong>{notification.title}</strong>
                  <span>{notification.message}</span>
                </div>
                <time>{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}</time>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
