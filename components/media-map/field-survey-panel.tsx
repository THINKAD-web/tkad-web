"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClipboardCheck, FileDown, MapPinned, X } from "lucide-react";
import { haversineKm } from "@/lib/media-data";
import {
  clearFieldSurveySession,
  FIELD_SURVEY_RADIUS_KM,
  readFieldSurveySession,
  startFieldSurveySession,
  toggleSurveyVisit,
  updateSurveyNote,
  type FieldSurveyVisit,
} from "@/lib/field-survey-store";
import type { MapMapItem } from "@/components/media-map/media-map-types";
import { downloadPdfFromHtmlElement } from "@/lib/html-to-pdf";
import { cn } from "@/lib/utils";

type Props = {
  items: MapMapItem[];
  userLocation: { lat: number; lng: number } | null;
  isKo: boolean;
  onClose: () => void;
  onLocationTick: (loc: { lat: number; lng: number }) => void;
  onCenterMap: (loc: { lat: number; lng: number }) => void;
  checkedIds: Set<string>;
  onCheckedChange: (ids: Set<string>) => void;
};

export function FieldSurveyPanel({
  items,
  userLocation,
  isKo,
  onClose,
  onLocationTick,
  onCenterMap,
  checkedIds,
  onCheckedChange,
}: Props) {
  const [visits, setVisits] = useState<FieldSurveyVisit[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const watchRef = useRef<number | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const session = readFieldSurveySession() ?? startFieldSurveySession();
    setVisits(session.visits);
    const map: Record<string, string> = {};
    for (const v of session.visits) map[v.mediaId] = v.note;
    setNotes(map);
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        onLocationTick({ lat, lng });
        onCenterMap({ lat, lng });
      },
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 12000 },
    );
    return () => {
      if (watchRef.current != null) {
        navigator.geolocation.clearWatch(watchRef.current);
      }
    };
  }, [onLocationTick, onCenterMap]);

  const nearby = useMemo(() => {
    if (!userLocation) return [];
    return items
      .map((it) => ({
        it,
        km: haversineKm(userLocation, { lat: it.lat, lng: it.lng }),
      }))
      .filter((x) => x.km <= FIELD_SURVEY_RADIUS_KM)
      .sort((a, b) => a.km - b.km);
  }, [items, userLocation]);

  const toggleCheck = (it: MapMapItem) => {
    const session = toggleSurveyVisit({
      mediaId: it.id,
      name: it.name,
      location: it.location,
      type: it.type,
      lat: it.lat,
      lng: it.lng,
      note: notes[it.id] ?? "",
    });
    setVisits(session.visits);
    const next = new Set(checkedIds);
    if (next.has(it.id)) next.delete(it.id);
    else next.add(it.id);
    onCheckedChange(next);
  };

  const saveNote = (mediaId: string, note: string) => {
    setNotes((n) => ({ ...n, [mediaId]: note }));
    updateSurveyNote(mediaId, note);
  };

  const exportPdf = useCallback(async () => {
    const el = reportRef.current;
    if (!el || visits.length === 0) return;
    await downloadPdfFromHtmlElement(
      el,
      `thinkad-survey-${new Date().toISOString().slice(0, 10)}.pdf`,
    );
  }, [visits.length]);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[12] flex max-h-[55dvh] flex-col md:inset-x-auto md:right-4 md:top-20 md:bottom-auto md:max-h-[calc(100vh-6rem)] md:w-[360px]">
      <div className="pointer-events-auto flex min-h-0 flex-1 flex-col rounded-t-2xl border dark:border-white/14 border-gray-200 dark:bg-black bg-white dark:bg-white/8 bg-gray-100 shadow-2xl backdrop-blur md:rounded-2xl">
        <div className="flex items-center justify-between border-b dark:border-white/10 border-gray-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <MapPinned className="h-4 w-4 text-cyan-300" />
            <span className="text-sm font-bold dark:text-white text-gray-900">
              {isKo ? "답사 모드" : "Field survey"}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 dark:text-white text-gray-500 hover:dark:bg-white/10 bg-gray-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-3 text-xs dark:text-white text-gray-600">
          {!userLocation ? (
            <p>{isKo ? "GPS 위치를 허용해주세요." : "Allow GPS location."}</p>
          ) : (
            <p>
              {isKo
                ? `반경 500m 내 ${nearby.length}개 매체 · 답사 ${visits.length}곳`
                : `${nearby.length} within 500m · ${visits.length} visited`}
            </p>
          )}
        </div>

        <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {nearby.map(({ it, km }) => (
            <li
              key={it.id}
              className={cn(
                "mb-2 rounded-xl border p-2",
                checkedIds.has(it.id)
                  ? "border-emerald-400/40 bg-emerald-400/10"
                  : "dark:border-white/10 border-gray-200 dark:bg-white/5 bg-gray-50",
              )}
            >
              <label className="flex cursor-pointer gap-2">
                <input
                  type="checkbox"
                  checked={checkedIds.has(it.id)}
                  onChange={() => toggleCheck(it)}
                  className="mt-1"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold dark:text-white text-gray-900">
                    {it.name}
                  </p>
                  <p className="text-[10px] dark:text-white text-gray-400">
                    {(km * 1000).toFixed(0)}m · {it.type}
                  </p>
                  {checkedIds.has(it.id) ? (
                    <textarea
                      className="mt-2 w-full rounded-lg border dark:border-white/15 border-gray-200 dark:bg-black bg-white/40 dark:bg-white/8 bg-gray-100 px-2 py-1 text-xs dark:text-white text-gray-900"
                      rows={2}
                      placeholder={isKo ? "메모" : "Note"}
                      value={notes[it.id] ?? ""}
                      onChange={(e) => saveNote(it.id, e.target.value)}
                    />
                  ) : null}
                </div>
              </label>
            </li>
          ))}
        </ul>

        <div className="flex gap-2 border-t dark:border-white/10 border-gray-200 p-3">
          <button
            type="button"
            disabled={visits.length === 0}
            onClick={() => void exportPdf()}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-violet-500 py-2.5 text-xs font-bold dark:text-white text-gray-900 disabled:opacity-40"
          >
            <FileDown className="h-3.5 w-3.5" />
            {isKo ? "답사 보고서 PDF" : "Survey PDF"}
          </button>
          <button
            type="button"
            onClick={() => {
              clearFieldSurveySession();
              onCheckedChange(new Set());
              setVisits([]);
            }}
            className="rounded-xl border dark:border-white/15 border-gray-200 px-3 py-2 text-xs dark:text-white text-gray-600"
          >
            {isKo ? "초기화" : "Reset"}
          </button>
        </div>
      </div>

      <div
        ref={reportRef}
        className="pointer-events-none fixed left-[-9999px] top-0 w-[210mm] bg-white p-8 text-black"
        aria-hidden
      >
        <h1 className="text-xl font-bold">THINKAD {isKo ? "답사 보고서" : "Field survey"}</h1>
        <p className="mt-2 text-sm text-gray-600">
          {new Date().toLocaleString(isKo ? "ko-KR" : "en-US")}
        </p>
        <ul className="mt-6 space-y-4">
          {visits.map((v, i) => (
            <li key={v.mediaId} className="border-b border-gray-200 pb-3">
              <p className="font-semibold">
                {i + 1}. {v.name}
              </p>
              <p className="text-sm text-gray-600">
                {v.location} · {v.type}
              </p>
              {v.note ? (
                <p className="mt-1 text-sm">{v.note}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
