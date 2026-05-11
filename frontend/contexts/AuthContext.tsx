import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const TOKEN_KEY = '@animitra/token';
const USER_KEY = '@animitra/user';

interface User {
  id: string;
  name: string;
  mobile: string;
  reg_no?: string;
  state?: string;
  district?: string;
  taluk?: string;
  is_activated: boolean;
  role: string;
  is_trial?: boolean;
  trial_days_left?: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (mobile: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<{ token: string; user: User }>;
  activate: (couponCode: string, tempToken: string) => Promise<void>;
  logout: () => Promise<void>;
  setAuthData: (token: string, user: User) => Promise<void>;
}

interface RegisterData {
  name: string;
  reg_no: string;
  mobile: string;
  password: string;
  state: string;
  district: string;
  taluk: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
      const storedUser = await AsyncStorage.getItem(USER_KEY);
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error('Failed to load auth:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const setAuthData = async (newToken: string, newUser: User) => {
    await AsyncStorage.setItem(TOKEN_KEY, newToken);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const login = async (mobile: string, password: string) => {
    const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (data.detail === 'FREE_TRIAL_EXPIRED') {
        throw new Error('FREE_TRIAL_EXPIRED');
      }
      throw new Error(data.detail || 'Login failed');
    }
    await setAuthData(data.token, data.user);
  };

  const register = async (regData: RegisterData): Promise<{ token: string; user: User }> => {
    const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(regData),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Registration failed');
    }
    return { token: data.token, user: data.user };
  };

  const activate = async (couponCode: string, tempToken: string) => {
    const res = await fetch(`${BACKEND_URL}/api/auth/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tempToken}`,
      },
      body: JSON.stringify({ coupon_code: couponCode }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Activation failed');
    }
    await setAuthData(data.token, data.user);
  };

  const logout = async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, activate, logout, setAuthData }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
