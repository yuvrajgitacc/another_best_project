import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';

const navItems = [
  { path: '/', icon: '📊', label: 'Dashboard' },
  { path: '/needs', icon: '📋', label: 'Need Tracker' },
  { path: '/map', icon: '🗺️', label: 'Live Map' },
  { path: '/volunteers', icon: '🙋', label: 'Volunteers' },
  { path: '/matching', icon: '🧠', label: 'Smart Match' },
  { path: '/ocr', icon: '📷', label: 'OCR Scanner' },
  { path: '/broadcast', icon: '📡', label: 'Broadcast' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const [theme, setTheme] = useState(() => localStorage.getItem('sa-theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sa-theme', theme);
  }, [theme]);

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-icon">🚀</span>
          <h1>SmartAlloc</h1>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          {/* Theme Toggle */}
          <div className="theme-toggle">
            <button
              className={theme === 'light' ? 'active' : ''}
              onClick={() => setTheme('light')}
            >
              ☀️ Light
            </button>
            <button
              className={theme === 'dark' ? 'active' : ''}
              onClick={() => setTheme('dark')}
            >
              🌙 Dark
            </button>
          </div>

          {/* User Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            {user?.picture ? (
              <img src={user.picture} alt="" style={{ width: 36, height: 36, borderRadius: '50%' }} />
            ) : (
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'var(--gradient-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '14px', fontWeight: 700, color: '#fff'
              }}>
                {user?.name?.[0] || 'A'}
              </div>
            )}
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>{user?.name || 'Dev Admin'}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{user?.role || 'admin'}</div>
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
    </div>
  );
}
