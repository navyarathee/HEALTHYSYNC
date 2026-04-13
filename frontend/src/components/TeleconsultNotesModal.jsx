import { useState } from 'react';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';

const TeleconsultNotesModal = ({ appointmentId, onClose, onSaved }) => {
  const { showToast } = useToast();
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState('INTERNAL');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    try {
      await api.post(`/teleconsult/${appointmentId}/notes`, {
        content: content.trim(),
        visibility,
      });
      showToast('Telehealth notes saved', 'success');
      onSaved?.();
      onClose();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save notes', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}
        >
          <div>
            <h2
              style={{
                fontSize: '1.1rem',
                fontWeight: '700',
                color: 'var(--text-primary)',
              }}
            >
              📹 Telehealth Session Notes
            </h2>
            <p
              style={{
                fontSize: '0.82rem',
                color: 'var(--text-muted)',
                marginTop: '4px',
              }}
            >
              Document clinical observations from this session
            </p>
          </div>
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

        <form onSubmit={handleSubmit}>
          {/* Content */}
          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="telehealth-notes"
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: '500',
                color: 'var(--text-secondary)',
                marginBottom: '8px',
              }}
            >
              Session Notes
            </label>
            <textarea
              id="telehealth-notes"
              className="textarea-field"
              placeholder="Enter your clinical observations, findings, and recommendations..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              style={{ minHeight: '140px' }}
            />
          </div>

          {/* Visibility Toggle */}
          <div style={{ marginBottom: '24px' }}>
            <div
              className="toggle-wrapper"
              onClick={() =>
                setVisibility(
                  visibility === 'INTERNAL' ? 'SHARED_WITH_PATIENT' : 'INTERNAL'
                )
              }
            >
              <div
                className={`toggle-track ${
                  visibility === 'SHARED_WITH_PATIENT' ? 'active' : ''
                }`}
                style={
                  visibility === 'SHARED_WITH_PATIENT'
                    ? {
                        background: 'rgba(6, 182, 212, 0.3)',
                        borderColor: 'var(--color-accent)',
                      }
                    : {}
                }
              >
                <div
                  className="toggle-thumb"
                  style={
                    visibility === 'SHARED_WITH_PATIENT'
                      ? { background: 'var(--color-accent)' }
                      : {}
                  }
                />
              </div>
              <span className="toggle-label">
                {visibility === 'SHARED_WITH_PATIENT'
                  ? '👁️ Share with patient'
                  : '🔒 Internal only'}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || !content.trim()}
              style={{ flex: 1 }}
              id="submit-telehealth-notes"
            >
              {submitting ? <span className="spinner" /> : '💾 Save Notes'}
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

export default TeleconsultNotesModal;
