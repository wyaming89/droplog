import { useState, useEffect, useCallback } from 'react';
import { getCurrentUser, isLoggedIn, clearToken, setToken, login as apiLogin, register as apiRegister } from '@/services/api';
import type { UserInfo } from '@/types';

export function useAuth() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  const loadUser = useCallback(async () => {
    if (!isLoggedIn()) {
      setAuthenticated(false);
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const result = await getCurrentUser();
      if (result.success && result.data) {
        setUser(result.data);
        setAuthenticated(true);
      } else {
        clearToken();
        setAuthenticated(false);
        setUser(null);
      }
    } catch {
      clearToken();
      setAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const result = await apiLogin(username, password);
    if (result.success && result.data) {
      setToken(result.data.token);
      setUser(result.data.user);
      setAuthenticated(true);
      return { success: true };
    }
    return { success: false, error: result.error };
  };

  const register = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const result = await apiRegister(username, password);
    if (result.success) {
      return { success: true };
    }
    return { success: false, error: result.error };
  };

  const logout = () => {
    clearToken();
    setUser(null);
    setAuthenticated(false);
  };

  return {
    user,
    loading,
    authenticated,
    login,
    register,
    logout,
    refresh: loadUser,
  };
}
