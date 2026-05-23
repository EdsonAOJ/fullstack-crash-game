"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface AuthenticatedUser {
  sub: string;
  username: string;
  name?: string;
  email?: string;
}

interface AuthSession {
  isAuthenticated: boolean;
  user: AuthenticatedUser | null;
}

interface AuthContextValue extends AuthSession {
  isLoading: boolean;
  login: () => void;
  logout: () => Promise<void>;
  refetchSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchSession(): Promise<AuthSession> {
  const response = await fetch("/api/auth/session", {
    cache: "no-store",
  });

  const body = await response.json();

  if (!response.ok) {
    throw new Error(body?.error?.message ?? "Erro ao buscar sessão.");
  }

  return body.data as AuthSession;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<AuthSession>({
    isAuthenticated: false,
    user: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  const refetchSession = useCallback(async (): Promise<void> => {
    setIsLoading(true);

    try {
      const nextSession = await fetchSession();
      setSession(nextSession);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(() => {
    window.location.href = "/api/auth/login";
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    await fetch("/api/auth/logout", {
      method: "POST",
    });

    setSession({
      isAuthenticated: false,
      user: null,
    });

    window.location.href = "/login";
  }, []);

  useEffect(() => {
    let isMounted = true;

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        try {
          const nextSession = await fetchSession();

          if (!isMounted) {
            return;
          }

          setSession(nextSession);
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      })();
    }, 0);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...session,
      isLoading,
      login,
      logout,
      refetchSession,
    }),
    [isLoading, login, logout, refetchSession, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
