import { useState, useEffect } from 'react';
import { volunteers } from '../services/api';

export default function VolunteersPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => { loadVolunteers(); }, [filter]);

  async function loadVolunteers() {
    setLoading(true);
    try {
      const params = {};
      if (filter) params.availability = filter;
      const res = await volunteers.list(params);
      setData(res);
    } catch (err) {
      console.error('Failed to load volunteers:', err);
    }
    setLoading(false);
  }

  return (
    <>
      <div className="page-header">
        <div><h2>Volunteers</h2><div className="subtitle">{data.length} registered volunteers</div></div>
      </div>

      <div className="page-body">
        <div className="filter-bar">
          <select className="form-select" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="available">🟢 Available</option>
            <option value="busy">🟡 Busy</option>
            <option value="offline">⚫ Offline</option>
          </select>
        </div>

        {loading ? (
          <div className="loading"><div className="spinner"></div> Loading...</div>
        ) : data.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🙋</div>
            <p>No volunteers found.</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Skills</th>
                  <th>Vehicle</th>
                  <th>Status</th>
                  <th>Tasks Done</th>
                  <th>Rating</th>
                  <th>Location</th>
                </tr>
              </thead>
              <tbody>
                {data.map(vol => (
                  <tr key={vol.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{vol.user_name || 'Unknown'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{vol.user_email}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {(vol.skills || []).slice(0, 3).map(s => (
                          <span key={s} style={{
                            fontSize: '10px', padding: '2px 8px', borderRadius: '12px',
                            background: 'rgba(59,130,246,0.15)', color: 'var(--accent-blue)',
                          }}>{s}</span>
                        ))}
                        {(vol.skills || []).length > 3 && (
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>+{vol.skills.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td>{vol.has_vehicle ? `🚗 ${vol.vehicle_type || ''}` : '—'}</td>
                    <td><span className={`badge badge-${vol.availability}`}>{vol.availability}</span></td>
                    <td>{vol.tasks_completed}</td>
                    <td>
                      <span style={{ color: vol.rating >= 4 ? 'var(--accent-green)' : 'var(--text-secondary)' }}>
                        ⭐ {vol.rating?.toFixed(1) || '0.0'}
                      </span>
                    </td>
                    <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {vol.address || (vol.latitude ? `${vol.latitude?.toFixed(3)}, ${vol.longitude?.toFixed(3)}` : '—')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
