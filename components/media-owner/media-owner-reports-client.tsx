"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  MediaOwnerPageLoader,
  ownerGlassCard,
} from "@/components/media-owner/media-owner-shell";
import { Button } from "@/components/ui/button";
import { Download, FileText, Loader2, QrCode, Mail } from "lucide-react";

type MediaRow = {
  id: string;
  name: string;
  image: string | null;
  region: string;
  type: string;
  isVerified: boolean;
  engagement: { viewCount: number; favoriteCount: number; inquiryCount: number };
};

type Access = {
  tier: string;
  whitelabel: string;
  watermark: boolean;
  unlimitedDownloads: boolean;
  downloadsUsedThisMonth: number;
  downloadsRemaining: number | null;
};

export default function MediaOwnerReportsClient() {
  const [loading, setLoading] = useState(true);
  const [media, setMedia] = useState<MediaRow[]>([]);
  const [access, setAccess] = useState<Access | null>(null);
  const [annualAvailable, setAnnualAvailable] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [qr, setQr] = useState<{ mediaId: string; dataUrl: string } | null>(null);
  const [emailPreview, setEmailPreview] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/media-owner/reports", { cache: "no-store" });
    const json = await res.json();
    if (json.ok) {
      setMedia(json.data.media ?? []);
      setAccess(json.data.access ?? null);
      setAnnualAvailable(json.data.annualAvailable ?? false);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function download(
    mediaId: string,
    reportType: "SPEC_SHEET" | "MONTHLY" | "ANNUAL",
  ) {
    const key = `${mediaId}-${reportType}`;
    setBusy(key);
    try {
      const res = await fetch("/api/media-owner/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId, reportType }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error ?? "다운로드 실패");
        return;
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") ?? "";
      const match = cd.match(/filename\*=UTF-8''([^;]+)/);
      const filename = match ? decodeURIComponent(match[1]!) : "report.pdf";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function downloadCatalog() {
    const ids = [...selected];
    if (ids.length === 0) {
      alert("카탈로그에 포함할 매체를 선택하세요.");
      return;
    }
    setBusy("catalog");
    try {
      const res = await fetch("/api/media-owner/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportType: "CATALOG", mediaIds: ids }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error ?? "다운로드 실패");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "media-catalog.pdf";
      a.click();
      URL.revokeObjectURL(url);
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function showQr(mediaId: string) {
    const res = await fetch(`/api/media-owner/sales-kit?mediaId=${mediaId}`);
    const json = await res.json();
    if (json.ok) setQr({ mediaId, dataUrl: json.data.qrDataUrl });
  }

  async function showEmail(mediaId: string) {
    const res = await fetch("/api/media-owner/sales-kit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaId }),
    });
    const json = await res.json();
    if (json.ok) setEmailPreview(json.data.template.bodyHtml);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (loading) return <MediaOwnerPageLoader />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold dark:text-white text-gray-900">데이터 보고서</h2>
        <p className="mt-1 text-sm dark:text-white text-gray-500">
          영업용 PDF · 월간/연간 성과 · QR·이메일 템플릿
        </p>
      </div>

      {access ? (
        <div className={`${ownerGlassCard} text-sm dark:text-white text-gray-700`}>
          <p>
            플랜: <strong className="text-violet-200">{access.tier}</strong>
            {access.watermark ? " · 워터마크 포함" : " · 화이트라벨"}
          </p>
          <p className="mt-1">
            이번 달 다운로드: {access.downloadsUsedThisMonth}
            {access.downloadsRemaining != null
              ? ` / ${access.downloadsUsedThisMonth + access.downloadsRemaining}회`
              : " · 무제한"}
          </p>
          {!access.unlimitedDownloads ? (
            <Link href="/pricing" className="mt-2 inline-block text-violet-300 underline">
              PRO 업그레이드 →
            </Link>
          ) : null}
          <Link
            href="/media-owner/branding"
            className="ml-4 text-violet-300 underline"
          >
            브랜딩 설정
          </Link>
        </div>
      ) : null}

      <div className={`${ownerGlassCard} flex flex-wrap gap-3`}>
        <Button
          type="button"
          variant="outline"
          disabled={busy === "catalog" || selected.size === 0}
          onClick={() => void downloadCatalog()}
        >
          {busy === "catalog" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileText className="mr-2 h-4 w-4" />
          )}
          선택 매체 카탈로그 PDF ({selected.size})
        </Button>
      </div>

      {media.length === 0 ? (
        <p className="dark:text-white text-gray-400">등록된 매체가 없습니다.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {media.map((m) => (
            <div key={m.id} className={ownerGlassCard}>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={selected.has(m.id)}
                  onChange={() => toggleSelect(m.id)}
                  className="mt-1"
                />
                {m.image ? (
                  <Image
                    src={m.image}
                    alt=""
                    width={72}
                    height={48}
                    className="h-12 w-18 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-16 items-center justify-center rounded-2xl dark:bg-white/10 bg-gray-100 text-xs dark:text-white text-gray-400">
                    No img
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold dark:text-white text-gray-900">{m.name}</p>
                  <p className="text-xs dark:text-white text-gray-400">
                    {m.region} · 조회 {m.engagement.viewCount} · 문의{" "}
                    {m.engagement.inquiryCount}
                  </p>
                </div>
              </label>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!!busy}
                  onClick={() => void download(m.id, "SPEC_SHEET")}
                >
                  {busy === `${m.id}-SPEC_SHEET` ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Download className="mr-1 h-3 w-3" />
                  )}
                  스펙 시트
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!!busy}
                  onClick={() => void download(m.id, "MONTHLY")}
                >
                  월간 성과
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!!busy || !annualAvailable}
                  title={annualAvailable ? undefined : "12월에 활성화"}
                  onClick={() => void download(m.id, "ANNUAL")}
                >
                  연간 보고서
                </Button>
                <Button size="sm" variant="outline" onClick={() => void showQr(m.id)}>
                  <QrCode className="mr-1 h-3 w-3" /> QR
                </Button>
                <Button size="sm" variant="outline" onClick={() => void showEmail(m.id)}>
                  <Mail className="mr-1 h-3 w-3" /> 이메일
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {qr ? (
        <div className={`${ownerGlassCard} max-w-xs`}>
          <p className="mb-2 text-sm dark:text-white text-gray-900">광고주용 QR (매체 상세)</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr.dataUrl} alt="QR" className="mx-auto w-full max-w-[200px]" />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="mt-2"
            onClick={() => setQr(null)}
          >
            닫기
          </Button>
        </div>
      ) : null}

      {emailPreview ? (
        <div className={`${ownerGlassCard} prose prose-invert max-w-none text-sm`}>
          <p className="mb-2 font-semibold dark:text-white text-gray-900">광고주 제안 이메일 템플릿</p>
          <div dangerouslySetInnerHTML={{ __html: emailPreview }} />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="mt-2"
            onClick={() => setEmailPreview(null)}
          >
            닫기
          </Button>
        </div>
      ) : null}
    </div>
  );
}
