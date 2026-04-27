import { createContext, useContext, useState } from 'react';
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

  const emailLogin = async (email, password) => {
    setLoading(true);
    try {
      const res = await authApi.emailLogin(email, password);
      setToken(res.access_token);
      setStoredUser(res.user);
      setUser(res.user);
      return res;
    } finally {
      setLoading(false);
    }
  };

  const emailRegister = async (email, password, name, role = 'admin') => {
    setLoading(true);
    try {
      const res = await authApi.emailRegister(email, password, name, role);
      setToken(res.access_token);
      setStoredUser(res.user);
      setUser(res.user);
      return res;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearAuth();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, emailLogin, emailRegister, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
