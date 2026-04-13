import { useEffect, useState } from 'react';
import api from '../api/axios';
import RecordPreviewModal from '../components/RecordPreviewModal';
import SkeletonLoader from '../components/SkeletonLoader';
import { useAuth } from '../context/AuthContext';

const Records = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [previewRecord, setPreviewRecord] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('PRESCRIPTION');
  const [file, setFile] = useState(null);

  useEffect(() => {
    fetchRecords();
  }, [showArchived]);

  const fetchRecords = async () => {
    try {
      const { data } = await api.get(`/records${showArchived ? '?includeArchived=true' : ''}`);
      setRecords(data.records || []);
    } catch {
      setError('Failed to load records');
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async (recordId) => {
    try {
      await api.patch(`/records/${recordId}/archive`);
      setSuccess('Record archived');
      fetchRecords();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to archive record');
    }
  };

  const handleRestore = async (recordId) => {
    try {
      await api.patch(`/records/${recordId}/restore`);
      setSuccess('Record restored');
      fetchRecords();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to restore record');
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setError('');
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('category', category);
      formData.append('file', file);

      await api.post('/records', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccess('Record uploaded successfully');
      setTitle('');
      setCategory('PRESCRIPTION');
      setFile(null);
      setShowUpload(false);
      fetchRecords();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const categoryLabel = (cat) => {
    const labels = {
      PRESCRIPTION: 'Prescription',
      LAB_RESULT: 'Lab Result',
      VISIT_NOTE: 'Visit Note',
    };
    return labels[cat] || cat;
  };

  const filteredRecords = records.filter((record) => {
    const searchLow = searchQuery.toLowerCase();
    const titleMatch = (record.title || '').toLowerCase().includes(searchLow);
    const patientMatch = (record.patient_name || '').toLowerCase().includes(searchLow);
    return titleMatch || patientMatch;
  });

  if (loading) {
    return (
      <div className="animate-fade-in" style={{ padding: '20px' }}>
        <SkeletonLoader type="table" count={6} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: '700' }}>Medical Records</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
            {filteredRecords.length} record{filteredRecords.length !== 1 && 's'} found
          </p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="btn btn-primary btn-sm"
          id="upload-record-button"
        >
          ➕ Upload Record
        </button>
      </div>

      {/* Filters: Search & Archive Toggle */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '16px' }}>
        <input
          type="text"
          className="input-field"
          style={{ maxWidth: '300px', marginBottom: 0 }}
          placeholder="Search by title or patient name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <label className="archive-toggle" style={{ marginBottom: 0 }}>
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            id="show-archived-toggle"
          />
          Show archived records
        </label>
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

      {/* Upload Modal */}
      {showUpload && (
        <div className="modal-overlay" onClick={() => setShowUpload(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px',
              }}
            >
              <h2 style={{ fontSize: '1.1rem', fontWeight: '600' }}>Upload Record</h2>
              <button
                onClick={() => setShowUpload(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpload}>
              <div style={{ marginBottom: '16px' }}>
                <label htmlFor="record-title" style={labelStyle}>Title</label>
                <input
                  id="record-title"
                  type="text"
                  className="input-field"
                  placeholder="e.g. Blood Test Results"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label htmlFor="record-category" style={labelStyle}>Category</label>
                <select
                  id="record-category"
                  className="select-field"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="PRESCRIPTION">Prescription</option>
                  <option value="LAB_RESULT">Lab Result</option>
                  <option value="VISIT_NOTE">Visit Note</option>
                </select>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={labelStyle}>File</label>
                <div className="file-input-wrapper">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setFile(e.target.files[0])}
                    required
                    id="record-file-input"
                  />
                  {file ? (
                    <div>
                      <p style={{ color: 'var(--color-success)', fontWeight: '500', marginBottom: '4px' }}>
                        ✅ {file.name}
                      </p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        📄 Drop your file here or click to browse
                      </p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        Supports: PDF, JPG, PNG (max 5MB)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={uploading || !file}
                  style={{ flex: 1 }}
                  id="submit-upload-button"
                >
                  {uploading ? <span className="spinner" /> : '📤 Upload'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowUpload(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Records Table */}
      {filteredRecords.length === 0 ? (
        <div
          className="glass-card"
          style={{
            padding: '48px',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '2rem', marginBottom: '12px' }}>📂</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '4px' }}>
            No records found
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {records.length === 0 ? "Upload your first medical record to get started" : "Try adjusting your search query"}
          </p>
        </div>
      ) : (
        <div
          className="glass-card"
          style={{ padding: '0', overflow: 'hidden' }}
        >
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                {user?.role !== 'PATIENT' && <th>Patient</th>}
                <th>Category</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => (
                <tr key={record.id} style={{ opacity: record.is_archived ? 0.5 : 1 }}>
                  <td style={{ fontWeight: '500', color: 'var(--text-primary)' }}>
                    {record.title}
                  </td>
                  {user?.role !== 'PATIENT' && (
                    <td>{record.patient_name || 'Unknown'}</td>
                  )}
                  <td>
                    <span className={`badge cat-${record.category?.toLowerCase()}`}>
                      {categoryLabel(record.category)}
                    </span>
                  </td>
                  <td>{formatDate(record.created_at)}</td>
                  <td>
                    {record.is_archived ? (
                      <span className="archive-badge">📦 Archived</span>
                    ) : (
                      <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-success)' }}>Active</span>
                    )}
                  </td>
                  <td style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => setPreviewRecord(record)}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.8rem' }}
                    >
                      👁️ View
                    </button>
                    {record.is_archived ? (
                      <button
                        onClick={() => handleRestore(record.id)}
                        className="btn btn-success btn-sm"
                        style={{ fontSize: '0.8rem' }}
                      >
                        ↩️ Restore
                      </button>
                    ) : (
                      <button
                        onClick={() => handleArchive(record.id)}
                        className="btn btn-danger btn-sm"
                        style={{ fontSize: '0.8rem' }}
                      >
                        📦 Archive
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Record Preview Lightbox */}
      {previewRecord && (
        <RecordPreviewModal
          record={previewRecord}
          onClose={() => setPreviewRecord(null)}
        />
      )}
    </div>
  );
};

const labelStyle = {
  display: 'block',
  fontSize: '0.85rem',
  fontWeight: '500',
  color: 'var(--text-secondary)',
  marginBottom: '8px',
};

export default Records;
