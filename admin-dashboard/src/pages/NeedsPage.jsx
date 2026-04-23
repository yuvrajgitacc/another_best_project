import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { needs } from '../services/api';

export default function NeedsPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ category: '', status: '', search: '' });
  const navigate = useNavigate();

  useEffect(() => { loadNeeds(); }, [filters.category, filters.status]);

  async function loadNeeds() {
    setLoading(true);
    try {
      const params = {};
      if (filters.category) params.category = filters.category;
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;
      const res = await needs.list(params);
      setData(res);
    } catch (err) {
      console.error('Failed to load needs:', err);
    }
    setLoading(false);
  }

  function handleSearch(e) {
    e.preventDefault();
    loadNeeds();
  }

  const urgencyBars = (level) => {
    return (
      <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
        {[1,2,3,4,5].map(i => (
          <div key={i} style={{
            width: '8px', height: '14px', borderRadius: '2px',
            background: i <= level
              ? level >= 4 ? 'var(--accent-red)' : level >= 3 ? 'var(--accent-amber)' : 'var(--accent-green)'
              : 'var(--bg-input)',
          }}></div>
        ))}
        <span style={{ fontSize: '11px', marginLeft: '4px', color: 'var(--text-muted)' }}>{level}/5</span>
      </div>
    );
  };

  const catIcons = { medical: '🏥', food: '🍚', shelter: '🏠', water: '💧', rescue: '🚨', education: '📚', clothing: '👕', sanitation: '🧹', other: '📋' };

  return (
    <>
      <div className="page-header">
        <div><h2>Need Tracker</h2><div className="subtitle">{data.length} community needs</div></div>
      </div>

      <div className="page-body">
        {/* Filters */}
        <div className="filter-bar">
          <select className="form-select" value={filters.category} onChange={e => setFilters({ ...filters, category: e.target.value })}>
            <option value="">All Categories</option>
            {['medical','food','shelter','water','rescue','education','clothing','sanitation','other'].map(c => (
              <option key={c} value={c}>{catIcons[c]} {c}</option>
            ))}
          </select>
          <select className="form-select" value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All Status</option>
            {['open','assigned','in_progress','resolved','cancelled'].map(s => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
            <input className="form-input" placeholder="Search needs..." value={filters.search}
              onChange={e => setFilters({ ...filters, search: e.target.value })} />
            <button type="submit" className="btn btn-primary btn-sm">Search</button>
          </form>
        </div>

        {/* Table */}
        {loading ? (
          <div className="loading"><div className="spinner"></div> Loading...</div>
        ) : data.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <p>No needs found matching your filters.</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Urgency</th>
                  <th>Status</th>
                  <th>Affected</th>
                  <th>Source</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {data.map(need => (
                  <tr key={need.id}>
                    <td>
                      <div style={{ fontWeight: 600, maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {need.title}
                      </div>
                      {need.address && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{need.address}</div>}
                    </td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {catIcons[need.category] || '📋'} {need.category}
                      </span>
                    </td>
                    <td>{urgencyBars(need.urgency)}</td>
                    <td><span className={`badge badge-${need.status}`}>{need.status.replace('_', ' ')}</span></td>
                    <td>{need.people_affected}</td>
                    <td><span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{need.source}</span></td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(need.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      {need.status === 'open' && (
                        <button className="btn btn-primary btn-sm" onClick={() => navigate(`/matching/${need.id}`)}>
                          🧠 Match
                        </button>
                      )}
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
