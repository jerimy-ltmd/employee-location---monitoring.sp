import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Ping } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
  unreadMessagesCount: number;
  pendingPings: Ping[];
  login: (credential: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  setPendingPings: React.Dispatch<React.SetStateAction<Ping[]>>;
  setUnreadMessagesCount: React.Dispatch<React.SetStateAction<number>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('sm_token'));
  const [loading, setLoading] = useState(true);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [pendingPings, setPendingPings] = useState<Ping[]>([]);

  const refreshMe = async () => {
    const storedToken = localStorage.getItem('sm_token');
    if (!storedToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${storedToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setPendingPings(data.pendingPings || []);
        setUnreadMessagesCount(data.unreadMessagesCount || 0);
      } else {
        // Token invalid or expired
        localStorage.removeItem('sm_token');
        setToken(null);
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to authenticate:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshMe();
  }, [token]);

  const login = async (credential: string, pass: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential, password: pass }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }

    localStorage.setItem('sm_token', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const logout = async () => {
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        // Ignore
      }
    }
    localStorage.removeItem('sm_token');
    setToken(null);
    setUser(null);
    setPendingPings([]);
    setUnreadMessagesCount(0);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'ADMINISTRATOR',
        loading,
        unreadMessagesCount,
        pendingPings,
        login,
        logout,
        refreshMe,
        setPendingPings,
        setUnreadMessagesCount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
