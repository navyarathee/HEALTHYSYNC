const StatusBadge = ({ status }) => {
  const normalized = status?.toUpperCase();
  let label = status;
  let className = 'status-dot ';

  switch (normalized) {
    case 'ACTIVE':
      className += 'status-active';
      label = 'Active';
      break;
    case 'EXPIRED':
      className += 'status-expired';
      label = 'Expired';
      break;
    case 'REVOKED':
      className += 'status-revoked';
      label = 'Revoked';
      break;
    default:
      className += 'status-active';
  }

  return <span className={className}>{label}</span>;
};

export default StatusBadge;
