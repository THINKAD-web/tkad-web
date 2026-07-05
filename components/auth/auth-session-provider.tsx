"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import type { PlanCheckUser } from "@/lib/plan-check-shared";

export type AuthSessionUser = PlanCheckUser & {
  id?: string;
  email?: string | null;
  name?: string;
  role?: string;
  pointBalance?: number;
};

type AuthSessionContextValue = {
  user: AuthSessionUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

export function useAuthSession() {
  const ctx = useContext(AuthSessionContext);
  if (!ctx) {
    throw new Error("useAuthSession must be used within <AuthSessionProvider>");
  }
  return ctx;
}

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<AuthSessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const inflightRef = useRef<Promise<void> | null>(null);

  const refresh = useCallback(async () => {
    if (inflightRef.current) return inflightRef.current;

    const promise = (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/auth/session", {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) {
          setUser(null);
          return;
        }
        const json = (await res.json()) as {
          ok?: boolean;
          data?: AuthSessionUser | null;
        };
        const data = json?.data ?? null;
        setUser(data?.id || data?.plan ? data : null);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
        inflightRef.current = null;
      }
    })();

    inflightRef.current = promise;
    return promise;
  }, []);

  useEffect(() => {
    void refresh();
  }, [pathname, refresh]);

  const value = useMemo(
    () => ({ user, loading, refresh }),
    [user, loading, refresh],
  );

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  );
}
