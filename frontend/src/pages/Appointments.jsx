import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../api/axios';
import Breadcrumbs from '../components/Breadcrumbs';
import BookingModal from '../components/BookingModal';
import SkeletonLoader from '../components/SkeletonLoader';
import TeleconsultNotesModal from '../components/TeleconsultNotesModal';

const Appointments = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBooking, setShowBooking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Teleconsult state
  const [teleconsultNotesApptId, setTeleconsultNotesApptId] = useState(null);
  const [joiningSession, setJoiningSession] = useState(null);

  // Calendar state
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const { data } = await api.get('/appointments/me');
      setAppointments(data.appointments || []);
    } catch {
      setError('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  // ── Calendar helpers ──────────────────────────────────
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

  // Map appointment dates to a Set for O(1) lookup
  const appointmentDates = useMemo(() => {
    const set = new Set();
    appointments.forEach((a) => {
      const d = new Date(a.date_time);
      set.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    });
    return set;
  }, [appointments]);

  const calendarDays = useMemo(() => {
    const days = [];
    // Previous month filler
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      days.push({ day: prevMonthDays - i, otherMonth: true });
    }
    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${viewYear}-${viewMonth}-${d}`;
      days.push({
        day: d,
        otherMonth: false,
        isToday:
          d === today.getDate() &&
          viewMonth === today.getMonth() &&
          viewYear === today.getFullYear(),
        hasAppointment: appointmentDates.has(key),
      });
    }
    // Next month filler
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      days.push({ day: d, otherMonth: true });
    }
    return days;
  }, [viewYear, viewMonth, appointmentDates, daysInMonth, firstDayOfWeek, prevMonthDays]);

  const goMonth = (dir) => {
    let m = viewMonth + dir;
    let y = viewYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setViewMonth(m);
    setViewYear(y);
    setSelectedDate(null);
  };

  // ── Filter appointments by selected date ──────────────
  const filteredAppointments = useMemo(() => {
    if (selectedDate === null) return appointments;
    return appointments.filter((a) => {
      const d = new Date(a.date_time);
      return (
        d.getFullYear() === viewYear &&
        d.getMonth() === viewMonth &&
        d.getDate() === selectedDate
      );
    });
  }, [appointments, selectedDate, viewYear, viewMonth]);

  // ── Status actions ────────────────────────────────────
  const updateStatus = async (id, status, extra = {}) => {
    try {
      setError('');
      await api.patch(`/appointments/${id}`, { status, ...extra });
      setSuccess(`Appointment ${status.toLowerCase()} successfully`);
      fetchAppointments();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    }
  };

  const handleCancel = async (id) => {
    const reason = prompt('Cancellation reason:');
    if (!reason) return;
    updateStatus(id, 'CANCELLED', { cancellationReason: reason });
  };

  // ── Join Teleconsult ──────────────────────────────────
  const handleJoinSession = async (apptId) => {
    setJoiningSession(apptId);
    try {
      const { data } = await api.get(`/teleconsult/join/${apptId}`);
      if (data.teleconsultLink) {
        window.open(data.teleconsultLink, '_blank', 'noopener,noreferrer');
        showToast('Teleconsult session opened', 'success');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Cannot join session', 'error');
    } finally {
      setJoiningSession(null);
    }
  };

  // ── Format helpers ────────────────────────────────────
  const formatTime = (dateStr) =>
    new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  const badgeClass = (status) => {
    const map = {
      CONFIRMED: 'appt-badge-confirmed',
      PENDING: 'appt-badge-pending',
      COMPLETED: 'appt-badge-completed',
      CANCELLED: 'appt-badge-cancelled',
    };
    return `appt-badge ${map[status] || 'appt-badge-pending'}`;
  };

  // ── Render ────────────────────────────────────────────
  return (
    <div className="animate-fade-in">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Appointments' },
        ]}
      />

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: '700' }}>Appointments</h1>
          <p
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
              marginTop: '4px',
            }}
          >
            {appointments.length} appointment{appointments.length !== 1 && 's'}
          </p>
        </div>
        {user?.role === 'PATIENT' && (
          <button
            onClick={() => setShowBooking(true)}
            className="btn btn-navy btn-sm"
            id="book-appointment-button"
          >
            ➕ Book Appointment
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '16px' }}>
          {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success" style={{ marginBottom: '16px' }}>
          {success}
        </div>
      )}

      {loading ? (
        <SkeletonLoader type="card" count={4} />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '24px',
            alignItems: 'start',
          }}
        >
          {/* ── Calendar ────────────────────────── */}
          <div className="calendar-container">
            <div className="calendar-header">
              <button className="calendar-nav-btn" onClick={() => goMonth(-1)}>
                ‹
              </button>
              <h3>
                {monthNames[viewMonth]} {viewYear}
              </h3>
              <button className="calendar-nav-btn" onClick={() => goMonth(1)}>
                ›
              </button>
            </div>

            <div className="calendar-weekdays">
              {weekdays.map((w) => (
                <div key={w} className="calendar-weekday">
                  {w}
                </div>
              ))}
            </div>

            <div className="calendar-days">
              {calendarDays.map((cell, i) => {
                const classes = ['calendar-day'];
                if (cell.otherMonth) classes.push('other-month');
                if (cell.isToday) classes.push('today');
                if (
                  !cell.otherMonth &&
                  selectedDate === cell.day
                )
                  classes.push('selected');
                if (cell.hasAppointment && !cell.otherMonth)
                  classes.push('has-appointment');

                return (
                  <div
                    key={i}
                    className={classes.join(' ')}
                    onClick={() => {
                      if (!cell.otherMonth) {
                        setSelectedDate(
                          selectedDate === cell.day ? null : cell.day
                        );
                      }
                    }}
                  >
                    {cell.day}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Appointments List ───────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {selectedDate && (
              <p
                style={{
                  fontSize: '0.85rem',
                  color: 'var(--text-muted)',
                  marginBottom: '4px',
                }}
              >
                Showing appointments for{' '}
                <strong style={{ color: 'var(--text-primary)' }}>
                  {monthNames[viewMonth]} {selectedDate}, {viewYear}
                </strong>
                {' · '}
                <button
                  onClick={() => setSelectedDate(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-navy-light)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    textDecoration: 'underline',
                  }}
                >
                  Show all
                </button>
              </p>
            )}

            {filteredAppointments.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📅</div>
                <div className="empty-state-title">
                  {selectedDate ? 'No appointments on this date' : 'No appointments yet'}
                </div>
                <div className="empty-state-text">
                  {user?.role === 'PATIENT'
                    ? 'Book your first appointment to get started.'
                    : 'Appointments assigned to you will show here.'}
                </div>
              </div>
            ) : (
              filteredAppointments.map((appt) => (
                <div className="appointment-card" key={appt.id}>
                  <div className="appointment-card-time">
                    <span>{formatTime(appt.date_time)}</span>
                  </div>
                  <div className="appointment-card-body">
                    <div className="appointment-card-title">
                      {appt.type?.replace('_', ' ')} · {appt.provider_name || appt.patient_name || 'N/A'}
                    </div>
                    <div className="appointment-card-meta">
                      {formatDate(appt.date_time)}
                      {appt.notes && ` · ${appt.notes}`}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span className={badgeClass(appt.status)}>
                        {appt.status}
                      </span>

                      {/* Actions */}
                      <div className="appointment-card-actions">
                        {user?.role === 'PROVIDER' && appt.status === 'PENDING' && (
                          <button
                            className="btn btn-navy btn-sm"
                            onClick={() => updateStatus(appt.id, 'CONFIRMED')}
                          >
                            ✓ Confirm
                          </button>
                        )}
                        {user?.role === 'PROVIDER' && appt.status === 'CONFIRMED' && (
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => updateStatus(appt.id, 'COMPLETED')}
                          >
                            ✓ Complete
                          </button>
                        )}
                        {appt.status !== 'CANCELLED' && appt.status !== 'COMPLETED' && (
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleCancel(appt.id)}
                          >
                            ✗ Cancel
                          </button>
                        )}
                        {appt.teleconsult_link && appt.status === 'CONFIRMED' && (
                          <button
                            onClick={() => handleJoinSession(appt.id)}
                            className="btn btn-navy btn-sm"
                            disabled={joiningSession === appt.id}
                          >
                            {joiningSession === appt.id ? <span className="spinner" /> : '📹 Join'}
                          </button>
                        )}
                        {user?.role === 'PROVIDER' && (appt.status === 'CONFIRMED' || appt.status === 'COMPLETED') && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setTeleconsultNotesApptId(appt.id)}
                          >
                            📝 Notes
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {showBooking && (
        <BookingModal
          onClose={() => setShowBooking(false)}
          onBooked={() => {
            fetchAppointments();
            setSuccess('Appointment booked successfully!');
            setTimeout(() => setSuccess(''), 3000);
          }}
        />
      )}

      {/* Telehealth Notes Modal */}
      {teleconsultNotesApptId && (
        <TeleconsultNotesModal
          appointmentId={teleconsultNotesApptId}
          onClose={() => setTeleconsultNotesApptId(null)}
          onSaved={() => fetchAppointments()}
        />
      )}
    </div>
  );
};

export default Appointments;
