import { createContext, useContext, useState, useEffect } from 'react';
import { auth as authApi, setToken, clearAuth, getStoredUser, setStoredUser } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser());
  const [loading, setLoading] = useState(false);

  const login = async (googleIdToken, role = 'admin') => {
    setLoading(true);
    try {
      const res = await authApi.googleLogin(googleIdToken, role);
      setToken(res.access_token);
      setStoredUser(res.user);
      setUser(res.user);
      return res;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      // Ignore errors on logout
    }
    clearAuth();
    setUser(null);
  };

  // Dev mode: auto-login for testing (skip Google OAuth)
  const devLogin = async () => {
    // This creates a mock session for development
    const mockUser = {
      id: 'dev-admin-001',
      email: 'admin@smartalloc.org',
      name: 'Dev Admin',
      role: 'admin',
      is_active: true,
    };
    // For dev, we'll set a mock token that the backend will need to handle
    // In production, always use Google OAuth
    setToken('dev-token');
    setStoredUser(mockUser);
    setUser(mockUser);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, devLogin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
