import { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { volunteer } from '../services/api';
import { Hand, Star, ClipboardList, CheckCircle2, Zap, AlertTriangle, Settings, Stethoscope, Utensils, Home, Droplets, Siren, BookOpen, Shirt, Trash2, ArrowRight } from 'lucide-react';
import DisasterBanner from './DisasterBanner';

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

  const catIcons = { medical: Stethoscope, food: Utensils, shelter: Home, water: Droplets, rescue: Siren, education: BookOpen, clothing: Shirt, sanitation: Trash2, other: ClipboardList };

  if (loading) return <div className="vol-loading" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '12px' }}><div className="vol-spinner" style={{ width: '40px', height: '40px', borderWidth: '3px' }}></div><span style={{ fontSize: '18px', fontWeight: '600', color: 'var(--accent)' }}>Waking up systems...</span></div>;

  return (
    <>
      {/* Dynamic Header */}
      <div style={{
        padding: '20px 20px 24px',
        background: 'linear-gradient(135deg, var(--bg-card), var(--bg-primary))',
        borderBottom: '1px solid var(--border-color)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative background shapes */}
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'var(--accent)', borderRadius: '50%', filter: 'blur(50px)', opacity: 0.2 }} />
        <div style={{ position: 'absolute', bottom: '-20px', left: '10%', width: '80px', height: '80px', background: 'var(--accent-purple)', borderRadius: '50%', filter: 'blur(40px)', opacity: 0.15 }} />
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ 
            display: 'flex', alignItems: 'center', gap: '10px', 
            fontSize: '28px', fontWeight: 800, 
            background: 'linear-gradient(90deg, var(--text-primary), var(--accent))', 
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            marginBottom: '4px'
          }}>
            Hi, {user?.name?.split(' ')[0] || 'Volunteer'} <Hand size={28} color="#f59e0b" style={{ display: 'inline-block', animation: 'wave 2s infinite transform-origin: bottom center' }} />
          </h1>
          <div style={{ color: 'var(--text-secondary)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {profile ? (
              <span style={{
                background: profile.availability === 'available' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                color: profile.availability === 'available' ? 'var(--accent-green)' : 'var(--accent-amber)',
                padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
                border: `1px solid ${profile.availability === 'available' ? 'var(--accent-green)' : 'var(--accent-amber)'}40`,
                display: 'inline-flex', alignItems: 'center', gap: '6px'
              }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'currentColor', boxShadow: '0 0 8px currentColor' }} />
                {profile.availability.toUpperCase()}
              </span>
            ) : 'Set up your profile to get started'}
          </div>
        </div>
      </div>

      <div className="vol-page" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Disaster/Weather Alert */}
        <DisasterBanner />

        {/* Premium Stats Grid */}
        {profile && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{
              background: 'linear-gradient(145deg, rgba(59,130,246,0.1), rgba(37,99,235,0.05))',
              border: '1px solid rgba(59,130,246,0.2)',
              borderRadius: '20px', padding: '20px',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              boxShadow: '0 8px 32px rgba(59,130,246,0.1)',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{ fontSize: '36px', fontWeight: 900, color: 'var(--accent)', textShadow: '0 2px 10px rgba(59,130,246,0.3)' }}>
                {profile.tasks_completed}
              </div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '4px' }}>Tasks Done</div>
            </div>
            
            <div style={{
              background: 'linear-gradient(145deg, rgba(245,158,11,0.1), rgba(217,119,6,0.05))',
              border: '1px solid rgba(245,158,11,0.2)',
              borderRadius: '20px', padding: '20px',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              boxShadow: '0 8px 32px rgba(245,158,11,0.1)',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{ fontSize: '36px', fontWeight: 900, color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: '6px', textShadow: '0 2px 10px rgba(245,158,11,0.3)' }}>
                {profile.rating?.toFixed(1) || '0.0'}
                <Star size={24} fill="currentColor" style={{ filter: 'drop-shadow(0 0 4px currentColor)' }} />
              </div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '4px' }}>Rating</div>
            </div>
          </div>
        )}

        {/* Quick Actions (Modern Tiles) */}
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
            <Zap size={18} color="var(--accent-purple)" /> Quick Actions
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div 
              onClick={() => window.location.href = '/report'}
              style={{
                background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                borderRadius: '16px', padding: '16px', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', gap: '12px',
                transition: 'all 0.2s', boxShadow: 'var(--shadow-card)',
                position: 'relative', overflow: 'hidden'
              }}
              onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(239,68,68,0.1)', color: 'var(--accent-red)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={20} />
              </div>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>Report Need</div>
              <ArrowRight size={16} color="var(--text-muted)" style={{ position: 'absolute', bottom: '16px', right: '16px' }} />
            </div>

            <div 
              onClick={() => window.location.href = '/profile'}
              style={{
                background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                borderRadius: '16px', padding: '16px', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', gap: '12px',
                transition: 'all 0.2s', boxShadow: 'var(--shadow-card)',
                position: 'relative', overflow: 'hidden'
              }}
              onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(59,130,246,0.1)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Settings size={20} />
              </div>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>My Profile</div>
              <ArrowRight size={16} color="var(--text-muted)" style={{ position: 'absolute', bottom: '16px', right: '16px' }} />
            </div>
          </div>
        </div>

        {/* Active Tasks list */}
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
            <ClipboardList size={18} color="var(--accent)" /> Active Tasks {tasks.length > 0 && <span style={{ background: 'var(--accent)', color: '#fff', fontSize: '11px', padding: '2px 8px', borderRadius: '12px' }}>{tasks.length}</span>}
          </h3>

          {tasks.length === 0 ? (
            <div style={{ 
              background: 'linear-gradient(to right, rgba(16,185,129,0.05), transparent)', 
              border: '1px dashed var(--accent-green)', borderRadius: '16px', 
              padding: '32px 20px', textAlign: 'center', color: 'var(--text-secondary)' 
            }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16,185,129,0.1)', color: 'var(--accent-green)', marginBottom: '16px' }}>
                <CheckCircle2 size={32} />
              </div>
              <h4 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>All Caught Up!</h4>
              <p style={{ fontSize: '14px' }}>There are no active tasks assigned to you right now. Take a rest or check the map for new needs.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {tasks.map(task => {
                const CatIcon = catIcons[task.need_category] || ClipboardList;
                return (
                <div 
                  key={task.id}
                  style={{
                    background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                    borderRadius: '16px', padding: '16px', display: 'flex', gap: '16px',
                    boxShadow: 'var(--shadow-card)', position: 'relative', overflow: 'hidden'
                  }}
                >
                  <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '4px', background: 'var(--accent)' }} />
                  <div style={{ 
                    width: '48px', height: '48px', borderRadius: '14px', 
                    background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(37,99,235,0.05))', 
                    color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 
                  }}>
                    <CatIcon size={24} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 4px', color: 'var(--text-primary)' }}>{task.need_title || 'Emergency Task'}</h3>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ textTransform: 'capitalize' }}>{task.need_category}</span>
                      <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--border-color)' }} />
                      <span>{task.distance_km?.toFixed(1)} km away</span>
                    </div>
                    <div style={{ marginTop: '12px' }}>
                      <span style={{
                        background: 'rgba(59,130,246,0.1)', color: 'var(--accent)',
                        padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.5px'
                      }}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              )})}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

