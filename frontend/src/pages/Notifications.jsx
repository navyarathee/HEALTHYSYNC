import { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import Breadcrumbs from '../components/Breadcrumbs';
import SkeletonLoader from '../components/SkeletonLoader';

const NOTIF_ICONS = {
  CONSENT_REQUEST: { icon: '🛡️', cls: 'notif-icon-consent' },
  APPOINTMENT_REMINDER: { icon: '📅', cls: 'notif-icon-appointment' },
  APPOINTMENT_UPDATE: { icon: '🕐', cls: 'notif-icon-appointment' },
  SYSTEM_ALERT: { icon: '⚠️', cls: 'notif-icon-system' },
  RECORD_SHARED: { icon: '📁', cls: 'notif-icon-record' },
};

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const fetchNotifications = useCallback(async (off = 0, reset = false) => {
    try {
      const { data } = await api.get(`/notifications?limit=${limit}&offset=${off}`);
      if (reset) {
        setNotifications(data.notifications || []);
      } else {
        setNotifications((prev) => [...prev, ...(data.notifications || [])]);
      }
      setTotal(data.total || 0);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications(0, true);
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // silently fail
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch {
      // silently fail
    }
  };

  const loadMore = () => {
    const newOffset = offset + limit;
    setOffset(newOffset);
    setLoadingMore(true);
    fetchNotifications(newOffset);
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="animate-fade-in">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Notifications' },
        ]}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: '700' }}>Notifications</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleMarkAllRead}
            id="mark-all-read-button"
          >
            ✓ Mark All Read
          </button>
        )}
      </div>

      {loading ? (
        <SkeletonLoader type="card" count={5} />
      ) : notifications.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔔</div>
          <div className="empty-state-title">No notifications</div>
          <div className="empty-state-text">
            You&apos;ll see notifications for consent requests, appointment updates, and more.
          </div>
        </div>
      ) : (
        <>
          {notifications.map((notif, i) => {
            const iconConf = NOTIF_ICONS[notif.type] || { icon: '📣', cls: 'notif-icon-system' };
            return (
              <div
                key={notif.id}
                className={`notif-page-item ${!notif.is_read ? 'unread' : ''}`}
                style={{
                  animationDelay: `${i * 0.03}s`,
                  opacity: 0,
                  animationFillMode: 'forwards',
                  animation: 'fadeIn 0.3s ease forwards',
                }}
                onClick={() => !notif.is_read && handleMarkRead(notif.id)}
              >
                <div className={`notif-item-icon ${iconConf.cls}`}>{iconConf.icon}</div>
                <div className="notif-item-body" style={{ flex: 1 }}>
                  <div
                    className="notif-item-title"
                    style={{
                      whiteSpace: 'normal',
                      overflow: 'visible',
                      color: notif.is_read ? 'var(--text-secondary)' : 'var(--color-primary-light)',
                    }}
                  >
                    {notif.title}
                  </div>
                  <div className="notif-item-message">{notif.message}</div>
                  <div className="notif-item-time">{timeAgo(notif.created_at)}</div>
                </div>
                {!notif.is_read && (
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: 'var(--color-primary)',
                      flexShrink: 0,
                      marginTop: '6px',
                    }}
                  />
                )}
              </div>
            );
          })}

          {notifications.length < total && (
            <button
              className="load-more-btn"
              onClick={loadMore}
              disabled={loadingMore}
            >
              {loadingMore ? 'Loading…' : 'Load More'}
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default Notifications;
