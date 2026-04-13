import { useEffect, useState } from 'react';
import api from '../api/axios';
import SkeletonLoader from '../components/SkeletonLoader';

const AuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    fetchLogs(1, true);
  }, []);

  const fetchLogs = async (pageNum, replace = false) => {
    try {
      const { data } = await api.get(`/audit/me?page=${pageNum}&limit=20`);
      if (replace) {
        setLogs(data.logs || []);
      } else {
        setLogs((prev) => [...prev, ...(data.logs || [])]);
      }
      setPage(data.page);
      setTotalPages(data.totalPages);
    } catch {
      // Silently handle — empty state will show
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (page >= totalPages) return;
    setLoadingMore(true);
    fetchLogs(page + 1);
  };

  // ── Helpers ────────────────────────────────────────
  const relativeTime = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getActionInfo = (action) => {
    const actionMap = {
      RECORD_VIEW: { icon: '👁️', label: 'Viewed Record', dotClass: 'timeline-dot-blue' },
      RECORD_CREATE: { icon: '📄', label: 'Created Record', dotClass: 'timeline-dot-blue' },
      RECORD_DELETE: { icon: '🗑️', label: 'Deleted Record', dotClass: 'timeline-dot-red' },
      CONSENT_GRANT: { icon: '🔓', label: 'Granted Access', dotClass: 'timeline-dot-blue' },
      CONSENT_REVOKE: { icon: '🔒', label: 'Revoked Access', dotClass: 'timeline-dot-red' },
      LOGIN: { icon: '🔑', label: 'Logged In', dotClass: 'timeline-dot-gray' },
      PROFILE_UPDATE: { icon: '✏️', label: 'Updated Profile', dotClass: 'timeline-dot-gray' },
      RECORD_DOWNLOAD: { icon: '📥', label: 'Downloaded Record', dotClass: 'timeline-dot-blue' },
      EMERGENCY_ACCESS: { icon: '🚨', label: 'Emergency Access', dotClass: 'timeline-dot-red' },
    };
    return actionMap[action] || { icon: '📋', label: action, dotClass: 'timeline-dot-gray' };
  };

  if (loading) {
    return (
      <div className="animate-fade-in" style={{ padding: '20px' }}>
        <SkeletonLoader type="timeline" count={6} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: '700' }}>Activity Log</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
          See who accessed your data and when
        </p>
      </div>

      {/* Summary Banner */}
      <div
        className="glass-card"
        style={{
          padding: '24px',
          marginBottom: '28px',
          background: `
            linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(6, 182, 212, 0.06)),
            var(--glass-bg)
          `,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '2rem' }}>📊</span>
          <div>
            <p style={{ fontWeight: '600', fontSize: '0.95rem', marginBottom: '2px' }}>
              Transparency Feed
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              A complete, immutable log of every action on your health data
            </p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      {logs.length === 0 ? (
        <div className="glass-card">
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <div className="empty-state-title">No activity yet</div>
            <div className="empty-state-text">
              Your data access history will appear here as providers interact with your records.
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="timeline">
            {logs.map((log, i) => {
              const info = getActionInfo(log.action);
              return (
                <div
                  key={log.id || i}
                  className="timeline-item animate-slide-up"
                  style={{ animationDelay: `${Math.min(i, 10) * 0.05}s`, opacity: 0, animationFillMode: 'forwards' }}
                >
                  <div className={`timeline-dot ${info.dotClass}`} />
                  <div className="timeline-card">
                    <div className="timeline-action">
                      {info.icon} {info.label}
                    </div>
                    <div className="timeline-details">
                      {(log.accessor_name || log.accessor_email) && (
                        <span>
                          👤 {log.accessor_name || log.accessor_email}
                          {log.accessor_hospital && (
                            <span style={{ color: 'var(--text-muted)' }}> ({log.accessor_hospital})</span>
                          )}
                        </span>
                      )}
                      {log.access_reason && (
                        <span>📋 {log.access_reason.replace(/_/g, ' ')}</span>
                      )}
                      <span>🕐 {relativeTime(log.created_at)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Load More */}
          {page < totalPages && (
            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <button
                onClick={loadMore}
                className="btn btn-secondary btn-sm"
                disabled={loadingMore}
                id="load-more-logs"
              >
                {loadingMore ? <span className="spinner" /> : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AuditLog;
