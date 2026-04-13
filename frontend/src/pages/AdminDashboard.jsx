import { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import Breadcrumbs from '../components/Breadcrumbs';
import SkeletonLoader from '../components/SkeletonLoader';

const TABS = [
  { id: 'pulse', label: 'Dashboard', icon: '📊' },
  { id: 'verify', label: 'Verification', icon: '✓' },
  { id: 'audit', label: 'Audit Monitor', icon: '🔍' },
  { id: 'controls', label: 'Controls', icon: '⚡' },
];

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('pulse');

  // ── Pulse state ───────────────────────────────────────
  const [tiles, setTiles] = useState(null);
  const [tilesLoading, setTilesLoading] = useState(true);
  const [tilesError, setTilesError] = useState('');

  // ── Verification queue state ──────────────────────────
  const [queue, setQueue] = useState([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  // ── Audit stream state ────────────────────────────────
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditEmergencyOnly, setAuditEmergencyOnly] = useState(false);
  const [expandedLog, setExpandedLog] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [noteLoading, setNoteLoading] = useState(false);

  // ── Controls state ────────────────────────────────────
  const [users, setUsers] = useState([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersSearch, setUsersSearch] = useState('');

  const [suspendDialog, setSuspendDialog] = useState(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendLoading, setSuspendLoading] = useState(false);

  const [editDialog, setEditDialog] = useState(null);
  const [editFields, setEditFields] = useState({ hospitalName: '', specialization: '', department: '' });
  const [editLoading, setEditLoading] = useState(false);

  const [licenseModal, setLicenseModal] = useState(null);
  const [licenseLoading, setLicenseLoading] = useState(false);

  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState('');

  // ── Feedback messages ─────────────────────────────────
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback({ type: '', message: '' }), 4000);
  };

  const formatDate = (d) => {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  // ── Data fetchers ─────────────────────────────────────
  const fetchTiles = useCallback(async () => {
    setTilesLoading(true);
    setTilesError('');
    try {
      const { data } = await api.get('/admin/dashboard');
      setTiles(data.tiles);
    } catch (err) {
      setTilesError(err.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setTilesLoading(false);
    }
  }, []);

  const fetchQueue = useCallback(async () => {
    setQueueLoading(true);
    try {
      const { data } = await api.get('/admin/verification-queue');
      setQueue(data.providers || []);
    } catch {
      showFeedback('error', 'Failed to load verification queue');
    } finally {
      setQueueLoading(false);
    }
  }, []);

  const fetchAuditStream = useCallback(async (page = 1) => {
    setAuditLoading(true);
    try {
      const params = { page, limit: 20 };
      if (auditSearch) params.search = auditSearch;
      if (auditEmergencyOnly) params.emergency = 'true';
      const { data } = await api.get('/admin/audit-stream', { params });
      setAuditLogs(data.logs || []);
      setAuditTotal(data.total);
      setAuditPage(data.page);
      setAuditTotalPages(data.totalPages);
    } catch {
      showFeedback('error', 'Failed to load audit stream');
    } finally {
      setAuditLoading(false);
    }
  }, [auditSearch, auditEmergencyOnly]);

  const fetchUsers = useCallback(async (page = 1) => {
    setUsersLoading(true);
    try {
      const params = { page, limit: 15 };
      if (usersSearch) params.search = usersSearch;
      const { data } = await api.get('/admin/users', { params });
      setUsers(data.users || []);
      setUsersTotal(data.total);
      setUsersPage(data.page);
      setUsersTotalPages(data.totalPages);
    } catch {
      showFeedback('error', 'Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  }, [usersSearch]);

  // ── Load data on tab switch ───────────────────────────
  useEffect(() => { fetchTiles(); }, [fetchTiles]);
  useEffect(() => { if (activeTab === 'verify') fetchQueue(); }, [activeTab, fetchQueue]);
  useEffect(() => { if (activeTab === 'audit') fetchAuditStream(1); }, [activeTab, fetchAuditStream]);
  useEffect(() => { if (activeTab === 'controls') fetchUsers(1); }, [activeTab, fetchUsers]);

  // ── Verification actions ──────────────────────────────
  const handleVerify = async (userId, action) => {
    setActionLoading(prev => ({ ...prev, [userId]: action }));
    try {
      await api.post(`/admin/verify/${userId}`, { action });
      showFeedback('success', `Provider ${action.toLowerCase()}d successfully`);
      fetchQueue();
      fetchTiles();
    } catch (err) {
      showFeedback('error', err.response?.data?.message || 'Verification failed');
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: null }));
    }
  };

  // ── Admin note ────────────────────────────────────────
  const handleAddNote = async (logId) => {
    if (!noteText.trim()) return;
    setNoteLoading(true);
    try {
      await api.post(`/admin/audit-logs/${logId}/note`, { note: noteText.trim() });
      setNoteText('');
      showFeedback('success', 'Note added');
      fetchAuditStream(auditPage);
    } catch (err) {
      showFeedback('error', err.response?.data?.message || 'Failed to add note');
    } finally {
      setNoteLoading(false);
    }
  };

  // ── Suspend / Unsuspend ───────────────────────────────
  const handleSuspend = async () => {
    if (!suspendReason.trim()) return;
    setSuspendLoading(true);
    try {
      await api.post(`/admin/users/${suspendDialog.id}/suspend`, { reason: suspendReason.trim() });
      showFeedback('success', 'User suspended');
      setSuspendDialog(null);
      setSuspendReason('');
      fetchUsers(usersPage);
      fetchTiles();
    } catch (err) {
      showFeedback('error', err.response?.data?.message || 'Suspension failed');
    } finally {
      setSuspendLoading(false);
    }
  };

  const handleUnsuspend = async (userId) => {
    try {
      await api.post(`/admin/users/${userId}/unsuspend`);
      showFeedback('success', 'User unsuspended');
      fetchUsers(usersPage);
      fetchTiles();
    } catch (err) {
      showFeedback('error', err.response?.data?.message || 'Unsuspension failed');
    }
  };

  // ── Credential edit ───────────────────────────────────
  const handleEditCredentials = async () => {
    setEditLoading(true);
    try {
      await api.patch(`/admin/users/${editDialog.id}/credentials`, editFields);
      showFeedback('success', 'Credentials updated');
      setEditDialog(null);
      fetchUsers(usersPage);
    } catch (err) {
      showFeedback('error', err.response?.data?.message || 'Edit failed');
    } finally {
      setEditLoading(false);
    }
  };

  // ── License view ──────────────────────────────────────
  const handleViewLicense = async (userId) => {
    setLicenseLoading(true);
    try {
      const { data } = await api.get(`/admin/users/${userId}/license`);
      setLicenseModal(data.license);
    } catch {
      showFeedback('error', 'Failed to load license info');
    } finally {
      setLicenseLoading(false);
    }
  };

  // ── Broadcast ─────────────────────────────────────────
  const handleBroadcast = async () => {
    if (!broadcastMsg.trim()) return;
    setBroadcastLoading(true);
    try {
      const { data } = await api.post('/admin/broadcast', { message: broadcastMsg.trim() });
      setBroadcastSuccess(`Sent to ${data.recipientCount} users`);
      setBroadcastMsg('');
      setTimeout(() => setBroadcastSuccess(''), 4000);
    } catch (err) {
      showFeedback('error', err.response?.data?.message || 'Broadcast failed');
    } finally {
      setBroadcastLoading(false);
    }
  };

  // ═════════════════════════════════════════════════════
  // ═  RENDER
  // ═════════════════════════════════════════════════════

  return (
    <div className="animate-fade-in">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Admin Command Center' },
        ]}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: '700' }}>Admin Command Center</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
            System governance, verification, and oversight
          </p>
        </div>
      </div>

      {/* Feedback */}
      {feedback.message && (
        <div className={`alert alert-${feedback.type}`} style={{ marginBottom: '16px' }}>
          {feedback.message}
        </div>
      )}

      {/* ── Tab Navigation ─── */}
      <div className="admin-tabs" id="admin-tab-nav">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`admin-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            id={`admin-tab-${tab.id}`}
          >
            <span>{tab.icon}</span>
            {tab.label}
            {tab.id === 'verify' && tiles?.pendingApprovals > 0 && (
              <span className="admin-tab-badge">{tiles.pendingApprovals}</span>
            )}
            {tab.id === 'pulse' && tiles?.emergencyEvents > 0 && (
              <span className="admin-tab-badge">{tiles.emergencyEvents}</span>
            )}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* ═  TAB 1: DASHBOARD (THE PULSE)               */}
      {/* ═══════════════════════════════════════════════ */}
      {activeTab === 'pulse' && (
        <>
          {tilesError && (
            <div className="alert alert-error" style={{ marginBottom: '16px' }}>{tilesError}</div>
          )}

          {tilesLoading ? (
            <SkeletonLoader type="card" count={4} />
          ) : tiles ? (
            <>
              <div className="admin-pulse-grid">
                <div className="admin-pulse-tile animate-slide-up" style={{ '--tile-accent': '#2563EB', animationDelay: '0s', opacity: 0, animationFillMode: 'forwards' }}>
                  <div className="admin-pulse-icon">👥</div>
                  <div className="admin-pulse-value" style={{ color: '#818cf8' }}>
                    {tiles.systemLoad.patients + tiles.systemLoad.providers}
                  </div>
                  <div className="admin-pulse-label">System Load</div>
                  <div className="admin-pulse-sub">
                    {tiles.systemLoad.patients} Patients · {tiles.systemLoad.providers} Providers
                  </div>
                </div>

                <div className="admin-pulse-tile animate-slide-up" style={{ '--tile-accent': '#f59e0b', animationDelay: '0.1s', opacity: 0, animationFillMode: 'forwards' }}>
                  <div className="admin-pulse-icon">⏳</div>
                  <div className="admin-pulse-value" style={{ color: '#f59e0b' }}>
                    {tiles.pendingApprovals}
                  </div>
                  <div className="admin-pulse-label">Pending Approvals</div>
                  <div className="admin-pulse-sub">Doctors awaiting license verification</div>
                </div>

                <div className="admin-pulse-tile animate-slide-up" style={{ '--tile-accent': '#ef4444', animationDelay: '0.2s', opacity: 0, animationFillMode: 'forwards' }}>
                  <div className="admin-pulse-icon">🚨</div>
                  <div className="admin-pulse-value" style={{ color: '#ef4444' }}>
                    {tiles.emergencyEvents}
                  </div>
                  <div className="admin-pulse-label">Emergency Events</div>
                  <div className="admin-pulse-sub">Consent bypasses in last 24 hours</div>
                </div>

                <div className="admin-pulse-tile animate-slide-up" style={{ '--tile-accent': '#64748b', animationDelay: '0.3s', opacity: 0, animationFillMode: 'forwards' }}>
                  <div className="admin-pulse-icon">🛡️</div>
                  <div className="admin-pulse-value" style={{ color: '#94a3b8' }}>
                    {tiles.securityFlags}
                  </div>
                  <div className="admin-pulse-label">Security Flags</div>
                  <div className="admin-pulse-sub">
                    {tiles.suspendedUsers} currently suspended
                  </div>
                </div>
              </div>

              {/* Quick-access buttons */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {tiles.pendingApprovals > 0 && (
                  <button className="btn-approve" onClick={() => setActiveTab('verify')} style={{ padding: '10px 24px' }}>
                    Review {tiles.pendingApprovals} Pending Provider{tiles.pendingApprovals > 1 ? 's' : ''}
                  </button>
                )}
                {tiles.emergencyEvents > 0 && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => { setAuditEmergencyOnly(true); setActiveTab('audit'); }}
                  >
                    🚨 View Emergency Logs
                  </button>
                )}
              </div>
            </>
          ) : null}
        </>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* ═  TAB 2: VERIFICATION QUEUE                  */}
      {/* ═══════════════════════════════════════════════ */}
      {activeTab === 'verify' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '600' }}>Provider Verification Queue</h2>
            <button className="btn btn-secondary btn-sm" onClick={fetchQueue} disabled={queueLoading}>
              {queueLoading ? <span className="spinner" /> : '↻ Refresh'}
            </button>
          </div>

          {queueLoading ? (
            <SkeletonLoader type="card" count={3} />
          ) : queue.length === 0 ? (
            <div className="empty-state" style={{ padding: '48px' }}>
              <div className="empty-state-icon" style={{ fontSize: '2.5rem' }}>✅</div>
              <div className="empty-state-title">All Caught Up</div>
              <div className="empty-state-text">No providers are pending verification.</div>
            </div>
          ) : (
            <div className="verification-list">
              {queue.map((provider, idx) => (
                <div
                  key={provider.id}
                  className="verification-card animate-slide-up"
                  style={{ animationDelay: `${idx * 0.05}s`, opacity: 0, animationFillMode: 'forwards' }}
                >
                  <div className="verification-avatar">
                    {provider.full_name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="verification-info">
                    <div className="verification-name">{provider.full_name || 'Unnamed Provider'}</div>
                    <div className="verification-meta">
                      <span className="verification-meta-item">🩺 {provider.specialization || 'N/A'}</span>
                      <span className="verification-meta-item">📋 {provider.license_number || 'No License #'}</span>
                      <span className="verification-meta-item">🏥 {provider.hospital_name || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="verification-actions">
                    {provider.license_image_url && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleViewLicense(provider.id)}
                        title="View License"
                      >
                        📄
                      </button>
                    )}
                    <button
                      className="btn-approve"
                      disabled={!!actionLoading[provider.id]}
                      onClick={() => handleVerify(provider.id, 'APPROVE')}
                    >
                      {actionLoading[provider.id] === 'APPROVE' ? <span className="spinner" /> : 'Approve'}
                    </button>
                    <button
                      className="btn-reject"
                      disabled={!!actionLoading[provider.id]}
                      onClick={() => handleVerify(provider.id, 'REJECT')}
                    >
                      {actionLoading[provider.id] === 'REJECT' ? <span className="spinner" /> : 'Reject'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* ═  TAB 3: AUDIT MONITOR                       */}
      {/* ═══════════════════════════════════════════════ */}
      {activeTab === 'audit' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '600' }}>
              Global Audit Stream
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '400', marginLeft: '10px' }}>
                {auditTotal} entries
              </span>
            </h2>
          </div>

          {/* Search bar */}
          <div className="audit-search-bar">
            <input
              className="input-field"
              placeholder="Search by email or action..."
              value={auditSearch}
              onChange={e => setAuditSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchAuditStream(1)}
              id="audit-search-input"
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={auditEmergencyOnly}
                onChange={e => setAuditEmergencyOnly(e.target.checked)}
              />
              Emergency Only
            </label>
            <button className="btn btn-secondary btn-sm" onClick={() => fetchAuditStream(1)} disabled={auditLoading}>
              {auditLoading ? <span className="spinner" /> : 'Search'}
            </button>
          </div>

          {auditLoading ? (
            <SkeletonLoader type="card" count={5} />
          ) : auditLogs.length === 0 ? (
            <div className="empty-state" style={{ padding: '48px' }}>
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-title">No Logs Found</div>
              <div className="empty-state-text">Try adjusting your search filters.</div>
            </div>
          ) : (
            <>
              <div className="audit-stream-list">
                {auditLogs.map(log => (
                  <div
                    key={log.id}
                    className={`audit-stream-row ${log.is_emergency ? 'emergency' : ''}`}
                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                  >
                    <div className="audit-row-header">
                      <div className="audit-row-action">
                        {log.action?.replace(/_/g, ' ')}
                        {log.is_emergency && <span className="emergency-badge">Emergency</span>}
                      </div>
                      <span className="audit-row-time">{formatDate(log.created_at)}</span>
                    </div>
                    <div className="audit-row-details">
                      <span>👤 {log.user_email || 'System'}</span>
                      {log.user_name && <span>— {log.user_name}</span>}
                      {log.hospital_name && <span>🏥 {log.hospital_name}</span>}
                      {log.access_reason && <span>📌 {log.access_reason}</span>}
                    </div>

                    {/* Expanded view */}
                    {expandedLog === log.id && (
                      <div className="audit-row-expand" onClick={e => e.stopPropagation()}>
                        {log.access_reason && (
                          <div className="audit-row-expand-section">
                            <div className="audit-row-expand-label">Access Reason</div>
                            <div className="audit-row-expand-value">{log.access_reason}</div>
                          </div>
                        )}
                        {log.details && Object.keys(log.details).length > 0 && (
                          <div className="audit-row-expand-section">
                            <div className="audit-row-expand-label">Details</div>
                            <div className="audit-row-expand-value">
                              <pre style={{ fontSize: '0.82rem', whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </div>
                          </div>
                        )}
                        <div className="audit-row-expand-section">
                          <div className="audit-row-expand-label">IP Address</div>
                          <div className="audit-row-expand-value">{log.ip_address || 'N/A'}</div>
                        </div>

                        {/* Admin Notes */}
                        <div className="audit-row-expand-section">
                          <div className="audit-row-expand-label">
                            Admin Notes ({log.admin_notes?.length || 0})
                          </div>
                          {log.admin_notes?.map(n => (
                            <div key={n.id} className="admin-note-item">
                              <div className="admin-note-text">{n.note}</div>
                              <div className="admin-note-meta">{n.admin_email} · {formatDate(n.created_at)}</div>
                            </div>
                          ))}
                          <div className="admin-note-form">
                            <input
                              className="input-field"
                              placeholder="Add admin note..."
                              value={noteText}
                              onChange={e => setNoteText(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleAddNote(log.id)}
                            />
                            <button
                              className="btn-approve"
                              style={{ padding: '8px 16px' }}
                              onClick={() => handleAddNote(log.id)}
                              disabled={noteLoading || !noteText.trim()}
                            >
                              {noteLoading ? <span className="spinner" /> : 'Add'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="pagination">
                <button
                  className="pagination-btn"
                  disabled={auditPage <= 1}
                  onClick={() => fetchAuditStream(auditPage - 1)}
                >
                  ← Prev
                </button>
                <span className="pagination-info">Page {auditPage} of {auditTotalPages}</span>
                <button
                  className="pagination-btn"
                  disabled={auditPage >= auditTotalPages}
                  onClick={() => fetchAuditStream(auditPage + 1)}
                >
                  Next →
                </button>
              </div>
            </>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* ═  TAB 4: CONTROLS (KILL SWITCHES)            */}
      {/* ═══════════════════════════════════════════════ */}
      {activeTab === 'controls' && (
        <>
          <div className="admin-control-grid" style={{ marginBottom: '28px' }}>
            {/* ── System Broadcast ─── */}
            <div className="admin-control-card">
              <div className="admin-control-header">
                <div className="admin-control-icon" style={{ background: 'rgba(17, 17, 17, 0.8)', color: 'white' }}>📢</div>
                <div>
                  <div className="admin-control-title">System Broadcast</div>
                  <div className="admin-control-desc">Send a banner notification to all users</div>
                </div>
              </div>
              <div className="broadcast-form">
                <input
                  className="input-field"
                  placeholder="Type broadcast message..."
                  value={broadcastMsg}
                  onChange={e => setBroadcastMsg(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleBroadcast()}
                  id="broadcast-input"
                />
                <button
                  className="btn-approve"
                  style={{ padding: '8px 20px' }}
                  onClick={handleBroadcast}
                  disabled={broadcastLoading || !broadcastMsg.trim()}
                >
                  {broadcastLoading ? <span className="spinner" /> : 'Send'}
                </button>
              </div>
              {broadcastMsg.trim() && (
                <div className="broadcast-preview">
                  Preview: {broadcastMsg.trim()}
                </div>
              )}
              {broadcastSuccess && (
                <div className="alert alert-success" style={{ marginTop: '10px' }}>{broadcastSuccess}</div>
              )}
            </div>

            {/* ── Quick Stats ─── */}
            <div className="admin-control-card">
              <div className="admin-control-header">
                <div className="admin-control-icon" style={{ background: 'rgba(37, 99, 235, 0.15)', color: '#3B82F6' }}>📊</div>
                <div>
                  <div className="admin-control-title">Quick Overview</div>
                  <div className="admin-control-desc">System status at a glance</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)' }}>{usersTotal}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Users</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#f59e0b' }}>{tiles?.pendingApprovals || 0}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pending</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#ef4444' }}>{tiles?.suspendedUsers || 0}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Suspended</div>
                </div>
              </div>
            </div>
          </div>

          {/* ── User Management Table ─── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '600' }}>User Management</h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                className="input-field"
                style={{ width: '240px' }}
                placeholder="Search users..."
                value={usersSearch}
                onChange={e => setUsersSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchUsers(1)}
                id="users-search-input"
              />
              <button className="btn btn-secondary btn-sm" onClick={() => fetchUsers(1)} disabled={usersLoading}>
                Search
              </button>
            </div>
          </div>

          {usersLoading ? (
            <SkeletonLoader type="card" count={5} />
          ) : users.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px' }}>
              <div className="empty-state-title">No users found</div>
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Hospital</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user.id}>
                        <td>
                          <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{user.full_name || 'N/A'}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{user.email}</div>
                        </td>
                        <td>
                          <span className={`badge badge-${user.role?.toLowerCase()}`}>
                            {user.role}
                          </span>
                        </td>
                        <td>
                          {user.is_suspended ? (
                            <span className="verification-badge suspended">Suspended</span>
                          ) : user.role === 'PROVIDER' ? (
                            <span className={`verification-badge ${user.verification_status?.toLowerCase() || 'pending'}`}>
                              {user.verification_status || 'PENDING'}
                            </span>
                          ) : (
                            <span className="verification-badge approved">Active</span>
                          )}
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>{user.hospital_name || '—'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {/* Suspend toggle */}
                            {user.role !== 'ADMIN' && (
                              user.is_suspended ? (
                                <button
                                  className="btn btn-sm"
                                  style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-success)', border: 'none', cursor: 'pointer' }}
                                  onClick={() => handleUnsuspend(user.id)}
                                  title="Unsuspend"
                                >
                                  ✓ Activate
                                </button>
                              ) : (
                                <button
                                  className="btn btn-sm"
                                  style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', border: 'none', cursor: 'pointer' }}
                                  onClick={() => setSuspendDialog(user)}
                                  title="Suspend"
                                >
                                  ⛔ Suspend
                                </button>
                              )
                            )}
                            {/* Credential edit */}
                            {user.role === 'PROVIDER' && (
                              <button
                                className="inline-edit-btn"
                                onClick={() => {
                                  setEditDialog(user);
                                  setEditFields({
                                    hospitalName: user.hospital_name || '',
                                    specialization: user.specialization || '',
                                    department: user.department || '',
                                  });
                                }}
                                title="Edit credentials"
                              >
                                ✏️
                              </button>
                            )}
                            {/* License view */}
                            {user.role === 'PROVIDER' && (
                              <button
                                className="inline-edit-btn"
                                onClick={() => handleViewLicense(user.id)}
                                title="View license"
                              >
                                📋
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pagination">
                <button className="pagination-btn" disabled={usersPage <= 1} onClick={() => fetchUsers(usersPage - 1)}>
                  ← Prev
                </button>
                <span className="pagination-info">Page {usersPage} of {usersTotalPages}</span>
                <button className="pagination-btn" disabled={usersPage >= usersTotalPages} onClick={() => fetchUsers(usersPage + 1)}>
                  Next →
                </button>
              </div>
            </>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* ═  MODALS                                     */}
      {/* ═══════════════════════════════════════════════ */}

      {/* Suspend Dialog */}
      {suspendDialog && (
        <div className="modal-overlay" onClick={() => setSuspendDialog(null)}>
          <div className="suspend-dialog" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '16px' }}>
              Suspend User
            </h3>
            <div className="suspend-warning">
              <span>⚠️</span>
              <span>
                This will immediately revoke all sessions for <strong>{suspendDialog.email}</strong> and
                prevent them from accessing the system.
              </span>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                Reason for Suspension
              </label>
              <textarea
                className="input-field"
                rows={3}
                placeholder="Describe the reason for suspending this user..."
                value={suspendReason}
                onChange={e => setSuspendReason(e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setSuspendDialog(null)}>Cancel</button>
              <button
                className="btn btn-danger btn-sm"
                onClick={handleSuspend}
                disabled={suspendLoading || !suspendReason.trim()}
              >
                {suspendLoading ? <span className="spinner" /> : 'Confirm Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credential Edit Dialog */}
      {editDialog && (
        <div className="modal-overlay" onClick={() => setEditDialog(null)}>
          <div className="credential-modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '20px' }}>
              Edit Credentials — {editDialog.full_name || editDialog.email}
            </h3>
            <div className="credential-field">
              <label>Hospital Name</label>
              <input
                className="input-field"
                value={editFields.hospitalName}
                onChange={e => setEditFields(f => ({ ...f, hospitalName: e.target.value }))}
              />
            </div>
            <div className="credential-field">
              <label>Specialization</label>
              <input
                className="input-field"
                value={editFields.specialization}
                onChange={e => setEditFields(f => ({ ...f, specialization: e.target.value }))}
              />
            </div>
            <div className="credential-field">
              <label>Department</label>
              <input
                className="input-field"
                value={editFields.department}
                onChange={e => setEditFields(f => ({ ...f, department: e.target.value }))}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setEditDialog(null)}>Cancel</button>
              <button
                className="btn-approve"
                style={{ padding: '10px 20px' }}
                onClick={handleEditCredentials}
                disabled={editLoading}
              >
                {editLoading ? <span className="spinner" /> : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* License Modal */}
      {licenseModal && (
        <div className="modal-overlay" onClick={() => setLicenseModal(null)}>
          <div className="license-modal" onClick={e => e.stopPropagation()}>
            <div className="license-modal-header">
              <span className="license-modal-title">License Audit</span>
              <button className="license-modal-close" onClick={() => setLicenseModal(null)}>✕</button>
            </div>
            <div className="license-detail-row">
              <span className="license-detail-label">Name</span>
              <span className="license-detail-value">{licenseModal.full_name || 'N/A'}</span>
            </div>
            <div className="license-detail-row">
              <span className="license-detail-label">Specialization</span>
              <span className="license-detail-value">{licenseModal.specialization || 'N/A'}</span>
            </div>
            <div className="license-detail-row">
              <span className="license-detail-label">Hospital</span>
              <span className="license-detail-value">{licenseModal.hospital_name || 'N/A'}</span>
            </div>
            <div className="license-detail-row">
              <span className="license-detail-label">License #</span>
              <span className="license-detail-value">{licenseModal.license_number || 'N/A'}</span>
            </div>
            <div className="license-image-container">
              {licenseModal.license_image_url ? (
                <img src={licenseModal.license_image_url} alt="License Document" />
              ) : (
                <div className="license-no-image">
                  📄 No license document uploaded
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
