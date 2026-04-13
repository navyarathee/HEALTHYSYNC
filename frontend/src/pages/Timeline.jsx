import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Breadcrumbs from '../components/Breadcrumbs';
import SkeletonLoader from '../components/SkeletonLoader';

const EVENT_ICONS = {
  RECORD: '➕',
  APPOINTMENT: '🕐',
  COLLAB_NOTE: '📝',
  AUDIT: '🔍',
};

const DOT_CLASS = {
  RECORD: 'ht-dot-record',
  APPOINTMENT: 'ht-dot-appointment',
  COLLAB_NOTE: 'ht-dot-note',
  AUDIT: 'ht-dot-audit',
};

const FILTER_CHIPS = [
  { key: 'ALL', label: 'All', icon: '📋' },
  { key: 'RECORD', label: 'Records', icon: '➕' },
  { key: 'APPOINTMENT', label: 'Appointments', icon: '🕐' },
  { key: 'COLLAB_NOTE', label: 'Notes', icon: '📝' },
  { key: 'AUDIT', label: 'Audit', icon: '🔍' },
];

const Timeline = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 20;

  // Phase 5: filter + search state
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Provider: patient selector
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');

  const isPatient = user?.role === 'PATIENT';

  // Load patients list for providers
  useEffect(() => {
    if (!isPatient) {
      api
        .get('/users/patients')
        .then(({ data }) => setPatients(data.patients || []))
        .catch(() => setPatients([]));
    }
  }, [isPatient]);

  // Fetch timeline
  useEffect(() => {
    const patientId = isPatient ? user?.id : selectedPatientId;
    if (!patientId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setOffset(0);
    fetchTimeline(patientId, 0, true);
  }, [user, selectedPatientId]);

  const fetchTimeline = async (patientId, off, reset = false) => {
    try {
      const { data } = await api.get(
        `/patients/${patientId}/timeline?limit=${limit}&offset=${off}`
      );
      if (reset) {
        setEvents(data.timeline || []);
      } else {
        setEvents((prev) => [...prev, ...(data.timeline || [])]);
      }
      setTotal(data.total || 0);
      setError('');
    } catch {
      setError('Failed to load timeline');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    const patientId = isPatient ? user?.id : selectedPatientId;
    if (!patientId) return;
    const newOffset = offset + limit;
    setOffset(newOffset);
    setLoadingMore(true);
    fetchTimeline(patientId, newOffset);
  };

  // Phase 5: Filtered + searched events
  const filteredEvents = useMemo(() => {
    let result = events;

    // Type filter
    if (activeFilter !== 'ALL') {
      result = result.filter((evt) => evt.type === activeFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (evt) =>
          evt.summary?.toLowerCase().includes(q) ||
          evt.details?.category?.toLowerCase().includes(q) ||
          evt.details?.status?.toLowerCase().includes(q) ||
          evt.details?.content?.toLowerCase().includes(q) ||
          evt.details?.action?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [events, activeFilter, searchQuery]);

  // Phase 5: Type counts for chips
  const typeCounts = useMemo(() => {
    const counts = { ALL: events.length };
    for (const evt of events) {
      counts[evt.type] = (counts[evt.type] || 0) + 1;
    }
    return counts;
  }, [events]);

  // Phase 5: Group events by date
  const groupedEvents = useMemo(() => {
    const groups = [];
    let currentDate = null;
    let currentGroup = null;

    for (const evt of filteredEvents) {
      const dateKey = new Date(evt.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

      if (dateKey !== currentDate) {
        currentDate = dateKey;
        currentGroup = { date: dateKey, events: [] };
        groups.push(currentGroup);
      }
      currentGroup.events.push(evt);
    }

    return groups;
  }, [filteredEvents]);

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const formatTime = (dateStr) =>
    new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="animate-fade-in">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Timeline' },
        ]}
      />

      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: '700' }}>Health Timeline</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
          Aggregated view of clinical events and activity
        </p>
      </div>

      {/* Provider: patient picker */}
      {!isPatient && (
        <div className="patient-selector">
          <label htmlFor="timeline-patient-select">Select Patient:</label>
          <select
            id="timeline-patient-select"
            className="select-field"
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            style={{ maxWidth: '300px' }}
          >
            <option value="">Choose a patient…</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.email}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Phase 5: Search bar */}
      {events.length > 0 && (
        <div className="search-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Search timeline events…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            id="timeline-search-input"
          />
        </div>
      )}

      {/* Phase 5: Filter chips */}
      {events.length > 0 && (
        <div className="filter-chip-bar">
          {FILTER_CHIPS.map((chip) => (
            <button
              key={chip.key}
              className={`filter-chip ${activeFilter === chip.key ? 'active' : ''}`}
              onClick={() => setActiveFilter(chip.key)}
              id={`filter-chip-${chip.key.toLowerCase()}`}
            >
              <span className="filter-chip-icon">{chip.icon}</span>
              {chip.label}
              {typeCounts[chip.key] != null && (
                <span className="filter-chip-count">{typeCounts[chip.key]}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {loading ? (
        <SkeletonLoader type="timeline" count={5} />
      ) : !isPatient && !selectedPatientId ? (
        <div className="empty-state">
          <div className="empty-state-icon">📈</div>
          <div className="empty-state-title">Select a patient</div>
          <div className="empty-state-text">
            Choose a patient above to view their health timeline.
          </div>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            {searchQuery || activeFilter !== 'ALL' ? '🔎' : '📈'}
          </div>
          <div className="empty-state-title">
            {searchQuery || activeFilter !== 'ALL' ? 'No matching events' : 'No events yet'}
          </div>
          <div className="empty-state-text">
            {searchQuery || activeFilter !== 'ALL'
              ? 'Try adjusting your filters or search query.'
              : 'Clinical events will appear here as they are recorded.'}
          </div>
        </div>
      ) : (
        <>
          <div className="health-timeline">
            {groupedEvents.map((group) => (
              <div key={group.date}>
                {/* Phase 5: Date group header */}
                <div className="timeline-date-group">
                  <span className="timeline-date-label">{group.date}</span>
                  <div className="timeline-date-line" />
                </div>

                {group.events.map((evt, i) => (
                  <div
                    className="ht-node"
                    key={`${group.date}-${i}`}
                    style={{
                      animationDelay: `${i * 0.05}s`,
                      opacity: 0,
                      animationFillMode: 'forwards',
                    }}
                  >
                    <span className="ht-icon">{EVENT_ICONS[evt.type] || '•'}</span>
                    <div className={`ht-dot ${DOT_CLASS[evt.type] || ''}`} />
                    <div className="ht-card">
                      <div className="ht-date">
                        {formatDate(evt.date)} · {formatTime(evt.date)}
                      </div>
                      <div className="ht-title">{evt.summary}</div>
                      {evt.details && (
                        <div className="ht-sub">
                          {evt.type === 'RECORD' && evt.details.category && (
                            <span>Category: {evt.details.category}</span>
                          )}
                          {evt.type === 'APPOINTMENT' && evt.details.status && (
                            <span>Status: {evt.details.status}</span>
                          )}
                          {evt.type === 'COLLAB_NOTE' && evt.details.content && (
                            <span>
                              {evt.details.content.length > 120
                                ? evt.details.content.slice(0, 120) + '…'
                                : evt.details.content}
                            </span>
                          )}
                          {evt.type === 'AUDIT' && evt.details.action && (
                            <span>Action: {evt.details.action}</span>
                          )}
                        </div>
                      )}
                      {(evt.type === 'RECORD' || evt.type === 'APPOINTMENT') && (
                        <a
                          href={evt.type === 'RECORD' ? '/records' : '/appointments'}
                          className="ht-view-link"
                        >
                          View →
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {events.length < total && (
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

export default Timeline;
