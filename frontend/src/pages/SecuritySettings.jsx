import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Breadcrumbs from '../components/Breadcrumbs';

const SecuritySettings = () => {
  const { user } = useAuth();
  const [is2FAEnabled, setIs2FAEnabled] = useState(user?.is2FAEnabled || false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showConfirmDisable, setShowConfirmDisable] = useState(false);

  // Password change state
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwLoading, setPwLoading] = useState(false);

  // Data export state
  const [exportLoading, setExportLoading] = useState(false);

  const handleEnable2FA = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/2fa/enable');
      setIs2FAEnabled(true);
      setSuccess(
        data._devOTP
          ? `2FA enabled! Dev OTP: ${data._devOTP}`
          : '2FA has been successfully enabled for your account.'
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to enable 2FA.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await api.post('/auth/2fa/disable');
      setIs2FAEnabled(false);
      setShowConfirmDisable(false);
      setSuccess('2FA has been disabled for your account.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to disable 2FA.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (pwForm.newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    setPwLoading(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      setSuccess('Password changed successfully.');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setPwLoading(false);
    }
  };

  const handleExportData = async () => {
    setExportLoading(true);
    setError('');
    try {
      const { data } = await api.get('/profile/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `healthsync-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccess('Data exported successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to export data.');
    } finally {
      setExportLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="animate-fade-in">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Security' },
        ]}
      />

      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: '700' }}>Security Settings</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
          Manage your account security and authentication preferences
        </p>
      </div>

      {/* Alerts */}
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

      {/* 2FA Card */}
      <div className="security-card" style={{ marginBottom: '24px' }}>
        <div className="security-card-header">
          <div className="security-card-title">
            <span className="security-icon">🔐</span>
            <h3>Two-Factor Authentication</h3>
          </div>
          <span
            className={`security-status ${
              is2FAEnabled ? 'security-status-enabled' : 'security-status-disabled'
            }`}
          >
            {is2FAEnabled ? '● Enabled' : '○ Disabled'}
          </span>
        </div>

        <p className="security-description">
          Two-factor authentication adds an extra layer of security to your account. When enabled,
          you&apos;ll need to enter a verification code from your email in addition to your password
          when signing in.
        </p>

        <div className="security-actions">
          {is2FAEnabled ? (
            <button
              className="btn btn-danger btn-sm"
              onClick={() => setShowConfirmDisable(true)}
              disabled={loading}
              id="disable-2fa-button"
            >
              {loading ? <span className="spinner" /> : '🔓 Disable 2FA'}
            </button>
          ) : (
            <button
              className="btn btn-success btn-sm"
              onClick={handleEnable2FA}
              disabled={loading}
              id="enable-2fa-button"
            >
              {loading ? <span className="spinner" /> : '🔒 Enable 2FA'}
            </button>
          )}
        </div>
      </div>

      {/* Token & Session Info */}
      <div className="security-card" style={{ marginBottom: '24px' }}>
        <div className="security-card-header">
          <div className="security-card-title">
            <span className="security-icon">🔑</span>
            <h3>Session & Token Security</h3>
          </div>
        </div>

        <p className="security-description">
          HealthSync uses a dual-token system for maximum security. Short-lived access tokens (15
          min) are stored in memory, while long-lived refresh tokens (7 days) are rotated
          automatically via HttpOnly cookies.
        </p>

        <div className="security-info-grid">
          <div className="security-info-item">
            <div className="security-info-label">Access Token Lifetime</div>
            <div className="security-info-value">15 minutes</div>
          </div>
          <div className="security-info-item">
            <div className="security-info-label">Refresh Token Lifetime</div>
            <div className="security-info-value">7 days</div>
          </div>
          <div className="security-info-item">
            <div className="security-info-label">Token Rotation</div>
            <div className="security-info-value">Automatic</div>
          </div>
          <div className="security-info-item">
            <div className="security-info-label">Account Role</div>
            <div className="security-info-value">{user?.role || 'N/A'}</div>
          </div>
        </div>
      </div>

      {/* Account Info */}
      <div className="security-card">
        <div className="security-card-header">
          <div className="security-card-title">
            <span className="security-icon">👤</span>
            <h3>Account Information</h3>
          </div>
        </div>

        <div className="security-info-grid">
          <div className="security-info-item">
            <div className="security-info-label">Email</div>
            <div className="security-info-value">{user?.email || 'N/A'}</div>
          </div>
          <div className="security-info-item">
            <div className="security-info-label">Member Since</div>
            <div className="security-info-value">{formatDate(user?.createdAt)}</div>
          </div>
          <div className="security-info-item">
            <div className="security-info-label">2FA Status</div>
            <div className="security-info-value">
              {is2FAEnabled ? '✅ Active' : '⚠️ Not Active'}
            </div>
          </div>
          <div className="security-info-item">
            <div className="security-info-label">Security Level</div>
            <div className="security-info-value">
              {is2FAEnabled ? '🟢 High' : '🟡 Standard'}
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Card */}
      <div className="security-card" style={{ marginBottom: '24px' }}>
        <div className="security-card-header">
          <div className="security-card-title">
            <span className="security-icon">🔑</span>
            <h3>Change Password</h3>
          </div>
        </div>

        <p className="security-description">
          Update your password regularly to keep your account secure.
        </p>

        <form onSubmit={handleChangePassword}>
          <div className="password-form-fields">
            <div>
              <label
                htmlFor="current-password"
                style={{ display: 'block', fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '8px' }}
              >
                Current Password
              </label>
              <input
                id="current-password"
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={pwForm.currentPassword}
                onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                required
              />
            </div>
            <div>
              <label
                htmlFor="new-password"
                style={{ display: 'block', fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '8px' }}
              >
                New Password
              </label>
              <input
                id="new-password"
                type="password"
                className="input-field"
                placeholder="At least 6 characters"
                value={pwForm.newPassword}
                onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                required
                minLength={6}
              />
            </div>
            <div>
              <label
                htmlFor="confirm-password"
                style={{ display: 'block', fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '8px' }}
              >
                Confirm New Password
              </label>
              <input
                id="confirm-password"
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={pwForm.confirmPassword}
                onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                required
              />
            </div>
          </div>
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={pwLoading}
            id="change-password-button"
          >
            {pwLoading ? <span className="spinner" /> : '🔄 Update Password'}
          </button>
        </form>
      </div>

      {/* Data Export Card */}
      {user?.role === 'PATIENT' && (
        <div className="security-card" style={{ marginBottom: '24px' }}>
          <div className="security-card-header">
            <div className="security-card-title">
              <span className="security-icon">📥</span>
              <h3>Export Your Data</h3>
            </div>
          </div>

          <p className="security-description">
            Download a copy of all your HealthSync data including your profile, medical records
            metadata, consents, appointments, and audit logs as a JSON file.
          </p>

          <button
            className="btn btn-secondary btn-sm"
            onClick={handleExportData}
            disabled={exportLoading}
            id="export-data-button"
          >
            {exportLoading ? <span className="spinner" /> : '📥 Download My Data'}
          </button>
        </div>
      )}

      {/* ── Confirm Disable Modal ─── */}
      {showConfirmDisable && (
        <div className="modal-overlay" onClick={() => setShowConfirmDisable(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3
              style={{
                fontSize: '1.1rem',
                fontWeight: '600',
                marginBottom: '12px',
                color: 'var(--color-danger)',
              }}
            >
              ⚠️ Disable Two-Factor Authentication?
            </h3>
            <p
              style={{
                fontSize: '0.9rem',
                color: 'var(--text-muted)',
                lineHeight: '1.6',
                marginBottom: '8px',
              }}
            >
              Removing 2FA will lower your account security. Anyone with your password will be able
              to access your health data without additional verification.
            </p>

            <div className="confirm-modal-actions">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowConfirmDisable(false)}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={handleDisable2FA}
                disabled={loading}
                id="confirm-disable-2fa"
              >
                {loading ? <span className="spinner" /> : 'Yes, Disable 2FA'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecuritySettings;
