import { useState } from 'react';
import { broadcast } from '../services/api';

export default function BroadcastPage() {
  const [form, setForm] = useState({
    title: '',
    message: '',
    category: '',
    urgency: 3,
    latitude: 19.076,
    longitude: 72.878,
    radius_km: 5,
  });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  async function handleSend(e) {
    e.preventDefault();
    if (!form.title || !form.message) return alert('Title and message required');

    setSending(true);
    try {
      const payload = { ...form };
      if (payload.category) payload.category = payload.category;
      else delete payload.category;

      const res = await broadcast.send(payload);
      setResult(res);
      setForm({ ...form, title: '', message: '' });
    } catch (err) {
      alert('Broadcast failed: ' + err.message);
    }
    setSending(false);
  }

  async function loadHistory() {
    try {
      const res = await broadcast.list();
      setHistory(res);
      setHistoryLoaded(true);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <>
      <div className="page-header">
        <div><h2>📡 Broadcast Tool</h2><div className="subtitle">Send emergency alerts to volunteers in a radius</div></div>
      </div>

      <div className="page-body">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Send Form */}
          <div className="card">
            <div className="card-header"><span className="card-title">New Broadcast</span></div>
            <form onSubmit={handleSend}>
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Emergency: Flood Alert in Sector 5" />
              </div>
              <div className="form-group">
                <label className="form-label">Message *</label>
                <textarea className="form-input" rows={4} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="All volunteers within the area are requested to report immediately..." />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                    <option value="">Any</option>
                    {['medical','food','shelter','water','rescue','education','clothing','sanitation'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Urgency</label>
                  <select className="form-select" value={form.urgency} onChange={e => setForm({ ...form, urgency: parseInt(e.target.value) })}>
                    {[1,2,3,4,5].map(u => <option key={u} value={u}>{u} — {['Low','Moderate','High','Critical','EMERGENCY'][u-1]}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Latitude</label>
                  <input type="number" step="any" className="form-input" value={form.latitude} onChange={e => setForm({ ...form, latitude: parseFloat(e.target.value) })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Longitude</label>
                  <input type="number" step="any" className="form-input" value={form.longitude} onChange={e => setForm({ ...form, longitude: parseFloat(e.target.value) })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Radius (km)</label>
                  <input type="number" step="0.5" className="form-input" value={form.radius_km} onChange={e => setForm({ ...form, radius_km: parseFloat(e.target.value) })} />
                </div>
              </div>
              <button type="submit" className="btn btn-danger btn-lg" disabled={sending} style={{ width: '100%' }}>
                {sending ? '📡 Sending...' : '🚨 Send Broadcast'}
              </button>
            </form>
          </div>

          {/* Result & History */}
          <div>
            {result && (
              <div className="card" style={{ marginBottom: '16px', borderColor: 'var(--accent-green)' }}>
                <div className="card-header"><span className="card-title">✅ Broadcast Sent</span></div>
                <p style={{ fontSize: '14px' }}>
                  <strong>{result.title}</strong><br/>
                  Sent to <strong>{result.recipients_count}</strong> volunteers within {result.radius_km}km
                </p>
              </div>
            )}

            <div className="card">
              <div className="card-header">
                <span className="card-title">History</span>
                {!historyLoaded && <button className="btn btn-outline btn-sm" onClick={loadHistory}>Load</button>}
              </div>
              {history.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {history.map(b => (
                    <div key={b.id} style={{ padding: '8px 12px', background: 'var(--bg-input)', borderRadius: '8px', fontSize: '13px' }}>
                      <div style={{ fontWeight: 600 }}>{b.title}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                        {b.recipients_count} recipients · {b.radius_km}km · {new Date(b.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state" style={{ padding: '20px' }}>
                  {historyLoaded ? 'No broadcasts yet.' : 'Click Load to see history.'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
