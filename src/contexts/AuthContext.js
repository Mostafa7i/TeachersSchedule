'use client';

// contexts/AuthContext.js — Global auth state + provider
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { authService } from '@/services/auth.service';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Load current user on mount
  const loadUser = useCallback(async () => {
    try {
      const res = await authService.getMe();
      setUser(res.data);
    } catch {
      setUser(null);
      Cookies.remove('auth_token');
      if (typeof window !== 'undefined') localStorage.removeItem('auth_token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email, password) => {
    const res = await authService.login(email, password);
    const loggedUser = res.data?.user || res.data;
    const token = res.data?.token;

    if (token) {
      Cookies.set('auth_token', token, { expires: 7 });
      if (typeof window !== 'undefined') localStorage.setItem('auth_token', token);
    }

    setUser(loggedUser);
    return loggedUser;
  };

  const googleLogin = async (payload) => {
    const res = await authService.googleLogin(payload);
    const loggedUser = res.data?.user || res.data;
    const token = res.data?.token;

    if (token) {
      Cookies.set('auth_token', token, { expires: 7 });
      if (typeof window !== 'undefined') localStorage.setItem('auth_token', token);
    }

    setUser(loggedUser);
    return loggedUser;
  };

  const completeProfile = async (payload) => {
    const res = await authService.completeProfile(payload);
    const updatedUser = res.data?.user || res.data;
    setUser(updatedUser);
    return updatedUser;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      Cookies.remove('auth_token');
      if (typeof window !== 'undefined') localStorage.removeItem('auth_token');
      setUser(null);
      router.push('/login');
    }
  };

  // Check if user has a specific permission
  const hasPermission = (permissionName) => {
    if (!user) return false;
    const rolePermissions = user.role?.permissions || [];
    // Super admin or system role has all permissions
    if (user.role?.isSystem) return true;
    return rolePermissions.some((p) => p.name === permissionName);
  };

  // Check if user is admin (isSystem role)
  const isAdmin = () => {
    if (!user) return false;
    return user.role?.isSystem === true;
  };

  const value = {
    user,
    loading,
    login,
    googleLogin,
    completeProfile,
    logout,
    hasPermission,
    isAdmin,
    refetchUser: loadUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
