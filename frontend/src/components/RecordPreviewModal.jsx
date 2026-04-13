import { useEffect } from 'react';

const RecordPreviewModal = ({ record, onClose }) => {
  // Close on Escape key
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!record) return null;

  const token = localStorage.getItem('accessToken');
  const streamUrl = `/api/records/${record.id}/stream?token=${token}`;
  const isImage = record.file_url?.match(/\.(jpg|jpeg|png)$/i);
  const isPdf = record.file_url?.match(/\.pdf$/i);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = streamUrl;
    a.download = record.title || 'download';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="preview-overlay" onClick={onClose}>
      {/* Toolbar */}
      <div className="preview-toolbar" onClick={(e) => e.stopPropagation()}>
        <span className="preview-toolbar-title">
          📄 {record.title}
        </span>
        <div className="preview-toolbar-actions">
          <button
            className="preview-toolbar-btn"
            onClick={handleDownload}
            title="Download"
            id="preview-download-btn"
          >
            ⬇
          </button>
          <button
            className="preview-toolbar-btn"
            onClick={onClose}
            title="Close"
            id="preview-close-btn"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Document */}
      <div className="preview-body" onClick={(e) => e.stopPropagation()}>
        <div className="preview-frame">
          {isImage && (
            <img
              src={streamUrl}
              alt={record.title}
            />
          )}
          {isPdf && (
            <iframe
              src={streamUrl}
              title={record.title}
            />
          )}
          {!isImage && !isPdf && (
            <div style={{ padding: '48px', textAlign: 'center', color: '#333' }}>
              <p style={{ fontSize: '2rem', marginBottom: '12px' }}>📄</p>
              <p>Preview not available for this file type.</p>
              <button
                className="btn btn-navy btn-sm"
                onClick={handleDownload}
                style={{ marginTop: '16px' }}
              >
                ⬇ Download File
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecordPreviewModal;
