import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [needs2FA, setNeeds2FA] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [devOTP, setDevOTP] = useState('');

  const { login, verify2FA } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);

      if (result.needs2FA) {
        setNeeds2FA(true);
        setTempToken(result.temp2FAToken);
        setDevOTP(result._devOTP || '');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handle2FA = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await verify2FA(otp, tempToken);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (needs2FA) {
    return (
      <div className="animate-fade-in">
        <h2 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '8px' }}>
          Two-Factor Authentication
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '24px' }}>
          Enter the verification code sent to your email
        </p>

        {devOTP && (
          <div className="alert alert-success" style={{ marginBottom: '16px' }}>
            Dev OTP: <strong>{devOTP}</strong>
          </div>
        )}

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handle2FA}>
          <div style={{ marginBottom: '20px' }}>
            <label
              htmlFor="otp-input"
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: '500',
                color: 'var(--text-secondary)',
                marginBottom: '8px',
              }}
            >
              Verification Code
            </label>
            <input
              id="otp-input"
              type="text"
              className="input-field"
              placeholder="Enter 6-digit code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength={6}
              autoFocus
              style={{ textAlign: 'center', fontSize: '1.3rem', letterSpacing: '0.3em' }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || otp.length < 6}
            style={{ width: '100%' }}
          >
            {loading ? <span className="spinner" /> : 'Verify Code'}
          </button>
        </form>

        <button
          onClick={() => {
            setNeeds2FA(false);
            setOtp('');
            setError('');
          }}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '0.85rem',
            cursor: 'pointer',
            marginTop: '16px',
            width: '100%',
            textAlign: 'center',
          }}
        >
          ← Back to login
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '4px' }}>
        Sign In
      </h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '24px' }}>
        Enter your credentials to access your account
      </p>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '16px' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: '16px' }}>
          <label
            htmlFor="email-input"
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
            id="email-input"
            type="email"
            className="input-field"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label
            htmlFor="password-input"
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
            id="password-input"
            type="password"
            className="input-field"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          style={{ width: '100%' }}
          id="login-button"
        >
          {loading ? <span className="spinner" /> : 'Sign In'}
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
        Don&apos;t have an account?{' '}
        <Link
          to="/register"
          style={{ color: 'var(--color-primary-light)', textDecoration: 'none', fontWeight: '500' }}
        >
          Create one
        </Link>
      </p>
    </div>
  );
};

export default Login;
