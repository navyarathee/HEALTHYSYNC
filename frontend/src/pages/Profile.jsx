import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import SkeletonLoader from '../components/SkeletonLoader';
import Breadcrumbs from '../components/Breadcrumbs';

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showContact, setShowContact] = useState(false);

  const isProvider = user?.role === 'PROVIDER';

  const [form, setForm] = useState({
    // Common
    fullName: '',
    dateOfBirth: '',
    // Patient fields
    bloodGroup: '',
    allergies: '',
    chronicConditions: '',
    emergencyContact: '',
    gender: '',
    phone: '',
    address: '',
    // Provider fields
    title: '',
    specialization: '',
    hospitalName: '',
    department: '',
    workPhone: '',
    workEmail: '',
    clinicAddress: '',
    licenseNumber: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data } = await api.get('/profile');
      setProfile(data.profile);
      setForm({
        fullName: data.profile.full_name || '',
        dateOfBirth: data.profile.date_of_birth ? data.profile.date_of_birth.split('T')[0] : '',
        bloodGroup: data.profile.blood_group || '',
        allergies: Array.isArray(data.profile.allergies) ? data.profile.allergies.join(', ') : data.profile.allergies || '',
        chronicConditions: Array.isArray(data.profile.chronic_conditions) ? data.profile.chronic_conditions.join(', ') : data.profile.chronic_conditions || '',
        emergencyContact: data.profile.emergency_contact || '',
        gender: data.profile.gender || '',
        phone: data.profile.phone || '',
        address: data.profile.address || '',
        title: data.profile.title || '',
        specialization: data.profile.specialization || '',
        hospitalName: data.profile.hospital_name || '',
        department: data.profile.department || '',
        workPhone: data.profile.work_phone || '',
        workEmail: data.profile.work_email || '',
        clinicAddress: data.profile.clinic_address || '',
        licenseNumber: data.profile.license_number || '',
      });
    } catch {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        fullName: form.fullName || null,
        dateOfBirth: form.dateOfBirth || null,
        bloodGroup: form.bloodGroup || null,
        allergies: form.allergies ? form.allergies.split(',').map((s) => s.trim()).filter(Boolean) : null,
        chronicConditions: form.chronicConditions ? form.chronicConditions.split(',').map((s) => s.trim()).filter(Boolean) : null,
        emergencyContact: form.emergencyContact || null,
        gender: form.gender || null,
        phone: form.phone || null,
        address: form.address || null,
        title: form.title || null,
        specialization: form.specialization || null,
        hospitalName: form.hospitalName || null,
        department: form.department || null,
        workPhone: form.workPhone || null,
        workEmail: form.workEmail || null,
        clinicAddress: form.clinicAddress || null,
        licenseNumber: form.licenseNumber || null,
      };

      const { data } = await api.patch('/profile', payload);
      setProfile(data.profile);
      setEditing(false);
      setSuccess('Profile updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const FieldView = ({ label, value }) => (
    <div className="profile-field">
      <div className="profile-field-label">{label}</div>
      {value ? (
        <div className="profile-field-value">{value}</div>
      ) : (
        <div className="profile-field-empty">Not provided</div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="animate-fade-in" style={{ padding: '20px' }}>
        <SkeletonLoader type="card" count={2} />
      </div>
    );
  }

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const initials = displayName.charAt(0).toUpperCase();
  const allergyStr = Array.isArray(profile?.allergies) ? profile.allergies.join(', ') : profile?.allergies;
  const conditionsStr = Array.isArray(profile?.chronic_conditions) ? profile.chronic_conditions.join(', ') : profile?.chronic_conditions;
  const dobFormatted = profile?.date_of_birth
    ? new Date(profile.date_of_birth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <div className="animate-fade-in">
      <Breadcrumbs items={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Profile' }]} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: '700' }}>
            {isProvider ? 'Professional Profile' : 'Health Profile'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
            {isProvider ? 'Your medical credentials and contact information' : 'Your medical metadata and identity card'}
          </p>
        </div>
        {!editing && (
          <button onClick={() => setEditing(true)} className="btn btn-primary btn-sm" id="edit-profile-button">
            ✏️ Edit Profile
          </button>
        )}
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '16px' }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ marginBottom: '16px' }}>{success}</div>}

      {editing ? (
        /* ── Edit Form ─────────────────────────────── */
        <div className="glass-card" style={{ padding: '32px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '24px' }}>
            {isProvider ? 'Edit Professional Information' : 'Edit Health Information'}
          </h2>
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
              <div>
                <label htmlFor="profile-name" style={labelStyle}>Full Name</label>
                <input id="profile-name" type="text" className="input-field" placeholder="John Doe" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              </div>
              <div>
                <label htmlFor="profile-dob" style={labelStyle}>Date of Birth</label>
                <input id="profile-dob" type="date" className="input-field" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
              </div>

              {!isProvider && (
                <>
                  <div>
                    <label htmlFor="profile-gender" style={labelStyle}>Gender</label>
                    <select id="profile-gender" className="select-field" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="profile-phone" style={labelStyle}>Phone</label>
                    <input id="profile-phone" type="text" className="input-field" placeholder="+1-555-123-4567" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="profile-address" style={labelStyle}>Home Address</label>
                    <input id="profile-address" type="text" className="input-field" placeholder="123 Main St, City" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="profile-blood" style={labelStyle}>Blood Group</label>
                    <select id="profile-blood" className="select-field" value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}>
                      <option value="">Select blood group</option>
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="profile-allergies" style={labelStyle}>Allergies <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>(comma-separated)</span></label>
                    <input id="profile-allergies" type="text" className="input-field" placeholder="Peanuts, Penicillin" value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="profile-conditions" style={labelStyle}>Chronic Conditions <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>(comma-separated)</span></label>
                    <input id="profile-conditions" type="text" className="input-field" placeholder="Diabetes, Hypertension" value={form.chronicConditions} onChange={(e) => setForm({ ...form, chronicConditions: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="profile-emergency" style={labelStyle}>Emergency Contact</label>
                    <input id="profile-emergency" type="text" className="input-field" placeholder="+1-555-123-4567" value={form.emergencyContact} onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })} />
                  </div>
                </>
              )}

              {isProvider && (
                <>
                  <div>
                    <label htmlFor="profile-title" style={labelStyle}>Title (e.g. MD, MBBS)</label>
                    <input id="profile-title" type="text" className="input-field" placeholder="MD" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="profile-specialization" style={labelStyle}>Specialization</label>
                    <input id="profile-specialization" type="text" className="input-field" placeholder="Cardiology" value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="profile-hospital" style={labelStyle}>Hospital / Clinic Name</label>
                    <input id="profile-hospital" type="text" className="input-field" placeholder="City General Hospital" value={form.hospitalName} onChange={(e) => setForm({ ...form, hospitalName: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="profile-department" style={labelStyle}>Department</label>
                    <input id="profile-department" type="text" className="input-field" placeholder="Cardiology" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="profile-work-phone" style={labelStyle}>Work Phone</label>
                    <input id="profile-work-phone" type="text" className="input-field" placeholder="+1-555-000-0000" value={form.workPhone} onChange={(e) => setForm({ ...form, workPhone: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="profile-work-email" style={labelStyle}>Professional Email</label>
                    <input id="profile-work-email" type="email" className="input-field" placeholder="dr.name@hospital.com" value={form.workEmail} onChange={(e) => setForm({ ...form, workEmail: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="profile-clinic-address" style={labelStyle}>Clinic Address</label>
                    <input id="profile-clinic-address" type="text" className="input-field" placeholder="Building A, Floor 3" value={form.clinicAddress} onChange={(e) => setForm({ ...form, clinicAddress: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="profile-license" style={labelStyle}>Medical License Number</label>
                    <input id="profile-license" type="text" className="input-field" placeholder="MED-12345-XX" value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} />
                  </div>
                </>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" className="btn btn-primary" disabled={saving} id="save-profile-button">
                {saving ? <span className="spinner" /> : '💾 Save Changes'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </form>
        </div>
      ) : (
        /* ── Read-Only Cards ───────────────────────── */
        <div className="glass-card" style={{ padding: '32px' }}>
          {/* Identity Card Header */}
          <div className="identity-card-header">
            <div className="identity-avatar">{initials}</div>
            <div>
              <div className="identity-name">
                {isProvider && profile?.title ? `Dr. ${displayName}` : displayName}
              </div>
              {isProvider && profile?.specialization && (
                <div className="specialty-tag">{profile.specialization}</div>
              )}
              <span className={`role-badge ${isProvider ? 'role-badge-provider' : 'role-badge-patient'}`}>
                {user?.role}
              </span>
              {isProvider && profile?.hospital_name && (
                <div className="hospital-badge" style={{ marginTop: '6px' }}>
                  🏥 {profile.hospital_name}
                  {profile?.department && <span> · {profile.department}</span>}
                </div>
              )}
            </div>
          </div>

          {/* Two-column grid */}
          <div className="profile-grid">
            {/* Column 1 */}
            <div className="profile-section">
              <div className="profile-section-title">
                {isProvider ? 'Professional Details' : 'Personal Information'}
              </div>

              {isProvider ? (
                <>
                  <FieldView label="Title" value={profile?.title} />
                  <FieldView label="Specialization" value={profile?.specialization} />
                  <FieldView label="Hospital" value={profile?.hospital_name} />
                  <FieldView label="Department" value={profile?.department} />
                  <FieldView label="License Number" value={profile?.license_number} />
                  <FieldView label="Clinic Address" value={profile?.clinic_address} />
                </>
              ) : (
                <>
                  <FieldView label="Date of Birth" value={dobFormatted} />
                  <FieldView label="Gender" value={profile?.gender} />
                  <FieldView label="Phone" value={profile?.phone} />
                  <FieldView label="Address" value={profile?.address} />
                </>
              )}
            </div>

            {/* Column 2 */}
            <div className="profile-section">
              <div className="profile-section-title">
                {isProvider ? 'Contact Information' : 'Clinical Data'}
              </div>

              {isProvider ? (
                <>
                  {showContact ? (
                    <div className="contact-details">
                      <div className="contact-item">📞 {profile?.work_phone || 'Not provided'}</div>
                      <div className="contact-item">✉️ {profile?.work_email || 'Not provided'}</div>
                      <div className="contact-item">📍 {profile?.clinic_address || 'Not provided'}</div>
                    </div>
                  ) : (
                    <button className="contact-reveal-btn" onClick={() => setShowContact(true)} id="reveal-contact-btn">
                      📞 Show Contact Details
                    </button>
                  )}
                </>
              ) : (
                <>
                  <FieldView label="Blood Group" value={profile?.blood_group} />
                  <FieldView label="Allergies" value={allergyStr} />
                  <FieldView label="Chronic Conditions" value={conditionsStr} />
                  <FieldView label="Emergency Contact" value={profile?.emergency_contact} />
                </>
              )}
            </div>
          </div>
        </div>
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

export default Profile;
