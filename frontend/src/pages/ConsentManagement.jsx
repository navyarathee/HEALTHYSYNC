import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import ConsentCard from '../components/ConsentCard';
import SkeletonLoader from '../components/SkeletonLoader';

const ConsentManagement = () => {
  const { showToast } = useToast();
  const [consents, setConsents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState([]);
  const [showGrant, setShowGrant] = useState(false);
  const [granting, setGranting] = useState(false);
  const [revokingId, setRevokingId] = useState(null);

  // Grant form state
  const [selectedProvider, setSelectedProvider] = useState('');
  const [accessLevel, setAccessLevel] = useState('ALL_RECORDS');
  const [category, setCategory] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('');

  useEffect(() => {
    fetchConsents();
  }, []);

  const fetchConsents = async () => {
    try {
      const { data } = await api.get('/consent/active');
      setConsents(data.consents || []);
    } catch {
      showToast('Failed to load consents', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openGrant = async () => {
    setShowGrant(true);
    try {
      const { data } = await api.get('/users/providers');
      setProviders(data.providers || []);
    } catch {
      showToast('Failed to load providers', 'error');
    }
  };

  const handleGrant = async (e) => {
    e.preventDefault();
    setGranting(true);
    try {
      await api.post('/consent/grant', {
        providerId: selectedProvider,
        accessLevel,
        category: accessLevel === 'SPECIFIC_CATEGORY' ? category : undefined,
        expiresInDays: expiresInDays ? parseInt(expiresInDays) : undefined,
      });
      showToast('Access granted successfully', 'success');
      setShowGrant(false);
      resetForm();
      fetchConsents();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to grant access', 'error');
    } finally {
      setGranting(false);
    }
  };

  const handleRevoke = async (consentId) => {
    setRevokingId(consentId);
    try {
      await api.delete(`/consent/revoke/${consentId}`);
      showToast('Access revoked successfully', 'success');
      setConsents((prev) => prev.filter((c) => c.id !== consentId));
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to revoke access', 'error');
    } finally {
      setRevokingId(null);
    }
  };

  const resetForm = () => {
    setSelectedProvider('');
    setAccessLevel('ALL_RECORDS');
    setCategory('');
    setExpiresInDays('');
  };

  if (loading) {
    return (
      <div className="animate-fade-in" style={{ padding: '20px' }}>
        <SkeletonLoader type="card" count={3} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
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
          <h1 style={{ fontSize: '1.4rem', fontWeight: '700' }}>Consent Management</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
            Control who has access to your health records
          </p>
        </div>
        <button
          onClick={openGrant}
          className="btn btn-primary btn-sm"
          id="authorize-provider-button"
        >
          ➕ Authorize Provider
        </button>
      </div>

      {/* Security Summary Banner */}
      <div
        className="glass-card"
        style={{
          padding: '24px',
          marginBottom: '24px',
          background: `
            linear-gradient(135deg, rgba(6, 182, 212, 0.08), rgba(99, 102, 241, 0.06)),
            var(--glass-bg)
          `,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '2rem' }}>🛡️</span>
          <div>
            <p style={{ fontWeight: '600', fontSize: '0.95rem', marginBottom: '2px' }}>
              {consents.length === 0
                ? 'Your data is fully private'
                : `${consents.length} provider${consents.length !== 1 ? 's' : ''} with active access`}
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              {consents.length === 0
                ? 'No providers currently have access to your records'
                : 'You can revoke any access at any time'}
            </p>
          </div>
        </div>
      </div>

      {/* Consents List */}
      {consents.length === 0 ? (
        <div className="glass-card">
          <div className="empty-state">
            <div className="empty-state-icon">🔐</div>
            <div className="empty-state-title">Your data is currently private</div>
            <div className="empty-state-text">
              No providers have active access to your records. Click &quot;Authorize Provider&quot; to grant access.
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {consents.map((consent) => (
            <ConsentCard
              key={consent.id}
              consent={consent}
              onRevoke={handleRevoke}
              revoking={revokingId === consent.id}
            />
          ))}
        </div>
      )}

      {/* ── Grant Access Modal ──────────────────────────── */}
      {showGrant && (
        <div className="modal-overlay" onClick={() => setShowGrant(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px',
              }}
            >
              <h2 style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                Authorize Provider
              </h2>
              <button
                onClick={() => setShowGrant(false)}
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

            <form onSubmit={handleGrant}>
              {/* Provider Select */}
              <div style={{ marginBottom: '16px' }}>
                <label htmlFor="provider-select" style={labelStyle}>
                  Select Provider
                </label>
                <select
                  id="provider-select"
                  className="select-field"
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  required
                >
                  <option value="" disabled>
                    Choose a provider...
                  </option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Access Level */}
              <div style={{ marginBottom: '16px' }}>
                <label htmlFor="access-level" style={labelStyle}>
                  Access Level
                </label>
                <select
                  id="access-level"
                  className="select-field"
                  value={accessLevel}
                  onChange={(e) => setAccessLevel(e.target.value)}
                >
                  <option value="ALL_RECORDS">All Records</option>
                  <option value="SPECIFIC_CATEGORY">Specific Category</option>
                </select>
              </div>

              {/* Category (conditional) */}
              {accessLevel === 'SPECIFIC_CATEGORY' && (
                <div style={{ marginBottom: '16px' }}>
                  <label htmlFor="category-select" style={labelStyle}>
                    Category
                  </label>
                  <select
                    id="category-select"
                    className="select-field"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                  >
                    <option value="" disabled>
                      Select category...
                    </option>
                    <option value="PRESCRIPTION">Prescription</option>
                    <option value="LAB_RESULT">Lab Result</option>
                    <option value="VISIT_NOTE">Visit Note</option>
                  </select>
                </div>
              )}

              {/* Expiry */}
              <div style={{ marginBottom: '24px' }}>
                <label htmlFor="expires-days" style={labelStyle}>
                  Expires In (days) — optional
                </label>
                <input
                  id="expires-days"
                  type="number"
                  className="input-field"
                  placeholder="e.g. 30 (leave empty for no expiry)"
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(e.target.value)}
                  min="1"
                  max="365"
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={granting || !selectedProvider}
                  style={{ flex: 1 }}
                  id="submit-grant-button"
                >
                  {granting ? <span className="spinner" /> : '🔓 Grant Access'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowGrant(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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

export default ConsentManagement;
