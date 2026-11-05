'use client';

import { useEffect, useState } from 'react';
import { connectedRequest } from './request';
import type { Notification } from './types';
import styles from './connected-workspace.module.css';

type NotificationPage = { data: Notification[]; meta: { total: number } };

export function NotificationPanel({
  userId,
  onOpenCampaign,
}: {
  userId: string;
  onOpenCampaign: (slug: string) => Promise<void>;
}) {
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  async function reload() {
    const [recent, unread] = await Promise.all([
      connectedRequest<NotificationPage>('notifications?limit=5'),
      connectedRequest<NotificationPage>('notifications?unreadOnly=true&limit=1'),
    ]);
    setItems(recent.data);
    setUnreadCount(unread.meta.total);
  }

  useEffect(() => {
    let active = true;
    Promise.all([
      connectedRequest<NotificationPage>('notifications?limit=5'),
      connectedRequest<NotificationPage>('notifications?unreadOnly=true&limit=1'),
    ])
      .then(([recent, unread]) => {
        if (!active) return;
        setItems(recent.data);
        setUnreadCount(unread.meta.total);
      })
      .catch((reason) => {
        if (active) setError((reason as Error).message);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  async function markRead(id: string) {
    setBusyId(id);
    setError('');
    try {
      await connectedRequest(`notifications/${id}/read`, 'PATCH');
      await reload();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusyId('');
    }
  }

  return (
    <details className={styles.notificationPanel}>
      <summary>Thông báo {unreadCount > 0 ? `(${unreadCount} chưa đọc)` : ''}</summary>
      <button
        type="button"
        className={styles.textButton}
        onClick={() => void reload().catch((reason) => setError((reason as Error).message))}
      >
        Tải lại thông báo
      </button>
      {error && (
        <p role="alert" className={styles.inlineError}>
          {error}
        </p>
      )}
      {!items.length && !error && (
        <p className={styles.notificationEmpty}>Chưa có thông báo mới.</p>
      )}
      <div className={styles.notificationList}>
        {items.map((item) => {
          const slug = item.actionUrl?.match(/^\/projects\/([a-z0-9-]+)/)?.[1];
          return (
            <article key={item.id} className={item.readAt ? '' : styles.unread}>
              <strong>{item.title}</strong>
              <p>{item.body}</p>
              <small>{new Date(item.createdAt).toLocaleString('vi-VN')}</small>
              <div className={styles.notificationActions}>
                {slug && (
                  <button
                    type="button"
                    className={styles.textButton}
                    onClick={() => void onOpenCampaign(slug)}
                  >
                    Mở dự án
                  </button>
                )}
                {!item.readAt && (
                  <button
                    type="button"
                    className={styles.textButton}
                    disabled={busyId === item.id}
                    onClick={() => void markRead(item.id)}
                  >
                    Đã đọc
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </details>
  );
}
