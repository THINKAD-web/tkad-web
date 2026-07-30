"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchIntegratedMix,
  type IntegratedMixFetchResult,
} from "@/lib/integrated/client-mix";
import type { IntegratedMixRequest, IntegratedMixResponse } from "@/lib/integrated/schemas";

export type UseIntegratedMixState = {
  data: IntegratedMixResponse | null;
  loading: boolean;
  error: Extract<IntegratedMixFetchResult, { ok: false }> | null;
  refetch: () => void;
};

export function useIntegratedMix(
  request: IntegratedMixRequest | null,
  enabled: boolean,
): UseIntegratedMixState {
  const [data, setData] = useState<IntegratedMixResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<
    Extract<IntegratedMixFetchResult, { ok: false }> | null
  >(null);
  const requestKey = request ? JSON.stringify(request) : "";
  const bumpRef = useRef(0);

  const refetch = useCallback(() => {
    bumpRef.current += 1;
  }, []);

  useEffect(() => {
    if (!enabled || !request) {
      setLoading(false);
      return;
    }

    const bump = bumpRef.current;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await fetchIntegratedMix(request, controller.signal);
        if (bump !== bumpRef.current) return;
        if (result.ok) {
          setData(result.data);
          setError(null);
        } else {
          setError(result);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (bump !== bumpRef.current) return;
        setError({
          ok: false,
          status: 0,
          error: "NETWORK",
          message: "Network error while fetching integrated mix.",
        });
      } finally {
        if (bump === bumpRef.current) setLoading(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [enabled, requestKey, request]);

  return { data, loading, error, refetch };
}
