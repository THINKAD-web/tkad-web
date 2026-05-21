"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { Camera, Loader2 } from "lucide-react";
import {
  MediaOwnerPageLoader,
  ownerGlassCard,
} from "@/components/media-owner/media-owner-shell";
import { uploadOwnerProofImage } from "@/lib/media-owner-upload";
import { useAppToast } from "@/lib/use-toast";

type CampaignRow = {
  bookingId: string;
  mediaId: string;
  mediaName: string;
  campaignId: string;
  campaignName: string;
  industryLabel: string;
  startsAt: string;
  endsAt: string;
  amountWon: number;
  status: string;
  proofPhotoCount: number;
  canUploadProof?: boolean;
};

export function MediaOwnerCampaignsClient() {
  const locale = useLocale();
  const isKo = locale === "ko";
  const toast = useAppToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/media-owner/campaigns", { cache: "no-store" });
    const json = await res.json();
    if (json.ok) setRows(json.data.campaigns as CampaignRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleProofFile(file: File, campaignId: string) {
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const url = await uploadOwnerProofImage(campaignId, file);
      const res = await fetch(
        `/api/media-owner/campaigns/${campaignId}/proofs`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: url }),
        },
      );
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(isKo ? "업로드 실패" : "Upload failed");
        return;
      }
      toast.success(
        isKo
          ? "인증 사진이 어드민에 전달되었습니다."
          : "Proof photo submitted.",
      );
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setUploading(false);
      setUploadTarget(null);
    }
  }

  if (loading) return <MediaOwnerPageLoader />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold dark:text-white text-gray-900">
          {isKo ? "집행 현황" : "Campaigns"}
        </h2>
        <p className="mt-1 text-sm dark:text-white text-gray-500">
          {isKo
            ? "내 매체에서 진행 중인 캠페인 · 광고주 업종은 익명 처리됩니다."
            : "Active campaigns on your media · advertiser industry is anonymized."}
        </p>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f && uploadTarget) void handleProofFile(f, uploadTarget);
          e.target.value = "";
        }}
      />

      {rows.length === 0 ? (
        <p className={ownerGlassCard}>
          {isKo ? "진행 중인 집행이 없습니다." : "No active campaigns."}
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.bookingId} className={ownerGlassCard}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium dark:text-white text-gray-900">{r.campaignName}</p>
                  <p className="text-sm dark:text-white text-gray-500">{r.mediaName}</p>
                  <p className="mt-1 text-xs text-violet-200/90">
                    {isKo ? "업종" : "Industry"}: {r.industryLabel}
                  </p>
                  <p className="mt-2 font-mono text-xs dark:text-white text-gray-400">
                    {r.startsAt.slice(0, 10)} ~ {r.endsAt.slice(0, 10)}
                  </p>
                  <p className="mt-1 text-sm tabular-nums dark:text-white text-gray-700">
                    ₩{r.amountWon.toLocaleString(isKo ? "ko-KR" : "en-US")}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={uploading || r.canUploadProof === false}
                  title={
                    r.canUploadProof === false
                      ? isKo
                        ? "캠페인 연결 후 업로드 가능"
                        : "Link campaign first"
                      : undefined
                  }
                  onClick={() => {
                    setUploadTarget(r.campaignId);
                    fileRef.current?.click();
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border dark:border-white/15 border-gray-200 px-3 py-2 text-xs dark:text-white text-gray-900 hover:dark:bg-white/5 bg-gray-50 disabled:opacity-50"
                >
                  {uploading && uploadTarget === r.campaignId ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                  {isKo ? "인증 사진" : "Proof"} ({r.proofPhotoCount})
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
