import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🔥 React Error Boundary caught:', error, errorInfo);
  }

  handleReload = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-primary, #0f0f23)',
            color: 'var(--text-primary, #e2e8f0)',
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          <div
            style={{
              textAlign: 'center',
              maxWidth: '480px',
              padding: '48px 32px',
              background: 'rgba(30, 30, 60, 0.6)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              borderRadius: '16px',
              backdropFilter: 'blur(12px)',
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🏥</div>
            <h1
              style={{
                fontSize: '1.4rem',
                fontWeight: '700',
                marginBottom: '12px',
                background: 'linear-gradient(135deg, #818cf8, #06b6d4)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Service Temporarily Unavailable
            </h1>
            <p
              style={{
                fontSize: '0.9rem',
                color: '#94a3b8',
                lineHeight: '1.6',
                marginBottom: '24px',
              }}
            >
              Something went wrong while loading HealthSync. Your data is safe —
              please try reloading the page.
            </p>
            <button
              onClick={this.handleReload}
              style={{
                padding: '10px 28px',
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 4px 20px rgba(99, 102, 241, 0.4)';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              ↻ Reload HealthSync
            </button>
            <p
              style={{
                fontSize: '0.75rem',
                color: '#64748b',
                marginTop: '20px',
              }}
            >
              If this keeps happening, please contact support.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
