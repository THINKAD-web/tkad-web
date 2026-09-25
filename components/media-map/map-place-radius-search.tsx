"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MapPin, X } from "lucide-react";
import type { KakaoPlaceHit } from "@/lib/kakao-local-place-search";
import {
  MAP_RADIUS_PRESETS_M,
  type MapRadiusPresetM,
} from "@/lib/media-map/map-radius-filter";
import { cn } from "@/lib/utils";

export type MapPlaceRadiusValue = {
  centerLat: number;
  centerLng: number;
  radiusM: MapRadiusPresetM;
  placeLabel: string;
  searchType: "address" | "poi";
};

type Props = {
  isKo: boolean;
  value: MapPlaceRadiusValue | null;
  onChange: (next: MapPlaceRadiusValue | null) => void;
  onPlaceApplied?: (hit: KakaoPlaceHit, radiusM: MapRadiusPresetM) => void;
};

export function MapPlaceRadiusSearch({ isKo, value, onChange, onPlaceApplied }: Props) {
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<KakaoPlaceHit[]>([]);
  const [open, setOpen] = useState(false);
  const composingRef = useRef(false);
  const radiusM = value?.radiusM ?? 1000;

  useEffect(() => {
    if (value?.placeLabel) setDraft(value.placeLabel);
  }, [value?.placeLabel]);

  const runSearch = useCallback(async () => {
    const q = draft.trim();
    if (!q || composingRef.current) return;
    setLoading(true);
    setHits([]);
    try {
      const res = await fetch(
        `/api/media/map/places?query=${encodeURIComponent(q)}`,
        { cache: "no-store" },
      );
      const data = (await res.json()) as {
        data?: { places?: KakaoPlaceHit[]; configured?: boolean };
      };
      const places = data.data?.places ?? [];
      setHits(places);
      setOpen(true);
      if (places.length === 1) {
        const hit = places[0]!;
        const next: MapPlaceRadiusValue = {
          centerLat: hit.latitude,
          centerLng: hit.longitude,
          radiusM,
          placeLabel: hit.placeName,
          searchType: hit.kind,
        };
        onChange(next);
        onPlaceApplied?.(hit, radiusM);
        setOpen(false);
      }
    } finally {
      setLoading(false);
    }
  }, [draft, onChange, onPlaceApplied, radiusM]);

  const selectHit = (hit: KakaoPlaceHit) => {
    const next: MapPlaceRadiusValue = {
      centerLat: hit.latitude,
      centerLng: hit.longitude,
      radiusM,
      placeLabel: hit.placeName,
      searchType: hit.kind,
    };
    onChange(next);
    onPlaceApplied?.(hit, radiusM);
    setDraft(hit.placeName);
    setOpen(false);
    setHits([]);
  };

  const setRadius = (m: MapRadiusPresetM) => {
    if (!value) return;
    const next = { ...value, radiusM: m };
    onChange(next);
    onPlaceApplied?.(
      {
        kind: value.searchType,
        placeName: value.placeLabel,
        addressName: value.placeLabel,
        latitude: value.centerLat,
        longitude: value.centerLng,
      },
      m,
    );
  };

  return (
    <div
      className="flex flex-col gap-2 rounded-xl border border-border/80 bg-card/95 p-2 shadow-sm backdrop-blur dark:border-white/10 dark:bg-[#0c0c14]/90"
      data-map-onboarding="place-radius-search"
    >
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <MapPin
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-tkad-muted"
            aria-hidden
          />
          <input
            type="search"
            enterKeyHint="search"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onCompositionStart={() => {
              composingRef.current = true;
            }}
            onCompositionEnd={() => {
              composingRef.current = false;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !composingRef.current) {
                e.preventDefault();
                void runSearch();
              }
            }}
            placeholder={
              isKo ? "주소·역·랜드마크 (반경 검색)" : "Address, station, landmark"
            }
            className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm dark:border-white/12 dark:bg-black/40"
            aria-label={isKo ? "장소 반경 검색" : "Place radius search"}
          />
          {open && hits.length > 0 ? (
            <ul
              className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-border bg-popover py-1 shadow-lg dark:border-white/12"
              role="listbox"
            >
              {hits.map((h) => (
                <li key={`${h.latitude}-${h.longitude}-${h.placeName}`}>
                  <button
                    type="button"
                    role="option"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => selectHit(h)}
                  >
                    <span className="font-medium">{h.placeName}</span>
                    {h.addressName && h.addressName !== h.placeName ? (
                      <span className="block text-xs text-tkad-muted">{h.addressName}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void runSearch()}
          disabled={loading || !draft.trim()}
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-hermes px-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isKo ? "검색" : "Go"}
        </button>
        {value ? (
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setHits([]);
              setOpen(false);
            }}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border dark:border-white/12"
            aria-label={isKo ? "반경 검색 해제" : "Clear radius search"}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="tkad-type-note text-tkad-muted">
          {isKo ? "반경" : "Radius"}
        </span>
        {MAP_RADIUS_PRESETS_M.map((m) => (
          <button
            key={m}
            type="button"
            disabled={!value}
            onClick={() => setRadius(m)}
            className={cn(
              "rounded-full px-2.5 py-1 tkad-type-note font-medium tabular-nums",
              radiusM === m
                ? "bg-hermes text-white"
                : "border border-border text-foreground disabled:opacity-40 dark:border-white/15",
            )}
          >
            {m >= 1000 ? `${m / 1000}km` : `${m}m`}
          </button>
        ))}
        {value ? (
          <span className="ml-auto truncate tkad-type-note text-tkad-muted">
            {value.placeLabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}
