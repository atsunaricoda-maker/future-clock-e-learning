'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from './api';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'instructor' | 'admin' | 'super_admin';
  avatarUrl?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    // ブラウザ環境でlocalStorageから直接トークンを読み込む
    let token = api.getToken();
    if (!token && typeof window !== 'undefined') {
      token = localStorage.getItem('auth_token');
      if (token) {
        api.setToken(token);
      }
    }
    
    console.log('refreshUser called, token exists:', !!token);
    
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.getMe();
      console.log('getMe response:', response);
      if (response.success && response.data) {
        // APIレスポンスをUserインターフェースに変換
        const userData = response.data;
        setUser({
          id: userData.id,
          email: userData.email,
          name: userData.profile?.displayName || userData.email,
          role: userData.role,
          avatarUrl: userData.profile?.avatarUrl,
        });
      } else {
        console.log('getMe failed, clearing token');
        api.setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error('refreshUser error:', error);
      api.setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.login(email, password);
      if (response.success && response.data) {
        api.setToken(response.data.token);
        setUser(response.data.user);
        return { success: true };
      }
      return { 
        success: false, 
        error: response.error?.message || 'ログインに失敗しました' 
      };
    } catch (error) {
      return { success: false, error: 'ネットワークエラーが発生しました' };
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      const response = await api.register(email, password, name);
      if (response.success && response.data) {
        api.setToken(response.data.token);
        setUser(response.data.user);
        return { success: true };
      }
      return { 
        success: false, 
        error: response.error?.message || '登録に失敗しました' 
      };
    } catch (error) {
      return { success: false, error: 'ネットワークエラーが発生しました' };
    }
  };

  const logout = () => {
    api.setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
