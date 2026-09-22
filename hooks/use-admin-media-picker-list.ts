"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  parseAdminMediaListFromApiJson,
  type AdminMediaDto,
} from "@/lib/admin-media-dto";
import { buildAdminMediasListUrl } from "@/lib/admin-medias-list-url";
import { matchesAdminMediaDtoTextQuery } from "@/lib/admin-media-text-search";

type Options = {
  /** i18n load error fallback */
  loadErrorMessage?: string;
};

/**
 * 어드민 매체 픽커 SSOT — debounced server `q` + client matchesMediaTextQuery.
 */
export function useAdminMediaPickerList(options?: Options) {
  const [medias, setMedias] = useState<AdminMediaDto[]>([]);
  const [search, setSearch] = useState("");
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const listFetchGenRef = useRef(0);

  useEffect(() => {
    const q = search.trim();
    const debounceMs = q ? 300 : 0;
    const timer = setTimeout(() => {
      const gen = ++listFetchGenRef.current;
      void (async () => {
        setListLoading(true);
        setListError(null);
        try {
          const url = buildAdminMediasListUrl({
            q: q || undefined,
            pickerCatalog: true,
          });
          const res = await fetch(url, {
            credentials: "include",
            cache: "no-store",
          });
          const raw: unknown = await res.json();
          if (gen !== listFetchGenRef.current) return;
          if (!res.ok) {
            setListError(options?.loadErrorMessage ?? "load_failed");
            return;
          }
          const { medias: next, error: parseErr } =
            parseAdminMediaListFromApiJson(raw);
          if (parseErr) {
            setListError(parseErr);
            return;
          }
          setMedias(next);
        } catch {
          if (gen === listFetchGenRef.current) {
            setListError(options?.loadErrorMessage ?? "load_failed");
          }
        } finally {
          if (gen === listFetchGenRef.current) {
            setListLoading(false);
          }
        }
      })();
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [search, options?.loadErrorMessage]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return medias;
    return medias.filter((m) => matchesAdminMediaDtoTextQuery(m, q));
  }, [medias, search]);

  return {
    medias,
    setMedias,
    search,
    setSearch,
    listLoading,
    listError,
    filtered,
  };
}
