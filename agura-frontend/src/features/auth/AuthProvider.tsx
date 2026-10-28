/** Authentication state for both account kinds. */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { authApi, meApi } from "../../lib/api";
import { onAuthChange, signOutLocally, tokens, type AccountKind } from "../../lib/api/client";
import type { AdminAccount, UserAccount } from "../../lib/api/types";

interface AuthValue {
  kind: AccountKind | null;
  user: UserAccount | null;
  admin: AdminAccount | null;
  loading: boolean;
  signIn: (phone: string, password: string) => Promise<void>;
  signUp: (phone: string, password: string, fullName?: string) => Promise<void>;
  adminSignIn: (identifier: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [kind, setKind] = useState<AccountKind | null>(() => tokens.kind());
  const [user, setUser] = useState<UserAccount | null>(null);
  const [admin, setAdmin] = useState<AdminAccount | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(tokens.access()));

  const loadProfile = useCallback(async () => {
    const currentKind = tokens.kind();
    if (!tokens.access() || !currentKind) {
      setKind(null);
      setUser(null);
      setAdmin(null);
      setLoading(false);
      return;
    }
    try {
      if (currentKind === "user") {
        setUser(await meApi.read());
        setAdmin(null);
      } else {
        // Reloading keeps the token but not the login response, so permissions
        // are fetched again. Console navigation depends on them.
        setAdmin(await authApi.adminMe());
        setUser(null);
      }
      setKind(currentKind);
    } catch {
      signOutLocally();
      setKind(null);
      setUser(null);
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
    return onAuthChange(() => {
      const next = tokens.kind();
      setKind(next);
      if (!next) {
        setUser(null);
        setAdmin(null);
      }
    });
  }, [loadProfile]);

  const signIn = useCallback(async (phone: string, password: string) => {
    const response = await authApi.login({ phone, password });
    tokens.save(response.access_token, response.refresh_token, "user");
    setUser(response.account);
    setAdmin(null);
    setKind("user");
  }, []);

  const signUp = useCallback(async (phone: string, password: string, fullName?: string) => {
    const response = await authApi.register({ phone, password, full_name: fullName });
    tokens.save(response.access_token, response.refresh_token, "user");
    setUser(response.account);
    setAdmin(null);
    setKind("user");
  }, []);

  const adminSignIn = useCallback(async (identifier: string, password: string) => {
    const response = await authApi.adminLogin({ identifier, password });
    tokens.save(response.access_token, response.refresh_token, "admin");
    setAdmin(response.account);
    setUser(null);
    setKind("admin");
  }, []);

  const signOut = useCallback(async () => {
    const refresh = tokens.refresh();
    try {
      await authApi.logout(refresh);
    } catch {
      // A failed revoke must not trap the person in the app.
    }
    signOutLocally();
    setKind(null);
    setUser(null);
    setAdmin(null);
  }, []);

  const value = useMemo(
    () => ({
      kind,
      user,
      admin,
      loading,
      signIn,
      signUp,
      adminSignIn,
      signOut,
      refreshUser: loadProfile,
    }),
    [kind, user, admin, loading, signIn, signUp, adminSignIn, signOut, loadProfile],
  );

  const Provider = AuthContext.Provider;
  return <Provider value={value}>{children}</Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (value === null) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
