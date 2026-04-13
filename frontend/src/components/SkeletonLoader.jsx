const SkeletonLoader = ({ type = 'card', count = 3 }) => {
  if (type === 'timeline') {
    return (
      <div style={{ paddingLeft: '40px' }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{ paddingBottom: '28px' }}>
            <div className="skeleton skeleton-text" style={{ width: '30%' }} />
            <div className="skeleton skeleton-card" style={{ height: '70px' }} />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: '16px',
              padding: '14px 16px',
              borderBottom: '1px solid var(--border-color)',
            }}
          >
            <div className="skeleton skeleton-text" style={{ flex: 2 }} />
            <div className="skeleton skeleton-text-sm" style={{ flex: 1 }} />
            <div className="skeleton skeleton-text-sm" style={{ flex: 1 }} />
          </div>
        ))}
      </div>
    );
  }

  // Default: card skeletons
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div className="skeleton skeleton-card" key={i} />
      ))}
    </div>
  );
};

export default SkeletonLoader;
