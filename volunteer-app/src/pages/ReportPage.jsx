import { useState } from 'react';
import { needs } from '../services/api';

export default function ReportPage() {
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'other',
    urgency: 3,
    latitude: 0,
    longitude: 0,
    address: '',
    people_affected: 1,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [locLoading, setLocLoading] = useState(false);

  function detectLocation() {
    if (!navigator.geolocation) return alert('Geolocation not supported');
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm({ ...form, latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setLocLoading(false);
      },
      (err) => {
        alert('Location error: ' + err.message);
        setLocLoading(false);
      },
      { enableHighAccuracy: true }
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title) return alert('Title is required');
    if (!form.latitude || !form.longitude) return alert('Please detect your location');

    setSubmitting(true);
    try {
      await needs.create(form);
      setSubmitted(true);
      setForm({ title: '', description: '', category: 'other', urgency: 3, latitude: 0, longitude: 0, address: '', people_affected: 1 });
    } catch (err) {
      alert('Failed: ' + err.message);
    }
    setSubmitting(false);
  }

  if (submitted) {
    return (
      <>
        <div className="vol-page-header"><h1>Report Need</h1></div>
        <div className="vol-page" style={{ textAlign: 'center', paddingTop: '40px' }}>
          <div style={{ fontSize: '4rem', marginBottom: '16px' }}>✅</div>
          <h2 style={{ marginBottom: '8px' }}>Need Reported!</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Thank you. Your report has been submitted and will be reviewed.
          </p>
          <button className="vol-btn primary" style={{ maxWidth: '250px', margin: '0 auto' }} onClick={() => setSubmitted(false)}>
            Report Another
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="vol-page-header">
        <h1>🆘 Report a Need</h1>
        <div className="subtitle">Help us identify community needs</div>
      </div>

      <div className="vol-page">
        <form onSubmit={handleSubmit}>
          <div className="vol-form-group">
            <label className="vol-form-label">What's needed? *</label>
            <input className="vol-form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="e.g., 10 food packets needed in Sector 5" />
          </div>

          <div className="vol-form-group">
            <label className="vol-form-label">Details</label>
            <textarea className="vol-form-input" rows={3} value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Describe the situation..." />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="vol-form-group">
              <label className="vol-form-label">Category</label>
              <select className="vol-form-input" value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}>
                {['medical','food','shelter','water','rescue','education','clothing','sanitation','other'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="vol-form-group">
              <label className="vol-form-label">Urgency (1-5)</label>
              <select className="vol-form-input" value={form.urgency}
                onChange={e => setForm({ ...form, urgency: parseInt(e.target.value) })}>
                {[1,2,3,4,5].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div className="vol-form-group">
            <label className="vol-form-label">People Affected</label>
            <input type="number" className="vol-form-input" min="1" value={form.people_affected}
              onChange={e => setForm({ ...form, people_affected: parseInt(e.target.value) || 1 })} />
          </div>

          <div className="vol-form-group">
            <label className="vol-form-label">Address / Landmark</label>
            <input className="vol-form-input" value={form.address}
              onChange={e => setForm({ ...form, address: e.target.value })}
              placeholder="Gokuldham Society, Sector 5" />
          </div>

          <div className="vol-form-group">
            <label className="vol-form-label">Location</label>
            <button type="button" className="vol-btn outline" onClick={detectLocation} disabled={locLoading}>
              {locLoading ? '📍 Detecting...' : form.latitude ? `📍 ${form.latitude.toFixed(4)}, ${form.longitude.toFixed(4)}` : '📍 Detect My Location'}
            </button>
          </div>

          <button type="submit" className="vol-btn primary" disabled={submitting}>
            {submitting ? 'Submitting...' : '🆘 Submit Report'}
          </button>
        </form>
      </div>
    </>
  );
}
