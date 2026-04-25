import { BrowserRouter, Routes, Route, NavLink, Navigate, Outlet } from 'react-router-dom';
import { createContext, useContext, useState } from 'react';
import { Home, ClipboardList, Map as MapIcon, AlertTriangle, User } from 'lucide-react';
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
  const [loading, setLoading] = useState(false);

  const login = async (token, role) => {
    setLoading(true);
    try {
      const res = await authApi.googleLogin(token, role);
      setToken(res.access_token);
      setStoredUser(res.user);
      setUser(res.user);
      return res;
    } finally { setLoading(false); }
  };

  const emailLogin = async (email, password) => {
    setLoading(true);
    try {
      const res = await authApi.emailLogin(email, password);
      setToken(res.access_token);
      setStoredUser(res.user);
      setUser(res.user);
      return res;
    } finally { setLoading(false); }
  };

  const emailRegister = async (email, password, name) => {
    setLoading(true);
    try {
      const res = await authApi.emailRegister(email, password, name);
      setToken(res.access_token);
      setStoredUser(res.user);
      setUser(res.user);
      return res;
    } finally { setLoading(false); }
  };

  const devLogin = () => {
    const mockUser = { id: 'dev-vol-001', email: 'volunteer@test.com', name: 'Dev Volunteer', role: 'volunteer', is_active: true };
    setToken('dev-vol-token');
    setStoredUser(mockUser);
    setUser(mockUser);
  };

  const logout = () => { clearAuth(); setUser(null); };

  return <AuthCtx.Provider value={{ user, loading, login, emailLogin, emailRegister, devLogin, logout }}>{children}</AuthCtx.Provider>;
}

function BottomNav() {
  return (
    <nav className="bottom-nav">
      <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
        <Home className="nav-icon" size={24} style={{ marginBottom: '4px' }} />Home
      </NavLink>
      <NavLink to="/tasks" className={({ isActive }) => isActive ? 'active' : ''}>
        <ClipboardList className="nav-icon" size={24} style={{ marginBottom: '4px' }} />Tasks
      </NavLink>
      <NavLink to="/map" className={({ isActive }) => isActive ? 'active' : ''}>
        <MapIcon className="nav-icon" size={24} style={{ marginBottom: '4px' }} />Map
      </NavLink>
      <NavLink to="/report" className={({ isActive }) => isActive ? 'active' : ''}>
        <AlertTriangle className="nav-icon" size={24} style={{ marginBottom: '4px' }} />Report
      </NavLink>
      <NavLink to="/profile" className={({ isActive }) => isActive ? 'active' : ''}>
        <User className="nav-icon" size={24} style={{ marginBottom: '4px' }} />Profile
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

function LoginRedirect() {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return <LoginPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginRedirect />} />
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
