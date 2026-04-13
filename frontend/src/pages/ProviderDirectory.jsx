import { useState, useCallback } from 'react';
import api from '../api/axios';
import Breadcrumbs from '../components/Breadcrumbs';

const ProviderDirectory = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [grantingId, setGrantingId] = useState(null);

  // Debounce timer
  const [timer, setTimer] = useState(null);

  const searchProviders = useCallback(async (q) => {
    if (q.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/providers/search?q=${encodeURIComponent(q)}`);
      setResults(data.providers || []);
      setSearched(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    // Debounce 400ms
    if (timer) clearTimeout(timer);
    setTimer(
      setTimeout(() => {
        searchProviders(value);
      }, 400)
    );
  };

  const handleGrantConsent = async (providerId, providerEmail) => {
    setGrantingId(providerId);
    setError('');
    setSuccess('');

    try {
      await api.post('/consent/grant', {
        providerId,
        accessLevel: 'ALL_RECORDS',
      });
      setSuccess(`Access granted to ${providerEmail}`);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to grant access');
    } finally {
      setGrantingId(null);
    }
  };

  const getInitials = (name, email) => {
    if (name) return name.charAt(0).toUpperCase();
    if (email) return email.charAt(0).toUpperCase();
    return '?';
  };

  return (
    <div className="animate-fade-in">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Find Providers' },
        ]}
      />

      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: '700' }}>Provider Directory</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
          Search for healthcare providers and grant them access to your records
        </p>
      </div>

      {/* Search */}
      <div className="search-wrapper" style={{ maxWidth: '500px', marginBottom: '24px' }}>
        <span className="search-icon">🔍</span>
        <input
          type="text"
          className="search-input"
          placeholder="Search by name or email…"
          value={query}
          onChange={handleSearchChange}
          id="provider-search-input"
        />
      </div>

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

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}>
          <div className="spinner" />
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">🔎</div>
          <div className="empty-state-title">No providers found</div>
          <div className="empty-state-text">
            Try a different search term. Providers need to be registered in the system.
          </div>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div>
          <p
            style={{
              fontSize: '0.82rem',
              color: 'var(--text-muted)',
              marginBottom: '12px',
            }}
          >
            {results.length} provider{results.length !== 1 ? 's' : ''} found
          </p>
          {results.map((provider) => (
            <div className="provider-card" key={provider.id}>
              <div className="provider-avatar">
                {getInitials(provider.full_name, provider.email)}
              </div>
              <div className="provider-info">
                <div className="provider-name">
                  {provider.title ? `${provider.title} ` : ''}
                  {provider.full_name || 'Unnamed Provider'}
                </div>
                {provider.specialization && (
                  <div className="specialty-tag" style={{ fontSize: '0.82rem' }}>
                    {provider.specialization}
                  </div>
                )}
                {provider.hospital_name && (
                  <div className="hospital-badge" style={{ marginTop: '2px' }}>
                    🏥 {provider.hospital_name}
                    {provider.department && <span> · {provider.department}</span>}
                  </div>
                )}
                <div className="provider-email">{provider.email}</div>
              </div>
              <div className="provider-actions">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleGrantConsent(provider.id, provider.email)}
                  disabled={grantingId === provider.id}
                  id={`grant-access-${provider.id}`}
                >
                  {grantingId === provider.id ? (
                    <span className="spinner" />
                  ) : (
                    '🔓 Grant Access'
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !searched && (
        <div className="empty-state">
          <div className="empty-state-icon">🩺</div>
          <div className="empty-state-title">Find your provider</div>
          <div className="empty-state-text">
            Start typing a provider&apos;s name or email above to search the directory.
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderDirectory;
