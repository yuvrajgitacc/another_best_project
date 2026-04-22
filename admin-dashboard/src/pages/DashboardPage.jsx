import { useState, useEffect, useRef } from 'react';
import { analytics } from '../services/api';

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [categories, setCategories] = useState([]);
  const [impact, setImpact] = useState(null);
  const [aiSummary, setAiSummary] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    loadData();
    // Real-time polling — refresh every 30 seconds
    pollRef.current = setInterval(() => { loadData(true); }, 30000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  async function loadData(silent = false) {
    if (!silent) setLoading(true);
    try {
      const [sum, cats, imp] = await Promise.all([
        analytics.getSummary(),
        analytics.getCategories(),
        analytics.getImpact(7),
      ]);
      setSummary(sum);
      setCategories(cats);
      setImpact(imp);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    }
    if (!silent) setLoading(false);
  }

  async function loadAISummary() {
    setAiLoading(true);
    try {
      const res = await analytics.getAISummary();
      setAiSummary(res);
    } catch (err) {
      setAiSummary({ summary: 'AI analysis unavailable — check Gemini API key or rate limits.', needs_analyzed: 0 });
    }
    setAiLoading(false);
  }

  if (loading) {
    return (
      <>
        <div className="page-header">
          <div><h2>Dashboard</h2><div className="subtitle">Command center overview</div></div>
        </div>
        <div className="page-body"><div className="loading"><div className="spinner"></div> Loading dashboard...</div></div>
      </>
    );
  }

  const s = summary || {};

  const statCards = [
    { icon: '📋', label: 'Total Needs', value: s.total_needs || 0, color: 'blue' },
    { icon: '🔴', label: 'Open Needs', value: s.open_needs || 0, color: 'red' },
    { icon: '✅', label: 'Resolved', value: s.resolved_needs || 0, color: 'green' },
    { icon: '🙋', label: 'Total Volunteers', value: s.total_volunteers || 0, color: 'purple' },
    { icon: '🟢', label: 'Active Volunteers', value: s.active_volunteers || 0, color: 'green' },
    { icon: '👥', label: 'People Helped', value: s.people_helped || 0, color: 'cyan' },
  ];

  const catIcons = { medical: '🏥', food: '🍚', shelter: '🏠', water: '💧', rescue: '🚨', education: '📚', clothing: '👕', sanitation: '🧹', other: '📋' };
  const catColors = { medical: '#EF4444', food: '#F97316', shelter: '#3B82F6', water: '#06B6D4', rescue: '#A855F7', education: '#10B981', clothing: '#EAB308', sanitation: '#14B8A6', other: '#6B7280' };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <div className="subtitle">
            Real-time command center for volunteer coordination
            {lastUpdated && (
              <span style={{ marginLeft: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
                🟢 Live • Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => loadData()}>↻ Refresh</button>
      </div>

      <div className="page-body">
        {/* Stats Grid */}
        <div className="stats-grid">
          {statCards.map((card, i) => (
            <div className="stat-card" key={i}>
              <div className={`stat-icon ${card.color}`}>{card.icon}</div>
              <div className="stat-info">
                <h3>{card.value}</h3>
                <div className="stat-label">{card.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* AI Summary Section */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="card-title">🤖 AI Situation Analysis</span>
            <button
              className="btn btn-sm btn-primary"
              onClick={loadAISummary}
              disabled={aiLoading}
              style={{ fontSize: '12px' }}
            >
              {aiLoading ? '🔄 Analyzing...' : aiSummary ? '↻ Refresh Analysis' : '🧠 Generate AI Analysis'}
            </button>
          </div>
          {aiSummary ? (
            <div style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--text-primary)' }}>
              <p style={{ margin: '0 0 8px' }}>{aiSummary.summary}</p>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                Based on {aiSummary.needs_analyzed} active needs • Powered by Gemini AI
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Click "Generate AI Analysis" to get Gemini's situation analysis with priority recommendations.
            </div>
          )}
        </div>

        {/* Impact Dashboard + Category Breakdown */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>

          {/* Impact Dashboard */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">📊 7-Day Impact Report</span>
            </div>
            {impact ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(16,185,129,0.1)', borderRadius: '10px' }}>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--accent-green)' }}>{impact.people_helped}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>People Helped</div>
                </div>
                <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(59,130,246,0.1)', borderRadius: '10px' }}>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: '#3B82F6' }}>{impact.needs_resolved}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Needs Resolved</div>
                </div>
                <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(168,85,247,0.1)', borderRadius: '10px' }}>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: '#A855F7' }}>{impact.avg_response_hours}h</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Avg Response</div>
                </div>
                <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(239,68,68,0.1)', borderRadius: '10px' }}>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: '#EF4444' }}>{impact.critical_open_needs}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Critical Open</div>
                </div>

                {/* Bottom row stats */}
                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', fontSize: '12px', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>📋 {impact.needs_created} needs reported</span>
                  <span style={{ color: 'var(--text-muted)' }}>🙋 {impact.active_volunteers} active volunteers</span>
                  <span style={{ color: 'var(--accent-green)' }}>✅ {impact.resolution_rate}% resolved</span>
                </div>

                {/* Top categories */}
                {impact.top_categories?.length > 0 && (
                  <div style={{ gridColumn: '1 / -1', fontSize: '12px', color: 'var(--text-muted)' }}>
                    Top needs: {impact.top_categories.map(c =>
                      `${catIcons[c.category] || '📋'} ${c.category} (${c.count})`
                    ).join(' • ')}
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '20px' }}>Loading impact data...</div>
            )}
          </div>

          {/* Category Breakdown */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Needs by Category</span>
            </div>
            {categories.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px' }}>No data yet</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {categories.map(cat => {
                  const maxCount = Math.max(...categories.map(c => c.count), 1);
                  const pct = (cat.count / maxCount) * 100;
                  return (
                    <div key={cat.category}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                        <span>{catIcons[cat.category] || '📋'} {cat.category}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{cat.count} ({cat.open_count} open)</span>
                      </div>
                      <div style={{ height: '6px', background: 'var(--bg-input)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: catColors[cat.category] || '#6B7280', borderRadius: '3px', transition: 'width 0.5s ease' }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Performance Metrics</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 700 }}>{s.avg_response_time_hours ? `${s.avg_response_time_hours}h` : '—'}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Avg Response Time</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 700 }}>{s.in_progress_needs || 0}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>In Progress</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 700 }}>{s.completed_assignments || 0}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Completed Tasks</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 700 }}>{s.busy_volunteers || 0}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Busy Volunteers</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent-green)' }}>
                {s.total_needs > 0 ? `${Math.round((s.resolved_needs / s.total_needs) * 100)}%` : '—'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Resolution Rate</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
