"use client";

import { useAuthSession } from "@/components/auth/auth-session-provider";

type SessionPoints = {
  pointBalance: number;
  loading: boolean;
};

export function useMobileSessionPoints(): SessionPoints {
  const { user, loading } = useAuthSession();
  return { pointBalance: user?.pointBalance ?? 0, loading };
}
