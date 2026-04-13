import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Hydrate user on mount ──────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      api
        .get('/users/me')
        .then(({ data }) => {
          setUser(data.user);
        })
        .catch(() => {
          localStorage.removeItem('accessToken');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // ── Login ──────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });

    if (data.status === 'partial_success') {
      // 2FA required — return temp token + OTP for UI to handle
      return {
        needs2FA: true,
        temp2FAToken: data.temp2FAToken,
        _devOTP: data._devOTP,
      };
    }

    localStorage.setItem('accessToken', data.accessToken);
    setUser(data.user);
    return { needs2FA: false, user: data.user };
  }, []);

  // ── Verify 2FA ─────────────────────────────────────
  const verify2FA = useCallback(async (otp, tempToken) => {
    const { data } = await api.post(
      '/auth/2fa/verify',
      { otp },
      { headers: { Authorization: `Bearer ${tempToken}` } }
    );

    localStorage.setItem('accessToken', data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  // ── Register ───────────────────────────────────────
  const register = useCallback(async (email, password, role) => {
    const { data } = await api.post('/auth/register', { email, password, role });

    localStorage.setItem('accessToken', data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  // ── Logout ─────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore logout errors
    }
    localStorage.removeItem('accessToken');
    setUser(null);
  }, []);

  const value = {
    user,
    loading,
    login,
    verify2FA,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
