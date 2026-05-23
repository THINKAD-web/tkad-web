"use client";

import { useEffect, useState } from "react";

type SessionPoints = {
  pointBalance: number;
  loading: boolean;
};

export function useMobileSessionPoints(): SessionPoints {
  const [pointBalance, setPointBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled && data.ok && data.data) {
          setPointBalance(data.data.pointBalance ?? 0);
        }
      } catch {
        /* guest or offline */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { pointBalance, loading };
}
