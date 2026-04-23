import { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { volunteer } from '../services/api';

export default function HomePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const prof = await volunteer.getMyProfile();
      setProfile(prof);
      const t = await volunteer.getMyTasks(prof.id, { status: 'assigned' });
      setTasks(t);
    } catch (err) {
      console.log('Profile not set up yet:', err.message);
    }
    setLoading(false);
  }

  const catIcons = { medical: '🏥', food: '🍚', shelter: '🏠', water: '💧', rescue: '🚨', education: '📚', clothing: '👕', sanitation: '🧹', other: '📋' };

  if (loading) return <div className="vol-loading"><div className="vol-spinner"></div>Loading...</div>;

  return (
    <>
      <div className="vol-page-header">
        <h1>Hi, {user?.name?.split(' ')[0] || 'Volunteer'} 👋</h1>
        <div className="subtitle">
          {profile ? (
            <span className={`vol-badge ${profile.availability}`}>{profile.availability}</span>
          ) : 'Set up your profile to get started'}
        </div>
      </div>

      <div className="vol-page">
        {/* Stats */}
        {profile && (
          <div className="vol-stat-row">
            <div className="vol-stat">
              <div className="num" style={{ color: 'var(--accent-blue)' }}>{profile.tasks_completed}</div>
              <div className="label">Tasks Done</div>
            </div>
            <div className="vol-stat">
              <div className="num" style={{ color: 'var(--accent-amber)' }}>⭐ {profile.rating?.toFixed(1) || '0.0'}</div>
              <div className="label">Rating</div>
            </div>
          </div>
        )}

        {/* Active Tasks */}
        <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>
          📋 Active Tasks {tasks.length > 0 && `(${tasks.length})`}
        </h3>

        {tasks.length === 0 ? (
          <div className="vol-card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>✅</div>
            <p>No active tasks. You're all caught up!</p>
          </div>
        ) : (
          tasks.map(task => (
            <div className="task-card" key={task.id}>
              <div className="task-icon" style={{ background: 'rgba(59,130,246,0.15)' }}>
                {catIcons[task.need_category] || '📋'}
              </div>
              <div className="task-info" style={{ flex: 1 }}>
                <h3>{task.need_title || 'Task'}</h3>
                <div className="task-meta">
                  {task.need_category} · {task.distance_km?.toFixed(1)} km away
                </div>
                <span className={`vol-badge ${task.status}`}>{task.status}</span>
              </div>
            </div>
          ))
        )}

        {/* Quick Actions */}
        <h3 style={{ fontSize: '16px', margin: '20px 0 12px' }}>⚡ Quick Actions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <button className="vol-btn outline" onClick={() => window.location.href = '/report'}>🆘 Report Need</button>
          <button className="vol-btn outline" onClick={() => window.location.href = '/profile'}>⚙️ My Profile</button>
        </div>
      </div>
    </>
  );
}
