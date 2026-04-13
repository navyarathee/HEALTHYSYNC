import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('PATIENT');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await register(email, password, role);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '4px' }}>
        Create Account
      </h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '24px' }}>
        Join HealthSync to manage your health records
      </p>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '16px' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Role Selector */}
        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '0.85rem',
              fontWeight: '500',
              color: 'var(--text-secondary)',
              marginBottom: '10px',
            }}
          >
            I am a...
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['PATIENT', 'PROVIDER'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                id={`role-${r.toLowerCase()}`}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: 'var(--radius-sm)',
                  border: `2px solid ${role === r ? 'var(--color-primary)' : 'var(--border-color)'}`,
                  background: role === r
                    ? 'rgba(99, 102, 241, 0.1)'
                    : 'var(--bg-input)',
                  color: role === r ? 'var(--color-primary-light)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: role === r ? '600' : '400',
                  fontFamily: 'inherit',
                  transition: 'all var(--transition-fast)',
                }}
              >
                {r === 'PATIENT' ? '🏥 Patient' : '⚕️ Provider'}
              </button>
            ))}
          </div>
        </div>

        {/* Email */}
        <div style={{ marginBottom: '16px' }}>
          <label
            htmlFor="reg-email"
            style={{
              display: 'block',
              fontSize: '0.85rem',
              fontWeight: '500',
              color: 'var(--text-secondary)',
              marginBottom: '8px',
            }}
          >
            Email Address
          </label>
          <input
            id="reg-email"
            type="email"
            className="input-field"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </div>

        {/* Password */}
        <div style={{ marginBottom: '16px' }}>
          <label
            htmlFor="reg-password"
            style={{
              display: 'block',
              fontSize: '0.85rem',
              fontWeight: '500',
              color: 'var(--text-secondary)',
              marginBottom: '8px',
            }}
          >
            Password
          </label>
          <input
            id="reg-password"
            type="password"
            className="input-field"
            placeholder="Min. 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {/* Confirm Password */}
        <div style={{ marginBottom: '24px' }}>
          <label
            htmlFor="reg-confirm"
            style={{
              display: 'block',
              fontSize: '0.85rem',
              fontWeight: '500',
              color: 'var(--text-secondary)',
              marginBottom: '8px',
            }}
          >
            Confirm Password
          </label>
          <input
            id="reg-confirm"
            type="password"
            className="input-field"
            placeholder="Re-enter password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          style={{ width: '100%' }}
          id="register-button"
        >
          {loading ? <span className="spinner" /> : 'Create Account'}
        </button>
      </form>

      <p
        style={{
          textAlign: 'center',
          marginTop: '24px',
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
        }}
      >
        Already have an account?{' '}
        <Link
          to="/login"
          style={{ color: 'var(--color-primary-light)', textDecoration: 'none', fontWeight: '500' }}
        >
          Sign in
        </Link>
      </p>
    </div>
  );
};

export default Register;
