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
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  getDefaultRedirectPath: (role?: string) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    // ブラウザ環境でlocalStorageから直接トークンを読み込む
    let token: string | null = null;
    
    if (typeof window !== 'undefined') {
      token = localStorage.getItem('auth_token');
      console.log('refreshUser: token from localStorage:', !!token);
      if (token) {
        api.setToken(token);
      }
    }
    
    if (!token) {
      token = api.getToken();
    }
    
    console.log('refreshUser called, final token exists:', !!token);
    
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
        const newUser = {
          id: userData.id,
          email: userData.email,
          name: userData.profile?.displayName || userData.email,
          role: userData.role,
          avatarUrl: userData.profile?.avatarUrl,
        };
        console.log('Setting user:', newUser);
        setUser(newUser);
      } else {
        console.log('getMe failed, clearing token. Response:', response);
        api.setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error('refreshUser error:', error);
      api.setToken(null);
      setUser(null);
    }
    setIsLoading(false);
    console.log('refreshUser completed, isLoading set to false');
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // ロールに応じたデフォルトリダイレクト先を取得
  const getDefaultRedirectPath = (role?: string): string => {
    switch (role) {
      case 'admin':
      case 'super_admin':
        return '/admin';
      case 'instructor':
        return '/instructor';
      case 'student':
      default:
        return '/dashboard';
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await api.login(email, password);
      if (response.success && response.data) {
        api.setToken(response.data.token);
        const loggedInUser = response.data.user;
        setUser(loggedInUser);
        return { success: true, user: loggedInUser };
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
        const registeredUser = response.data.user;
        setUser(registeredUser);
        return { success: true, user: registeredUser };
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
        getDefaultRedirectPath,
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
