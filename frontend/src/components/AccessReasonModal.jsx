import { useState } from 'react';

const ACCESS_REASONS = [
  { value: 'CLINICAL_REVIEW', label: 'Clinical Review' },
  { value: 'FOLLOW_UP', label: 'Follow-up Appointment' },
  { value: 'LAB_REVIEW', label: 'Lab Results Review' },
  { value: 'REFERRAL', label: 'Referral / Specialist' },
  { value: 'OTHER', label: 'Other' },
];

const AccessReasonModal = ({ onSubmit, onClose, loading }) => {
  const [reason, setReason] = useState('');
  const [isEmergency, setIsEmergency] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason) return;
    onSubmit({ reason, isEmergency });
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
              🔒 Access Verification Required
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Please state why you need to access this record.
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
          {/* Reason Dropdown */}
          <div style={{ marginBottom: '20px' }}>
            <label
              htmlFor="access-reason"
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: '500',
                color: 'var(--text-secondary)',
                marginBottom: '8px',
              }}
            >
              Access Reason
            </label>
            <select
              id="access-reason"
              className="select-field"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            >
              <option value="" disabled>
                Select a reason...
              </option>
              {ACCESS_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Emergency Toggle */}
          <div style={{ marginBottom: '24px' }}>
            <div
              className="toggle-wrapper"
              onClick={() => setIsEmergency(!isEmergency)}
            >
              <div className={`toggle-track ${isEmergency ? 'active' : ''}`}>
                <div className="toggle-thumb" />
              </div>
              <span className="toggle-label">
                {isEmergency
                  ? '🚨 This is a medical emergency'
                  : 'This is a medical emergency'}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="submit"
              className={`btn ${isEmergency ? 'btn-warning' : 'btn-primary'}`}
              disabled={!reason || loading}
              style={{ flex: 1 }}
              id="submit-access-reason"
            >
              {loading ? (
                <span className="spinner" />
              ) : isEmergency ? (
                '🚨 Emergency Access'
              ) : (
                '🔓 Proceed with Access'
              )}
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

export default AccessReasonModal;
