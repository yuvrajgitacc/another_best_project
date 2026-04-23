import { useState, useEffect } from 'react';
import { volunteer, assignments } from '../services/api';

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [filter, setFilter] = useState('');

  useEffect(() => { loadTasks(); }, [filter]);

  async function loadTasks() {
    setLoading(true);
    try {
      const prof = await volunteer.getMyProfile();
      setProfile(prof);
      const params = {};
      if (filter) params.status = filter;
      const t = await volunteer.getMyTasks(prof.id, params);
      setTasks(t);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  async function handleAction(taskId, action) {
    try {
      const data = { status: action };
      if (action === 'completed') {
        data.feedback = 'Task completed successfully';
        data.rating = 5;
      }
      await assignments.updateStatus(taskId, data);
      loadTasks();
    } catch (err) {
      alert('Failed: ' + err.message);
    }
  }

  const catIcons = { medical: '🏥', food: '🍚', shelter: '🏠', water: '💧', rescue: '🚨', education: '📚', clothing: '👕', sanitation: '🧹', other: '📋' };

  return (
    <>
      <div className="vol-page-header">
        <h1>My Tasks</h1>
        <div className="subtitle">{tasks.length} {filter || 'total'} tasks</div>
      </div>

      <div className="vol-page">
        {/* Filters */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
          {['', 'assigned', 'accepted', 'in_progress', 'completed'].map(s => (
            <button key={s} className={`vol-btn ${filter === s ? 'primary' : 'outline'}`}
              style={{ flex: 'none', padding: '6px 14px', fontSize: '12px', width: 'auto' }}
              onClick={() => setFilter(s)}>
              {s || 'All'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="vol-loading"><div className="vol-spinner"></div> Loading...</div>
        ) : tasks.length === 0 ? (
          <div className="vol-card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            <p>No tasks found.</p>
          </div>
        ) : (
          tasks.map(task => (
            <div className="vol-card" key={task.id}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div className="task-icon" style={{ background: 'rgba(59,130,246,0.15)' }}>
                  {catIcons[task.need_category] || '📋'}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 600 }}>{task.need_title}</h3>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {task.need_category} · {task.distance_km?.toFixed(1)} km · Score: {task.match_score?.toFixed(0)}
                  </div>
                  <span className={`vol-badge ${task.status}`} style={{ marginTop: '6px' }}>{task.status.replace('_', ' ')}</span>
                </div>
              </div>

              {/* Action Buttons */}
              {task.status === 'assigned' && (
                <div className="action-btns">
                  <button className="vol-btn success" onClick={() => handleAction(task.id, 'accepted')}>✅ Accept</button>
                  <button className="vol-btn danger" onClick={() => handleAction(task.id, 'rejected')}>✖ Reject</button>
                </div>
              )}
              {task.status === 'accepted' && (
                <div className="action-btns">
                  <button className="vol-btn primary" onClick={() => handleAction(task.id, 'in_progress')}>🚀 Start</button>
                </div>
              )}
              {task.status === 'in_progress' && (
                <div className="action-btns">
                  <button className="vol-btn success" onClick={() => handleAction(task.id, 'completed')}>✅ Complete</button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}
