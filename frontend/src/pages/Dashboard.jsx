import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../api/axios';

const Dashboard = () => {
  const { user } = useAuth();
  const [recordCount, setRecordCount] = useState(null);
  const [profileName, setProfileName] = useState(null);

  useEffect(() => {
    api
      .get('/records')
      .then(({ data }) => setRecordCount(data.count))
      .catch(() => setRecordCount(0));

    // Fetch profile name
    api
      .get('/profile')
      .then(({ data }) => setProfileName(data.profile?.full_name || null))
      .catch(() => {});
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const patientStats = [
    {
      label: 'Total Records',
      value: recordCount !== null ? recordCount : '—',
      icon: '📁',
      color: 'var(--color-primary)',
    },
    {
      label: 'Account Role',
      value: user?.role,
      icon: '🏷️',
      color: 'var(--color-accent)',
    },
    {
      label: 'Member Since',
      value: formatDate(user?.createdAt),
      icon: '📅',
      color: 'var(--color-success)',
    },
    {
      label: '2FA Status',
      value: user?.is2FAEnabled ? 'Enabled' : 'Disabled',
      icon: '🔐',
      color: user?.is2FAEnabled ? 'var(--color-success)' : 'var(--color-warning)',
    },
  ];

  return (
    <div className="animate-fade-in">
      {/* Welcome Banner */}
      <div
        className="glass-card"
        style={{
          padding: '32px',
          marginBottom: '32px',
          background: `
            linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(6, 182, 212, 0.08)),
            var(--glass-bg)
          `,
        }}
      >
        <h1 style={{ fontSize: '1.6rem', fontWeight: '700', marginBottom: '8px' }}>
          Welcome back{profileName ? `, ${profileName}` : user?.email ? `, ${user.email.split('@')[0]}` : ''} 👋
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Here&apos;s an overview of your HealthSync account
        </p>
      </div>

      {/* Stat Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '20px',
          marginBottom: '32px',
        }}
      >
        {patientStats.map((stat, i) => (
          <div
            key={stat.label}
            className="stat-card animate-slide-up"
            style={{ animationDelay: `${i * 0.1}s`, opacity: 0, animationFillMode: 'forwards' }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
              }}
            >
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--text-muted)',
                }}
              >
                {stat.label}
              </span>
              <span style={{ fontSize: '1.5rem' }}>{stat.icon}</span>
            </div>
            <p
              style={{
                fontSize: '1.4rem',
                fontWeight: '700',
                color: stat.color,
              }}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      {user?.role === 'PATIENT' && (
        <div>
          <h2
            style={{
              fontSize: '1.1rem',
              fontWeight: '600',
              marginBottom: '16px',
              color: 'var(--text-secondary)',
            }}
          >
            Quick Actions
          </h2>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link to="/profile" className="btn btn-secondary" id="quick-action-profile">
              👤 View Profile
            </Link>
            <Link to="/records" className="btn btn-secondary" id="quick-action-records">
              📁 Manage Records
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
