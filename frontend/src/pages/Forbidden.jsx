import { Link } from 'react-router-dom';

const Forbidden = () => {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-dark)',
        padding: '24px',
      }}
    >
      <div className="glass-card animate-fade-in" style={{ padding: '48px', textAlign: 'center', maxWidth: '440px' }}>
        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.15)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            marginBottom: '20px',
          }}
        >
          🚫
        </div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '8px' }}>
          Access Denied
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.5' }}>
          You do not have permission to access this page. Please contact your administrator if you
          believe this is an error.
        </p>
        <Link to="/dashboard" className="btn btn-primary" id="back-to-dashboard">
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default Forbidden;
