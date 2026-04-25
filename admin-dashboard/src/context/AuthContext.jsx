import { createContext, useContext, useState } from 'react';
import { setToken, getStoredUser, setStoredUser } from '../services/api';

const AuthContext = createContext(null);

const ADMIN_USER = {
  id: 'dev-admin-001',
  email: 'admin@sevasetu.org',
  name: 'Admin',
  role: 'admin',
  is_active: true,
};

export function AuthProvider({ children }) {
  // Auto-login as admin — no login page needed for dashboard
  const [user] = useState(() => {
    const stored = getStoredUser();
    if (stored) return stored;
    // First visit: auto-set admin
    setToken('dev-token');
    setStoredUser(ADMIN_USER);
    return ADMIN_USER;
  });

  return (
    <AuthContext.Provider value={{ user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
