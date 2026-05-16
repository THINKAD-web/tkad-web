"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  ExternalLink,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import type { MediaApplication, MediaApplicationStatus } from "@prisma/client";
import {
  labelMediaApplicationStatus,
  labelMediaApplicationType,
  MEDIA_APPLICATION_STATUSES,
} from "@/lib/media-application";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function fmt(iso: string | Date): string {
  return new Date(iso).toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminMediaApplicationsPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useMemo(() => pathname.split("/")[1] || "ko", [pathname]);

  const [statusFilter, setStatusFilter] = useState<
    MediaApplicationStatus | "all"
  >("all");
  const [rows, setRows] = useState<MediaApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<MediaApplication | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [acting, setActing] = useState(false);

  const selectedId = searchParams.get("id");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs =
        statusFilter === "all" ? "" : `?status=${statusFilter}`;
      const res = await fetch(`/api/admin/media-applications${qs}`, {
        credentials: "include",
      });
      const data = (await res.json()) as {
        applications?: MediaApplication[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "load failed");
      setRows(data.applications ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load failed");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const loadDetail = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/media-applications/${id}`, {
      credentials: "include",
    });
    const data = (await res.json()) as {
      application?: MediaApplication;
      error?: string;
    };
    if (!res.ok) throw new Error(data.error ?? "detail failed");
    setDetail(data.application ?? null);
    setReviewNote(data.application?.reviewNote ?? "");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (selectedId) {
      void loadDetail(selectedId).catch((e) =>
        setError(e instanceof Error ? e.message : "detail failed"),
      );
    } else {
      setDetail(null);
    }
  }, [selectedId, loadDetail]);

  const selectRow = (id: string) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set("id", id);
    router.push(`${pathname}?${p.toString()}`);
  };

  const patchStatus = async (status: MediaApplicationStatus) => {
    if (!detail) return;
    setActing(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/media-applications/${detail.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reviewNote }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "update failed");
      await load();
      await loadDetail(detail.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "update failed");
    } finally {
      setActing(false);
    }
  };

  const approve = async () => {
    if (!detail) return;
    setActing(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/media-applications/${detail.id}/approve`,
        { method: "POST", credentials: "include" },
      );
      const data = (await res.json()) as {
        mediaId?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "approve failed");
      await load();
      await loadDetail(detail.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "approve failed");
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">매체 등록 신청</h1>
          <p className="text-sm text-muted-foreground">
            매체사 셀프 신청 심사 · 승인 시 Media 자동 생성
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          새로고침
        </button>
      </div>

      {error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setStatusFilter("all")}
          className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${statusFilter === "all" ? "bg-primary text-primary-foreground" : ""}`}
        >
          전체
        </button>
        {MEDIA_APPLICATION_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${statusFilter === s ? "bg-primary text-primary-foreground" : ""}`}
          >
            {labelMediaApplicationStatus(s, true)}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">신청 목록</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">불러오는 중…</p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">신청이 없습니다.</p>
            ) : (
              <ul className="divide-y">
                {rows.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => selectRow(r.id)}
                      className={`w-full px-2 py-3 text-left transition-colors hover:bg-muted/50 ${selectedId === r.id ? "bg-muted" : ""}`}
                    >
                      <p className="font-medium">{r.mediaName}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.companyName} ·{" "}
                        {labelMediaApplicationStatus(r.status, true)} ·{" "}
                        {fmt(r.createdAt)}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">상세</CardTitle>
          </CardHeader>
          <CardContent>
            {!detail ? (
              <p className="text-sm text-muted-foreground">
                목록에서 신청을 선택하세요.
              </p>
            ) : (
              <div className="space-y-4 text-sm">
                <p>
                  <span className="font-semibold">{detail.mediaName}</span>
                  <br />
                  <span className="text-muted-foreground">
                    {labelMediaApplicationType(detail.mediaType, true)} ·{" "}
                    {labelMediaApplicationStatus(detail.status, true)}
                  </span>
                </p>
                <div className="space-y-1 text-muted-foreground">
                  <p>
                    {detail.companyName} / {detail.contactName}
                  </p>
                  <p>
                    {detail.contactPhone} · {detail.contactEmail}
                  </p>
                  <p>
                    {detail.address}
                    {detail.addressDetail ? ` ${detail.addressDetail}` : ""}
                  </p>
                  <p>
                    월 {detail.monthlyPrice.toLocaleString("ko-KR")}원
                    {detail.dailyFootfall != null
                      ? ` · 유동 ${detail.dailyFootfall.toLocaleString()}`
                      : ""}
                  </p>
                  {detail.widthCm && detail.heightCm ? (
                    <p>
                      규격 {detail.widthCm}×{detail.heightCm} cm
                    </p>
                  ) : null}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[detail.photoFrontUrl, detail.photoSideUrl, detail.photoNightUrl].map(
                    (url, i) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block overflow-hidden border"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt=""
                          className="aspect-square object-cover"
                        />
                      </a>
                    ),
                  )}
                </div>
                {detail.notes ? (
                  <p className="whitespace-pre-wrap rounded border bg-muted/40 p-2 text-xs">
                    {detail.notes}
                  </p>
                ) : null}
                <label className="grid gap-1">
                  <span className="text-xs font-semibold">심사 메모</span>
                  <textarea
                    rows={3}
                    className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={acting}
                    onClick={() => void patchStatus("REVIEWING")}
                    className="rounded-md border px-3 py-1.5 text-xs font-semibold"
                  >
                    심사 중
                  </button>
                  <button
                    type="button"
                    disabled={acting}
                    onClick={() => void patchStatus("REJECTED")}
                    className="inline-flex items-center gap-1 rounded-md border border-destructive px-3 py-1.5 text-xs font-semibold text-destructive"
                  >
                    <X className="h-3 w-3" />
                    반려
                  </button>
                  <button
                    type="button"
                    disabled={acting || detail.status === "APPROVED"}
                    onClick={() => void approve()}
                    className="inline-flex items-center gap-1 rounded-md bg-[#FF6600] px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    {acting ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Check className="h-3 w-3" />
                    )}
                    승인 → Media 생성
                  </button>
                </div>
                {detail.createdMediaId ? (
                  <a
                    href={`/${locale}/admin/medias/${detail.createdMediaId}/edit`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
                  >
                    생성된 매체 편집
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
