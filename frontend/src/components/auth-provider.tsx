"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { api, type CurrentUserResponse, type User, type Workspace } from "@/lib/api";

type AuthContextValue = {
  user: User | null;
  workspaces: Workspace[];
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const applyCurrentUser = useCallback((current: CurrentUserResponse) => {
    setUser(current.user);
    setWorkspaces(current.workspaces);
  }, []);

  const clearAuthentication = useCallback(() => {
    api.setAccessToken(null);
    setUser(null);
    setWorkspaces([]);
  }, []);

  useEffect(() => {
    api.setAuthenticationFailureHandler(clearAuthentication);
    return () => api.setAuthenticationFailureHandler(null);
  }, [clearAuthentication]);

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        await api.refresh();
        const current = await api.getCurrentUser();
        if (isMounted) {
          applyCurrentUser(current);
        }
      } catch {
        if (isMounted) {
          clearAuthentication();
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void restoreSession();
    return () => {
      isMounted = false;
    };
  }, [applyCurrentUser, clearAuthentication]);

  const authenticate = useCallback(async (operation: Promise<{ access_token: string; user: User }>) => {
    const auth = await operation;
    api.setAccessToken(auth.access_token);
    const current = await api.getCurrentUser();
    applyCurrentUser(current);
  }, [applyCurrentUser]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    workspaces,
    isLoading,
    login: (email, password) => authenticate(api.login({ email, password })),
    register: (name, email, password) => authenticate(api.register({ name, email, password })),
    logout: async () => {
      try {
        await api.logout();
      } finally {
        clearAuthentication();
      }
    },
  }), [authenticate, clearAuthentication, isLoading, user, workspaces]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
