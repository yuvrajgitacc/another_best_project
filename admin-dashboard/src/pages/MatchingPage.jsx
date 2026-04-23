import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { matching, needs as needsApi } from '../services/api';

export default function MatchingPage() {
  const { needId } = useParams();
  const navigate = useNavigate();
  const [allNeeds, setAllNeeds] = useState([]);
  const [selectedNeed, setSelectedNeed] = useState(needId || '');
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(null);

  useEffect(() => {
    needsApi.list({ status: 'open' }).then(setAllNeeds).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedNeed) loadSuggestions(selectedNeed);
  }, [selectedNeed]);

  async function loadSuggestions(nid) {
    setLoading(true);
    try {
      const res = await matching.getSuggestions(nid);
      setSuggestions(res);
    } catch (err) {
      console.error('Matching failed:', err);
      alert('Failed to get matches: ' + err.message);
    }
    setLoading(false);
  }

  async function handleAssign(volunteerId) {
    if (!selectedNeed) return;
    setAssigning(volunteerId);
    try {
      await matching.assign({ need_id: selectedNeed, volunteer_id: volunteerId });
      alert('Volunteer assigned successfully!');
      // Reload
      loadSuggestions(selectedNeed);
    } catch (err) {
      alert('Assignment failed: ' + err.message);
    }
    setAssigning(null);
  }

  function scoreClass(score) {
    if (score >= 70) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  return (
    <>
      <div className="page-header">
        <div><h2>🧠 Smart Matching</h2><div className="subtitle">AI-powered volunteer-to-need matching</div></div>
      </div>

      <div className="page-body">
        {/* Need Selector */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header"><span className="card-title">Select a Need to Match</span></div>
          <select className="form-select" value={selectedNeed}
            onChange={e => { setSelectedNeed(e.target.value); navigate(`/matching/${e.target.value}`, { replace: true }); }}>
            <option value="">-- Select an open need --</option>
            {allNeeds.map(n => (
              <option key={n.id} value={n.id}>
                [{n.category}] {n.title} (Urgency: {n.urgency}/5)
              </option>
            ))}
          </select>
        </div>

        {/* Results */}
        {loading && <div className="loading"><div className="spinner"></div> Finding best matches...</div>}

        {suggestions && !loading && (
          <>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '16px' }}>
                  Matches for: <span style={{ color: 'var(--accent-blue)' }}>{suggestions.need_title}</span>
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Category: {suggestions.need_category} · {suggestions.total_available} volunteers available
                </div>
              </div>
            </div>

            {suggestions.suggestions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">😕</div>
                <p>No matching volunteers found. Try broadening the search radius.</p>
              </div>
            ) : (
              <div>
                {suggestions.suggestions.map((match, i) => (
                  <div className="match-card" key={match.volunteer.id}>
                    <div style={{ textAlign: 'center', minWidth: '40px' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700 }}>#{i + 1}</div>
                    </div>

                    <div className={`match-score ${scoreClass(match.match_score)}`}>
                      {Math.round(match.match_score)}
                    </div>

                    <div className="match-details">
                      <h4>{match.volunteer.user_name}</h4>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        {(match.volunteer.skills || []).map(s => (
                          <span key={s} style={{
                            fontSize: '10px', padding: '1px 8px', borderRadius: '10px',
                            background: 'rgba(59,130,246,0.12)', color: 'var(--accent-blue)',
                          }}>{s}</span>
                        ))}
                      </div>
                      <div className="match-reasons">
                        {match.reasons.map((r, j) => <span key={j}>{r}</span>)}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', minWidth: '80px' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{match.distance_km.toFixed(1)} km</div>
                      <button className="btn btn-primary btn-sm"
                        onClick={() => handleAssign(match.volunteer.id)}
                        disabled={assigning === match.volunteer.id}>
                        {assigning === match.volunteer.id ? '...' : '✅ Assign'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
