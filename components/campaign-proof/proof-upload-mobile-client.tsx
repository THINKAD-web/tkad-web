"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { Camera, CheckCircle2, ImagePlus, Loader2, MapPin } from "lucide-react";
import {
  readGeolocation,
  uploadProofFile,
} from "@/lib/campaign-proof-upload-client";
import { cn } from "@/lib/utils";

type Props = {
  campaignId?: string;
  token?: string;
  campaignName?: string;
  mediaNames?: string[];
  title?: string;
};

export function ProofUploadMobileClient({
  campaignId,
  token,
  campaignName: initialName,
  mediaNames: initialMedia,
  title,
}: Props) {
  const locale = useLocale();
  const isKo = locale === "ko";
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const [campaignName, setCampaignName] = useState(initialName ?? "");
  const [mediaNames, setMediaNames] = useState<string[]>(initialMedia ?? []);
  const [mediaPick, setMediaPick] = useState("");
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (token && !initialName) {
      void fetch(`/api/campaign-proof/${token}`)
        .then((r) => r.json())
        .then((j) => {
          if (j.campaignName) setCampaignName(j.campaignName);
          if (j.mediaNames?.length) {
            setMediaNames(j.mediaNames);
            setMediaPick(j.mediaNames[0]);
          }
        })
        .catch(() => {});
    }
    if (initialMedia?.length && !mediaPick) {
      setMediaPick(initialMedia[0]!);
    }
  }, [token, initialName, initialMedia, mediaPick]);

  useEffect(() => {
    void readGeolocation().then((g) => {
      if (g) setGeo({ lat: g.latitude, lng: g.longitude });
    });
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setUploading(true);
      try {
        await uploadProofFile(
          file,
          { campaignId, token },
          {
            mediaName: mediaPick || mediaNames[0] || null,
            latitude: geo?.lat ?? null,
            longitude: geo?.lng ?? null,
            capturedAt: new Date(),
            uploadSource: token ? "qr" : "mobile",
          },
        );
        setDone(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : isKo ? "업로드 실패" : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [campaignId, token, mediaPick, mediaNames, geo, isKo],
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void handleFile(f);
    e.target.value = "";
  };

  if (done) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
        <CheckCircle2 className="h-16 w-16 text-emerald-400" />
        <h1 className="mt-4 text-xl font-bold dark:text-white text-gray-900">
          {isKo ? "업로드 완료" : "Uploaded"}
        </h1>
        <p className="mt-2 text-sm dark:text-white text-gray-500">
          {isKo
            ? "광고주에게 알림이 발송되었습니다."
            : "The advertiser has been notified."}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-[100dvh] max-w-lg px-4 py-6 pb-10">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-violet-300/80">
        {title ?? (isKo ? "현장 인증" : "Field proof")}
      </p>
      <h1 className="mt-2 text-2xl font-bold dark:text-white text-gray-900">{campaignName || "—"}</h1>

      {geo ? (
        <p className="mt-2 flex items-center gap-1 text-xs text-emerald-300/90">
          <MapPin className="h-3.5 w-3.5" />
          GPS {geo.lat.toFixed(5)}, {geo.lng.toFixed(5)}
        </p>
      ) : (
        <p className="mt-2 text-xs dark:text-white">
          {isKo ? "위치 정보를 가져오는 중…" : "Acquiring location…"}
        </p>
      )}

      {mediaNames.length > 1 ? (
        <label className="mt-6 block">
          <span className="text-xs dark:text-white text-gray-500">{isKo ? "매체" : "Media"}</span>
          <select
            className="mt-1 h-11 w-full rounded-xl border dark:border-white/15 border-gray-200 dark:bg-black bg-white bg-white/40 dark:bg-white/8 bg-gray-100 px-3 text-sm dark:text-white text-gray-900"
            value={mediaPick}
            onChange={(e) => setMediaPick(e.target.value)}
          >
            {mediaNames.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      ) : mediaNames[0] ? (
        <p className="mt-4 text-sm dark:text-white text-gray-600">
          {isKo ? "매체" : "Media"}: {mediaNames[0]}
        </p>
      ) : null}

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={onInputChange}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={onInputChange}
      />

      <div className="mt-8 grid gap-3">
        <button
          type="button"
          disabled={uploading}
          onClick={() => cameraRef.current?.click()}
          className={cn(
            "flex h-24 items-center justify-center gap-3 rounded-2xl bg-violet-500 text-lg font-bold dark:text-white text-gray-900 shadow-lg shadow-violet-500/25 disabled:opacity-50",
          )}
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : (
            <Camera className="h-8 w-8" />
          )}
          {isKo ? "카메라로 촬영" : "Take photo"}
        </button>
        <button
          type="button"
          disabled={uploading}
          onClick={() => galleryRef.current?.click()}
          className="flex h-14 items-center justify-center gap-2 rounded-2xl border dark:border-white/20 border-gray-300 dark:bg-white/5 bg-gray-50 dark:text-white text-gray-900 disabled:opacity-50"
        >
          <ImagePlus className="h-5 w-5" />
          {isKo ? "갤러리에서 선택" : "Choose from gallery"}
        </button>
      </div>

      {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}

      <p className="mt-8 text-center text-[11px] dark:text-white text-gray-400">
        {isKo
          ? "촬영 시각·매체명이 자동 태그되며 THINKAD 워터마크가 적용됩니다."
          : "Capture time and media name are tagged; THINKAD watermark applied."}
      </p>
    </div>
  );
}
