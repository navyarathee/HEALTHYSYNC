import StatusBadge from './StatusBadge';

const ConsentCard = ({ consent, onRevoke, revoking }) => {
  const formatDate = (dateStr) => {
    if (!dateStr) return 'No expiry';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const accessLabel = (level) => {
    const labels = {
      ALL_RECORDS: 'All Records',
      SPECIFIC_CATEGORY: consent.category || 'Specific Category',
    };
    return labels[level] || level;
  };

  return (
    <div className="consent-card">
      <div className="consent-card-info">
        <div className="consent-card-provider">
          {consent.provider_email}
        </div>
        <div className="consent-card-meta">
          <span>📋 {accessLabel(consent.access_level)}</span>
          <span>📅 {consent.expires_at ? `Until ${formatDate(consent.expires_at)}` : 'No expiry'}</span>
          <StatusBadge status={consent.status} />
        </div>
      </div>
      <button
        className="btn btn-ghost"
        onClick={() => onRevoke(consent.id)}
        disabled={revoking}
        id={`revoke-consent-${consent.id}`}
      >
        {revoking ? '...' : 'Revoke Access'}
      </button>
    </div>
  );
};

export default ConsentCard;
