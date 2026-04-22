import { BrowserRouter, Routes, Route, NavLink, Navigate, Outlet } from 'react-router-dom';
import { createContext, useContext, useState } from 'react';
import { auth as authApi, setToken, clearAuth, getStoredUser, setStoredUser } from './services/api';
import HomePage from './pages/HomePage';
import TasksPage from './pages/TasksPage';
import MapPage from './pages/MapPage';
import ReportPage from './pages/ReportPage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';

// Auth Context
const AuthCtx = createContext(null);
export function useAuth() { return useContext(AuthCtx); }

function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser());

  const login = async (token, role) => {
    const res = await authApi.googleLogin(token, role);
    setToken(res.access_token);
    setStoredUser(res.user);
    setUser(res.user);
    return res;
  };

  const devLogin = () => {
    const mockUser = { id: 'dev-vol-001', email: 'volunteer@test.com', name: 'Dev Volunteer', role: 'volunteer', is_active: true };
    setToken('dev-vol-token');
    setStoredUser(mockUser);
    setUser(mockUser);
  };

  const logout = () => { clearAuth(); setUser(null); };

  return <AuthCtx.Provider value={{ user, login, devLogin, logout }}>{children}</AuthCtx.Provider>;
}

function BottomNav() {
  return (
    <nav className="bottom-nav">
      <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
        <span className="nav-icon">🏠</span>Home
      </NavLink>
      <NavLink to="/tasks" className={({ isActive }) => isActive ? 'active' : ''}>
        <span className="nav-icon">📋</span>Tasks
      </NavLink>
      <NavLink to="/map" className={({ isActive }) => isActive ? 'active' : ''}>
        <span className="nav-icon">🗺️</span>Map
      </NavLink>
      <NavLink to="/report" className={({ isActive }) => isActive ? 'active' : ''}>
        <span className="nav-icon">🆘</span>Report
      </NavLink>
      <NavLink to="/profile" className={({ isActive }) => isActive ? 'active' : ''}>
        <span className="nav-icon">👤</span>Profile
      </NavLink>
    </nav>
  );
}

function ProtectedLayout() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="vol-app">
      <Outlet />
      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/report" element={<ReportPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
