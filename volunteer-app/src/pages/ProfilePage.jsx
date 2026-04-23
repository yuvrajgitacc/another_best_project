import { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { volunteer } from '../services/api';

const ALL_SKILLS = [
  'medical', 'first_aid', 'nursing', 'cooking', 'driving',
  'logistics', 'construction', 'teaching', 'counseling',
  'swimming', 'cleaning', 'it_support', 'translation',
  'childcare', 'elderly_care', 'mental_health',
];

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    phone: '',
    skills: [],
    has_vehicle: false,
    vehicle_type: 'none',
    address: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const prof = await volunteer.getMyProfile();
      setProfile(prof);
      setForm({
        phone: prof.phone || '',
        skills: prof.skills || [],
        has_vehicle: prof.has_vehicle,
        vehicle_type: prof.vehicle_type || 'none',
        address: prof.address || '',
      });
    } catch {
      // Profile not set up yet
    }
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const data = { ...form };
      if (!data.has_vehicle) data.vehicle_type = 'none';

      // Detect location
      if (navigator.geolocation) {
        try {
          const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true }));
          data.latitude = pos.coords.latitude;
          data.longitude = pos.coords.longitude;
        } catch { /* location optional */ }
      }

      await volunteer.setup(data);
      await loadProfile();
      alert('Profile saved!');
    } catch (err) {
      alert('Save failed: ' + err.message);
    }
    setSaving(false);
  }

  async function toggleAvailability(status) {
    if (!profile) return;
    try {
      await volunteer.updateAvailability(profile.id, { availability: status });
      loadProfile();
    } catch (err) {
      alert(err.message);
    }
  }

  function toggleSkill(skill) {
    const skills = form.skills.includes(skill)
      ? form.skills.filter(s => s !== skill)
      : [...form.skills, skill];
    setForm({ ...form, skills });
  }

  if (loading) return <div className="vol-loading"><div className="vol-spinner"></div></div>;

  return (
    <>
      <div className="vol-page-header">
        <h1>My Profile</h1>
        <div className="subtitle">{user?.email}</div>
      </div>

      <div className="vol-page">
        {/* Availability Toggle */}
        {profile && (
          <div className="vol-card">
            <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-secondary)' }}>Status</div>
            <div className="availability-toggle">
              {['available', 'busy', 'offline'].map(s => (
                <button key={s} className={profile.availability === s ? 'active' : ''}
                  onClick={() => toggleAvailability(s)}>
                  {s === 'available' ? '🟢' : s === 'busy' ? '🟡' : '⚫'} {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Phone */}
        <div className="vol-form-group">
          <label className="vol-form-label">Phone</label>
          <input className="vol-form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
            placeholder="+91-9876543210" />
        </div>

        {/* Skills */}
        <div className="vol-form-group">
          <label className="vol-form-label">Skills ({form.skills.length} selected)</label>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {ALL_SKILLS.map(skill => (
              <button key={skill} type="button" onClick={() => toggleSkill(skill)}
                style={{
                  padding: '4px 12px', borderRadius: '16px', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  background: form.skills.includes(skill) ? 'rgba(59,130,246,0.3)' : 'var(--bg-input)',
                  color: form.skills.includes(skill) ? 'var(--accent-blue)' : 'var(--text-muted)',
                }}>
                {skill.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Vehicle */}
        <div className="vol-form-group">
          <label className="vol-form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="checkbox" checked={form.has_vehicle} onChange={e => setForm({ ...form, has_vehicle: e.target.checked })} />
            I have a vehicle
          </label>
          {form.has_vehicle && (
            <select className="vol-form-input" value={form.vehicle_type}
              onChange={e => setForm({ ...form, vehicle_type: e.target.value })} style={{ marginTop: '8px' }}>
              <option value="bike">Bike</option>
              <option value="car">Car</option>
              <option value="van">Van</option>
              <option value="truck">Truck</option>
            </select>
          )}
        </div>

        {/* Address */}
        <div className="vol-form-group">
          <label className="vol-form-label">Address</label>
          <input className="vol-form-input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
            placeholder="Your locality" />
        </div>

        {/* Save */}
        <button className="vol-btn primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : '💾 Save Profile'}
        </button>

        {/* Logout */}
        <button className="vol-btn outline" onClick={logout} style={{ marginTop: '12px' }}>
          Logout
        </button>
      </div>
    </>
  );
}
