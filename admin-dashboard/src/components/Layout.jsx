import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DisasterAlertSystem, { TriangleWarning } from './DisasterAlertSystem';
import { fetchWeatherWithAlerts, getDemoWeatherAlert, INDIA_CENTER } from '../services/weatherService';

const OWM_KEY = import.meta.env.VITE_OWM_API_KEY || '';

export default function Layout() {
  const { user, logout } = useAuth();
  const [disasterCount, setDisasterCount] = useState(0);
  const [highestSeverity, setHighestSeverity] = useState(0);
  const pollRef = useRef(null);

  // Lightweight poll just to maintain the sidebar badge count
  useEffect(() => {
    async function refresh() {
      const w = OWM_KEY
        ? await fetchWeatherWithAlerts(INDIA_CENTER.lat, INDIA_CENTER.lng, OWM_KEY)
        : getDemoWeatherAlert();
      if (w?.disasters) {
        setDisasterCount(w.disasters.length);
        setHighestSeverity(w.disasters[0]?.severity || 0);
      }
    }
    refresh();
    pollRef.current = setInterval(refresh, 5 * 60 * 1000);
    return () => clearInterval(pollRef.current);
  }, []);

  const navItems = [
    { path: '/',          icon: '📊', label: 'Dashboard'   },
    { path: '/needs',     icon: '📋', label: 'Need Tracker' },
    { path: '/map',       icon: '🗺️', label: 'Live Map'     },
    { path: '/volunteers',icon: '🙋', label: 'Volunteers'   },
    { path: '/matching',  icon: '🧠', label: 'Smart Match'  },
    { path: '/ocr',       icon: '📷', label: 'OCR Scanner'  },
    { path: '/broadcast', icon: '📡', label: 'Broadcast'    },
  ];

  const alertColor = highestSeverity >= 5 ? '#EF4444'
                   : highestSeverity >= 4 ? '#F97316'
                   : highestSeverity >= 3 ? '#F59E0B'
                   : null;

  return (
    <div className="app-layout">
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <span className="logo-icon">🚀</span>
          <h1>SevaSetu</h1>
        </div>

        {/* Disaster alert strip in sidebar */}
        {disasterCount > 0 && alertColor && (
          <div style={{
            margin: '8px 12px 0',
            background: `${alertColor}18`,
            border: `1px solid ${alertColor}40`,
            borderRadius: 10,
            padding: '8px 12px',
            display: 'flex', alignItems: 'center', gap: 8,
            cursor: 'default',
          }}>
            <TriangleWarning size={16} color={alertColor} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: alertColor }}>
                {disasterCount} Disaster Alert{disasterCount > 1 ? 's' : ''}
              </div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1 }}>
                Click badge below to view details
              </div>
            </div>
            <span style={{
              width: 20, height: 20, borderRadius: '50%',
              background: alertColor, color: '#fff',
              fontSize: 10, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: highestSeverity >= 5 ? 'sidebarPulse 1.4s ease-in-out infinite' : 'none',
            }}>
              {disasterCount}
            </span>
          </div>
        )}

        {/* Nav */}
        <nav className="sidebar-nav" style={{ marginTop: 8 }}>
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
              {/* Extra ⚠️ dot on Live Map when disasters are active */}
              {item.path === '/map' && disasterCount > 0 && (
                <span style={{
                  marginLeft: 'auto', width: 8, height: 8,
                  borderRadius: '50%', background: alertColor,
                  flexShrink: 0,
                  animation: 'sidebarPulse 1.4s ease-in-out infinite',
                }} />
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            {user?.picture ? (
              <img src={user.picture} alt="" style={{ width: 36, height: 36, borderRadius: '50%' }} />
            ) : (
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700 }}>
                {user?.name?.[0] || 'A'}
              </div>
            )}
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>{user?.name || 'Admin'}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{user?.role}</div>
            </div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={logout} style={{ width: '100%' }}>
            Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>

      {/* Global disaster alert system — floating badge + panel */}
      <DisasterAlertSystem />

      <style>{`
        @keyframes sidebarPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.7; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
