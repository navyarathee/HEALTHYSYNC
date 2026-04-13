import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../api/axios';
import Breadcrumbs from '../components/Breadcrumbs';

const CollaborationNotes = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const isProvider = user?.role === 'PROVIDER';
  const isPatient = user?.role === 'PATIENT';

  // Patient selector state (for providers)
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');

  // Notes state
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  // Compose state
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState('INTERNAL');
  const [submitting, setSubmitting] = useState(false);

  // ── Init ──────────────────────────────────────────
  useEffect(() => {
    if (isProvider) {
      fetchPatients();
    } else if (isPatient) {
      // Patient auto-loads own notes
      fetchNotes(user.id, 1, true);
    } else {
      setLoading(false);
    }
  }, []);

  // Refetch when provider selects a patient
  useEffect(() => {
    if (isProvider && selectedPatientId) {
      fetchNotes(selectedPatientId, 1, true);
    }
  }, [selectedPatientId]);

  const fetchPatients = async () => {
    try {
      // Try consent-list first (gives patients who consented to this provider),
      // fall back to a generic users list
      const { data } = await api.get('/users/patients');
      setPatients(data.patients || []);
    } catch {
      showToast('Failed to load patients', 'error');
    } finally {
      if (!selectedPatientId) setLoading(false);
    }
  };

  const fetchNotes = async (patientId, pageNum, replace = false) => {
    try {
      const { data } = await api.get(`/collab/notes/${patientId}?page=${pageNum}&limit=20`);
      if (replace) {
        setNotes(data.notes || []);
      } else {
        setNotes((prev) => [...prev, ...(data.notes || [])]);
      }
      setPage(data.page);
      setTotalPages(data.totalPages);
    } catch {
      showToast('Failed to load notes', 'error');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    const pid = isPatient ? user.id : selectedPatientId;
    if (!pid || page >= totalPages) return;
    setLoadingMore(true);
    fetchNotes(pid, page + 1);
  };

  // ── Submit Note ───────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() || !selectedPatientId) return;

    setSubmitting(true);
    try {
      await api.post('/collab/notes', {
        patientId: selectedPatientId,
        content: content.trim(),
        visibility,
      });
      showToast('Note added successfully', 'success');
      setContent('');
      // Refresh from page 1
      fetchNotes(selectedPatientId, 1, true);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to add note', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Helpers ───────────────────────────────────────
  const relativeTime = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.charAt(0).toUpperCase();
  };

  // ── Render ────────────────────────────────────────
  return (
    <div className="animate-fade-in">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: isPatient ? 'Care Notes' : 'Case Discussion' },
        ]}
      />

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: '700' }}>
          {isPatient ? '💬 Care Notes' : '🩺 Case Discussion'}
        </h1>
        <p
          style={{
            color: 'var(--text-muted)',
            fontSize: '0.85rem',
            marginTop: '4px',
          }}
        >
          {isPatient
            ? 'Notes shared with you by your care team'
            : 'Collaborate with other providers on patient cases'}
        </p>
      </div>

      {/* Patient Selector — providers only */}
      {isProvider && (
        <div className="patient-selector">
          <label htmlFor="patient-select">👤 Patient:</label>
          <select
            id="patient-select"
            className="select-field"
            style={{ maxWidth: '320px' }}
            value={selectedPatientId}
            onChange={(e) => {
              setSelectedPatientId(e.target.value);
              setNotes([]);
              setLoading(true);
            }}
          >
            <option value="" disabled>
              Select a patient...
            </option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name || p.email}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Compose Note — providers only, when patient selected */}
      {isProvider && selectedPatientId && (
        <form className="note-form animate-fade-in" onSubmit={handleSubmit}>
          <div className="note-form-header">
            <span style={{ fontSize: '1.2rem' }}>✍️</span>
            <h3>Add Clinical Note</h3>
          </div>

          <textarea
            className="textarea-field"
            placeholder="Write your clinical observation or note here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          />

          <div className="note-form-actions">
            <div className="toggle-wrapper" onClick={() =>
              setVisibility(visibility === 'INTERNAL' ? 'SHARED_WITH_PATIENT' : 'INTERNAL')
            }>
              <div className={`toggle-track ${visibility === 'SHARED_WITH_PATIENT' ? 'active' : ''}`}
                style={visibility === 'SHARED_WITH_PATIENT' ? {
                  background: 'rgba(6, 182, 212, 0.3)',
                  borderColor: 'var(--color-accent)',
                } : {}}
              >
                <div className="toggle-thumb"
                  style={visibility === 'SHARED_WITH_PATIENT' ? {
                    background: 'var(--color-accent)',
                  } : {}}
                />
              </div>
              <span className="toggle-label" style={{ fontSize: '0.82rem' }}>
                {visibility === 'SHARED_WITH_PATIENT'
                  ? '👁️ Visible to patient'
                  : '🔒 Internal only'}
              </span>
            </div>

            <button
              type="submit"
              className="btn btn-navy btn-sm"
              disabled={submitting || !content.trim()}
              id="submit-collab-note"
            >
              {submitting ? <span className="spinner" /> : '📝 Post Note'}
            </button>
          </div>
        </form>
      )}

      {/* Loading / Empty / Notes List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '60px' }}>
          <div className="spinner" />
        </div>
      ) : isProvider && !selectedPatientId ? (
        <div className="glass-card">
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <div className="empty-state-title">Select a patient</div>
            <div className="empty-state-text">
              Choose a patient from the dropdown above to view or contribute to their case discussion.
            </div>
          </div>
        </div>
      ) : notes.length === 0 ? (
        <div className="glass-card">
          <div className="empty-state">
            <div className="empty-state-icon">💬</div>
            <div className="empty-state-title">No notes yet</div>
            <div className="empty-state-text">
              {isPatient
                ? 'Notes from your care team will appear here once shared.'
                : 'Start the case discussion by adding the first note above.'}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {notes.map((note, i) => (
              <div
                key={note.id || i}
                className="collab-note-card animate-slide-up"
                style={{
                  animationDelay: `${Math.min(i, 10) * 0.04}s`,
                  opacity: 0,
                  animationFillMode: 'forwards',
                }}
              >
                <div className="collab-note-card-header">
                  <div className="collab-note-author">
                    <div className="collab-note-avatar">
                      {getInitials(note.author_name)}
                    </div>
                    <div>
                      <div className="collab-note-author-name">
                        {note.author_name || 'Provider'}
                      </div>
                      <div className="collab-note-time">
                        {relativeTime(note.created_at)}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {note.is_telehealth_note && (
                      <span className="visibility-badge visibility-telehealth">
                        📹 Telehealth
                      </span>
                    )}
                    <span
                      className={`visibility-badge ${
                        note.visibility === 'SHARED_WITH_PATIENT'
                          ? 'visibility-shared'
                          : 'visibility-internal'
                      }`}
                    >
                      {note.visibility === 'SHARED_WITH_PATIENT'
                        ? '👁️ Shared'
                        : '🔒 Internal'}
                    </span>
                  </div>
                </div>

                <div className="collab-note-content">{note.content}</div>
              </div>
            ))}
          </div>

          {/* Load More */}
          {page < totalPages && (
            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <button
                onClick={loadMore}
                className="btn btn-secondary btn-sm"
                disabled={loadingMore}
                id="load-more-notes"
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

export default CollaborationNotes;
