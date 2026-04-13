import { useState, useEffect } from 'react';
import api from '../api/axios';

const BookingModal = ({ onClose, onBooked }) => {
  const [providers, setProviders] = useState([]);
  const [providerId, setProviderId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [type, setType] = useState('CONSULTATION');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/users/providers')
      .then(({ data }) => setProviders(data.providers || []))
      .catch(() => setProviders([]));
  }, []);



  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const dateTime = `${date}T${time}:00`;
      await api.post('/appointments', {
        providerId,
        dateTime,
        type,
        notes: notes || undefined,
      });
      onBooked?.();
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to book appointment'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '480px' }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}
        >
          <h2 style={{ fontSize: '1.1rem', fontWeight: '600' }}>
            📅 Book Appointment
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '1.2rem',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Provider */}
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="booking-provider" style={labelStyle}>
              Provider
            </label>
            <select
              id="booking-provider"
              className="select-field"
              value={providerId}
              onChange={(e) => setProviderId(e.target.value)}
              required
            >
              <option value="">Select a provider…</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.email}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="booking-date" style={labelStyle}>
              Date
            </label>
            <input
              id="booking-date"
              type="date"
              className="input-field"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              style={{ colorScheme: 'dark' }}
            />
          </div>

          {/* Time */}
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="booking-time" style={labelStyle}>
              Time
            </label>
            <input
              id="booking-time"
              type="time"
              className="input-field"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
              style={{ colorScheme: 'dark' }}
            />
          </div>

          {/* Type */}
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="booking-type" style={labelStyle}>
              Type
            </label>
            <select
              id="booking-type"
              className="select-field"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="CONSULTATION">Consultation</option>
              <option value="FOLLOW_UP">Follow-Up</option>
              <option value="EMERGENCY">Emergency</option>
            </select>
          </div>

          {/* Reason / Notes */}
          <div style={{ marginBottom: '24px' }}>
            <label htmlFor="booking-notes" style={labelStyle}>
              Reason for Visit
            </label>
            <textarea
              id="booking-notes"
              className="input-field"
              placeholder="Briefly describe the reason…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="submit"
              className="btn btn-navy"
              disabled={submitting}
              style={{ flex: 1 }}
              id="submit-booking-button"
            >
              {submitting ? <span className="spinner" /> : '📅 Book'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const labelStyle = {
  display: 'block',
  fontSize: '0.85rem',
  fontWeight: '500',
  color: 'var(--text-secondary)',
  marginBottom: '8px',
};

export default BookingModal;
