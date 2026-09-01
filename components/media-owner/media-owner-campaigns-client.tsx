"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { Camera, Loader2 } from "lucide-react";
import {
  MediaOwnerPageLoader,
  ownerGlassCard,
} from "@/components/media-owner/media-owner-shell";
import { uploadOwnerProofImage } from "@/lib/media-owner-upload";
import { readGeolocationDetailed } from "@/lib/campaign-proof-upload-client";
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
  actualImpressions: number | null;
  actualReach: number | null;
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
      const geo = await readGeolocationDetailed();
      const url = await uploadOwnerProofImage(campaignId, file);
      const res = await fetch(
        `/api/media-owner/campaigns/${campaignId}/proofs`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: url,
            latitude: geo.coords?.latitude ?? null,
            longitude: geo.coords?.longitude ?? null,
          }),
        },
      );
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(isKo ? "업로드 실패" : "Upload failed");
        return;
      }
      toast.success(
        isKo
          ? geo.coords
            ? "인증 사진이 어드민에 전달되었습니다. (GPS 포함)"
            : "인증 사진이 어드민에 전달되었습니다. GPS 없이 저장됨 — 가능하면 위치 권한을 허용해 주세요."
          : geo.coords
            ? "Proof photo submitted (with GPS)."
            : "Proof photo submitted without GPS — enable location when possible.",
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
            ? "내 매체에서 진행 중인 캠페인 · 광고주 업종은 익명 처리됩니다. 인증 사진 업로드 시 GPS 첨부를 권장합니다(거부해도 업로드 가능)."
            : "Active campaigns on your media · advertiser industry is anonymized. GPS is recommended when uploading proof (upload still works if denied)."}
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
                  <p className="mt-2 text-xs dark:text-white text-gray-400">
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
              {r.canUploadProof ? (
                <OwnerActualsForm row={r} isKo={isKo} onSaved={load} />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function OwnerActualsForm({
  row,
  isKo,
  onSaved,
}: {
  row: CampaignRow;
  isKo: boolean;
  onSaved: () => Promise<void> | void;
}) {
  const toast = useAppToast();
  const [imp, setImp] = useState(
    row.actualImpressions != null ? String(row.actualImpressions) : "",
  );
  const [reach, setReach] = useState(
    row.actualReach != null ? String(row.actualReach) : "",
  );
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(
        `/api/media-owner/campaigns/${row.campaignId}/actuals`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actualImpressions: imp.trim() === "" ? null : imp.trim(),
            actualReach: reach.trim() === "" ? null : reach.trim(),
          }),
        },
      );
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(isKo ? "저장 실패" : "Save failed");
        return;
      }
      toast.success(
        isKo ? "실적이 저장되었습니다." : "Actuals saved.",
      );
      await onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 border-t dark:border-white/10 border-gray-200 pt-3">
      <p className="tkad-type-title dark:text-white text-gray-700">
        {isKo ? "집행 실적 입력" : "Enter actuals"}
        <span className="ml-1 font-normal dark:text-white/50 text-gray-400">
          {isKo ? "(집행 종료 후 · 광고주에게 예측 대비 표시)" : "(after flight · shown vs prediction)"}
        </span>
      </p>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <label className="flex flex-col">
          <span className="tkad-type-note dark:text-white/55 text-gray-400">
            {isKo ? "실제 노출수" : "Impressions"}
          </span>
          <input
            type="number"
            min={0}
            value={imp}
            onChange={(e) => setImp(e.target.value)}
            className="mt-0.5 w-32 rounded-lg border dark:border-white/15 border-gray-200 bg-transparent px-2 py-1.5 text-sm tabular-nums outline-none dark:text-white text-gray-900"
          />
        </label>
        <label className="flex flex-col">
          <span className="tkad-type-note dark:text-white/55 text-gray-400">
            {isKo ? "실제 도달수" : "Reach"}
          </span>
          <input
            type="number"
            min={0}
            value={reach}
            onChange={(e) => setReach(e.target.value)}
            className="mt-0.5 w-32 rounded-lg border dark:border-white/15 border-gray-200 bg-transparent px-2 py-1.5 text-sm tabular-nums outline-none dark:text-white text-gray-900"
          />
        </label>
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="inline-flex h-9 items-center gap-2 rounded-xl border dark:border-white/15 border-gray-200 px-3 text-xs font-bold dark:text-white text-gray-900 hover:dark:bg-white/5 bg-gray-50 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isKo ? "저장" : "Save"}
        </button>
      </div>
    </div>
  );
}
