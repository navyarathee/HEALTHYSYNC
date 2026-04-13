import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';

const NOTIF_ICONS = {
  CONSENT_REQUEST: { icon: '🛡️', cls: 'notif-icon-consent' },
  APPOINTMENT_REMINDER: { icon: '📅', cls: 'notif-icon-appointment' },
  APPOINTMENT_UPDATE: { icon: '🕐', cls: 'notif-icon-appointment' },
  SYSTEM_ALERT: { icon: '⚠️', cls: 'notif-icon-system' },
  RECORD_SHARED: { icon: '📁', cls: 'notif-icon-record' },
};

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [recentNotifs, setRecentNotifs] = useState([]);
  const dropdownRef = useRef(null);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getInitials = () => {
    if (!user?.email) return '?';
    return user.email.charAt(0).toUpperCase();
  };

  // Poll unread count every 30s
  const fetchUnreadCount = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications/unread-count');
      setUnreadCount(data.unread || 0);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Fetch recent when dropdown opens
  useEffect(() => {
    if (dropdownOpen) {
      (async () => {
        try {
          const { data } = await api.get('/notifications?limit=5&offset=0');
          setRecentNotifs(data.notifications || []);
        } catch {
          // silently fail
        }
      })();
    }
  }, [dropdownOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setRecentNotifs((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // silently fail
    }
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <header
      style={{
        height: '64px',
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
      }}
    >
      {/* Left: Page context */}
      <div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Welcome back
        </p>
        <p style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-primary)' }}>
          {user?.email}
        </p>
      </div>

      {/* Right: Notification bell + User avatar + logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Notification Bell */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            className="notif-bell"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            id="notification-bell"
            aria-label="Notifications"
          >
            🔔
            {unreadCount > 0 && (
              <span className="notif-badge">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <div className="notif-dropdown">
              <div className="notif-dropdown-header">
                <h4>Notifications</h4>
                {unreadCount > 0 && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--color-primary-light)',
                      fontWeight: '500',
                    }}
                  >
                    {unreadCount} unread
                  </span>
                )}
              </div>

              <div className="notif-dropdown-list">
                {recentNotifs.length === 0 ? (
                  <div
                    style={{
                      padding: '32px 18px',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      fontSize: '0.85rem',
                    }}
                  >
                    No notifications yet
                  </div>
                ) : (
                  recentNotifs.map((notif) => {
                    const iconConf = NOTIF_ICONS[notif.type] || {
                      icon: '📣',
                      cls: 'notif-icon-system',
                    };
                    return (
                      <div
                        key={notif.id}
                        className={`notif-item ${!notif.is_read ? 'unread' : ''}`}
                        onClick={() => !notif.is_read && handleMarkRead(notif.id)}
                      >
                        <div className={`notif-item-icon ${iconConf.cls}`}>
                          {iconConf.icon}
                        </div>
                        <div className="notif-item-body">
                          <div className="notif-item-title">{notif.title}</div>
                          <div className="notif-item-message">{notif.message}</div>
                          <div className="notif-item-time">{timeAgo(notif.created_at)}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="notif-dropdown-footer">
                <Link
                  to="/notifications"
                  onClick={() => setDropdownOpen(false)}
                >
                  View All Notifications
                </Link>
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.85rem',
            fontWeight: '700',
            color: 'white',
          }}
        >
          {getInitials()}
        </div>
        <button
          onClick={handleLogout}
          className="btn btn-secondary btn-sm"
          id="logout-button"
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export default Header;
