import { router } from 'expo-router';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import { api, setRefreshFailureHandler } from '@/api/client';
import { clearTokens, loadTokens, saveTokens } from '@/storage/tokens';
import { ApiError, AuthenticatedUser } from '@/types/auth';

type AuthContextValue = {
  user: AuthenticatedUser | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (values: Record<string, unknown>) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (values: Record<string, unknown> | FormData) => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function isActive(user: AuthenticatedUser): boolean {
  return user.account_status.toLowerCase() === 'active';
}

function messageFor(error: unknown): string {
  if (error instanceof Error && !(error instanceof ApiError)) return error.message;
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Invalid email or password.';
    if (error.status === 403) return 'This account cannot access the app.';
    const values = Object.values(error.payload).flatMap((value) =>
      Array.isArray(value) ? value.map(String) : typeof value === 'string' ? [value] : [],
    );
    return values[0] ?? error.message;
  }
  return 'Unable to reach the backend. Check your connection and try again.';
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const signOut = async () => {
    try {
      await api.logout();
    } catch (reason) {
      console.warn('Remote logout failed; local session was cleared.', reason);
    } finally {
      setUser(null);
      router.replace('/(auth)/login');
    }
  };

  useEffect(() => {
    setRefreshFailureHandler(() => {
      setUser(null);
      router.replace('/(auth)/login');
    });
    void (async () => {
      try {
        const tokens = await loadTokens();
        if (tokens) {
          const current = await api.me();
          if (isActive(current)) setUser(current);
          else await clearTokens();
        }
      } catch {
        await clearTokens();
      } finally {
        setLoading(false);
      }
    })();
    return () => setRefreshFailureHandler(null);
  }, []);

  const signIn = async (email: string, password: string) => {
    setError(null);
    try {
      const tokens = await api.login({ email, password });
      await saveTokens(tokens);
      const current = await api.me();
      if (!isActive(current)) {
        await clearTokens();
        throw new Error('Your account is not active yet.');
      }
      setUser(current);
      router.replace('/(app)');
    } catch (reason) {
      setError(messageFor(reason));
      throw reason;
    }
  };

  const signUp = async (values: Record<string, unknown>) => {
    setError(null);
    try {
      const registered = await api.register(values);
      if (!isActive(registered)) {
        throw new Error('Your account is awaiting approval.');
      }
      if (typeof values.email !== 'string' || typeof values.password !== 'string') {
        throw new Error('Registration details are incomplete.');
      }
      const tokens = await api.login({ email: values.email, password: values.password });
      await saveTokens(tokens);
      const current = await api.me();
      if (!isActive(current)) {
        await clearTokens();
        throw new Error('Your account is awaiting approval.');
      }
      setUser(current);
      router.replace('/(app)');
    } catch (reason) {
      setError(messageFor(reason));
      throw reason;
    }
  };

  const refreshUser = async () => setUser(await api.me());
  const updateUser = async (values: Record<string, unknown> | FormData) => setUser(await api.updateMe(values));

  const value = useMemo(
    () => ({ user, loading, error, signIn, signUp, signOut, refreshUser, updateUser, clearError: () => setError(null) }),
    [user, loading, error],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
