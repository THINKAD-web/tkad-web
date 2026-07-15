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

type RefreshOptions = {
  force?: boolean;
};

type AuthSessionContextValue = {
  user: AuthSessionUser | null;
  loading: boolean;
  refresh: (options?: RefreshOptions) => Promise<void>;
};

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

/** 로그인·로그아웃 직후 Provider 강제 갱신용 (선택 호출) */
export const AUTH_SESSION_REFRESH_EVENT = "tkad-auth-session-refresh";

const SESSION_TTL_MS = 5 * 60 * 1000;

const AUTH_ROUTE_MARKERS = [
  "/login",
  "/signup",
  "/register",
  "/forgot-password",
] as const;

function isAuthPath(pathname: string): boolean {
  return AUTH_ROUTE_MARKERS.some((marker) => pathname.includes(marker));
}

export function notifyAuthSessionRefresh(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_SESSION_REFRESH_EVENT));
}

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
  const lastFetchedAtRef = useRef(0);
  const prevPathnameRef = useRef(pathname);

  const refresh = useCallback(async (options?: RefreshOptions) => {
    const force = options?.force === true;
    const now = Date.now();
    if (
      !force &&
      lastFetchedAtRef.current > 0 &&
      now - lastFetchedAtRef.current < SESSION_TTL_MS
    ) {
      setLoading(false);
      return;
    }

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
          lastFetchedAtRef.current = Date.now();
          return;
        }
        const json = (await res.json()) as {
          ok?: boolean;
          data?: AuthSessionUser | null;
        };
        const data = json?.data ?? null;
        setUser(data?.id || data?.plan ? data : null);
        lastFetchedAtRef.current = Date.now();
      } catch {
        setUser(null);
        lastFetchedAtRef.current = Date.now();
      } finally {
        setLoading(false);
        inflightRef.current = null;
      }
    })();

    inflightRef.current = promise;
    return promise;
  }, []);

  useEffect(() => {
    const prev = prevPathnameRef.current;
    prevPathnameRef.current = pathname;
    const leftAuth = isAuthPath(prev) && !isAuthPath(pathname);
    void refresh({ force: leftAuth });
  }, [pathname, refresh]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void refresh({ force: false });
      }
    };
    const onForceRefresh = () => {
      void refresh({ force: true });
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener(AUTH_SESSION_REFRESH_EVENT, onForceRefresh);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener(AUTH_SESSION_REFRESH_EVENT, onForceRefresh);
    };
  }, [refresh]);

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
