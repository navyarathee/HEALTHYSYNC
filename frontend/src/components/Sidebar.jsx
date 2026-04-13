import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const { user } = useAuth();

  const patientLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: '📊' },
    { to: '/profile', label: 'My Profile', icon: '👤' },
    { to: '/records', label: 'My Records', icon: '📁' },
    { to: '/appointments', label: 'Appointments', icon: '📅' },
    { to: '/timeline', label: 'Timeline', icon: '📈' },
    { to: '/collab-notes', label: 'Care Notes', icon: '💬' },
    { to: '/consent', label: 'Consent', icon: '🛡️' },
    { to: '/providers', label: 'Find Providers', icon: '🔍' },
    { to: '/notifications', label: 'Notifications', icon: '🔔' },
    { to: '/audit-log', label: 'Activity Log', icon: '📋' },
    { to: '/security', label: 'Security', icon: '🔒' },
  ];

  const providerLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: '📊' },
    { to: '/profile', label: 'My Profile', icon: '👤' },
    { to: '/records', label: 'Patient Records', icon: '📁' },
    { to: '/appointments', label: 'Appointments', icon: '📅' },
    { to: '/timeline', label: 'Timeline', icon: '📈' },
    { to: '/collab-notes', label: 'Case Discussion', icon: '🩺' },
    { to: '/notifications', label: 'Notifications', icon: '🔔' },
    { to: '/security', label: 'Security', icon: '🔒' },
  ];

  const adminLinks = [
    { to: '/dashboard', label: 'Overview', icon: '📊' },
    { to: '/admin/dashboard', label: 'Command Center', icon: '🛡️' },
    { to: '/records', label: 'All Records', icon: '📁' },
    { to: '/appointments', label: 'Appointments', icon: '📅' },
    { to: '/admin/system-health', label: 'System Health', icon: '🏥' },
    { to: '/notifications', label: 'Notifications', icon: '🔔' },
    { to: '/security', label: 'Security', icon: '🔒' },
  ];

  const getLinks = () => {
    switch (user?.role) {
      case 'PROVIDER':
        return providerLinks;
      case 'ADMIN':
        return adminLinks;
      default:
        return patientLinks;
    }
  };

  const links = getLinks();

  const getInitials = () => {
    if (!user?.email) return '?';
    return user.email.charAt(0).toUpperCase();
  };

  return (
    <aside
      style={{
        width: '260px',
        minHeight: '100vh',
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border-color)',
        padding: '24px 0',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: '0 24px 32px',
          borderBottom: '1px solid var(--border-color)',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
            }}
          >
            🏥
          </div>
          <div>
            <h1
              style={{
                fontSize: '1.2rem',
                fontWeight: '700',
                background: 'linear-gradient(135deg, var(--color-primary-light), var(--color-accent-light))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              HealthSync
            </h1>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Patient Records
            </p>
          </div>
        </div>
      </div>

      {/* Nav Links */}
      <nav style={{ flex: 1, padding: '0 12px' }}>
        <ul style={{ listStyle: 'none' }}>
          {links.map((link) => (
            <li key={link.to} style={{ marginBottom: '4px' }}>
              <NavLink
                to={link.to}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-sm)',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  fontWeight: isActive ? '600' : '400',
                  color: isActive ? 'var(--color-primary-light)' : 'var(--text-secondary)',
                  background: 'transparent',
                  borderLeft: isActive
                    ? '3px solid var(--color-primary)'
                    : '3px solid transparent',
                  transition: 'all var(--transition-fast)',
                })}
              >
                <span style={{ fontSize: '1.1rem' }}>{link.icon}</span>
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom: Avatar + Role */}
      <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.85rem',
              fontWeight: '700',
              color: 'white',
              flexShrink: 0,
            }}
          >
            {getInitials()}
          </div>
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                fontSize: '0.85rem',
                fontWeight: '500',
                color: 'var(--text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user?.email?.split('@')[0] || 'User'}
            </p>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {user?.role}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

