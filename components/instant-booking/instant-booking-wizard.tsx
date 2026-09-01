"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Upload,
} from "lucide-react";
import { BtnBlock } from "@/components/brutalist";
import { useToast } from "@/components/toast-provider";
import {
  calculateInstantBookingAmount,
  creativeSpecGuide,
} from "@/lib/instant-booking-pricing";
import { uploadInstantBookingCreative } from "@/lib/instant-booking-upload";
import type { MediaItem } from "@/lib/media-data";
import { rangeHasBlockedDays } from "@/lib/calendar-date-range";
import { CreativeLibraryPicker } from "@/components/creatives/library-picker";
import { Link } from "@/i18n/navigation";
import type { CreativeListItem } from "@/lib/creatives/types";

type Props = {
  media: MediaItem;
  locale: string;
  initialRange?: { start: string; end: string };
  prefill?: { name?: string; email?: string; phone?: string };
};

type BlockedRange = { start: string; end: string };

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseYmd(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function isBlocked(day: Date, ranges: BlockedRange[]): boolean {
  const t = day.getTime();
  for (const r of ranges) {
    const start = new Date(r.start);
    start.setHours(0, 0, 0, 0);
    const end = new Date(r.end);
    end.setHours(23, 59, 59, 999);
    if (t >= start.getTime() && t <= end.getTime()) return true;
  }
  return false;
}

export function InstantBookingWizard({ media, locale, initialRange, prefill }: Props) {
  const t = useTranslations("instantBooking");
  const { toast } = useToast();
  const router = useRouter();
  const isKo = locale === "ko";

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [viewMonth, setViewMonth] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<BlockedRange[]>([]);
  const [loadingCal, setLoadingCal] = useState(true);
  const [creativeUrl, setCreativeUrl] = useState("");
  const [creativeType, setCreativeType] = useState("");
  const [creativeId, setCreativeId] = useState<string | null>(null);
  const [creativeSource, setCreativeSource] = useState<"library" | "upload">(
    "library",
  );
  const [uploading, setUploading] = useState(false);
  const [contactName, setContactName] = useState(prefill?.name ?? "");
  const [contactEmail, setContactEmail] = useState(prefill?.email ?? "");
  const [contactPhone, setContactPhone] = useState(prefill?.phone ?? "");
  const [submitting, setSubmitting] = useState(false);

  const spec = useMemo(() => creativeSpecGuide(media), [media]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingCal(true);
      try {
        const res = await fetch(
          `/api/public/media/${encodeURIComponent(media.id)}/availability`,
        );
        const data = (await res.json()) as {
          blockedRanges?: BlockedRange[];
        };
        if (!cancelled) {
          setBlocked(
            (data.blockedRanges ?? []).map((r) => ({
              start: r.start,
              end: r.end,
            })),
          );
        }
      } catch {
        if (!cancelled) toast("error", t("calendarError"));
      } finally {
        if (!cancelled) setLoadingCal(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [media.id, t, toast]);

  useEffect(() => {
    if (!initialRange?.start || !initialRange.end) return;
    const start = parseYmd(initialRange.start);
    const end = parseYmd(initialRange.end);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (start < today || end < start) return;
    if (rangeHasBlockedDays(start, end, blocked)) return;
    setRangeStart(initialRange.start);
    setRangeEnd(initialRange.end);
    setViewMonth(new Date(start.getFullYear(), start.getMonth(), 1));
  }, [initialRange, blocked]);

  const amountPreview = useMemo(() => {
    if (!rangeStart || !rangeEnd) return 0;
    return calculateInstantBookingAmount({
      monthlyPriceWon: media.price,
      pricePeriod: media.pricePeriod,
      startDate: parseYmd(rangeStart),
      endDate: parseYmd(rangeEnd),
      media, // 등록 상품가 우선 경로 (V-5·R-1)
    });
  }, [media, rangeStart, rangeEnd]);

  const onDayClick = useCallback(
    (day: Date) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (day < today || isBlocked(day, blocked)) return;
      const key = ymd(day);
      if (!rangeStart || (rangeStart && rangeEnd)) {
        setRangeStart(key);
        setRangeEnd(null);
        return;
      }
      const start = parseYmd(rangeStart);
      if (day < start) {
        setRangeStart(key);
        setRangeEnd(null);
        return;
      }
      let ok = true;
      for (let d = new Date(start); d <= day; d.setDate(d.getDate() + 1)) {
        if (isBlocked(d, blocked)) {
          ok = false;
          break;
        }
      }
      if (!ok) {
        toast("error", t("rangeBlocked"));
        return;
      }
      setRangeEnd(key);
    },
    [blocked, rangeEnd, rangeStart, t, toast],
  );

  const cells = useMemo(() => {
    const y = viewMonth.getFullYear();
    const mo = viewMonth.getMonth();
    const first = new Date(y, mo, 1);
    const last = new Date(y, mo + 1, 0);
    const startPad = (first.getDay() + 6) % 7;
    const out: ({ date: Date; day: number } | null)[] = [];
    for (let i = 0; i < startPad; i++) out.push(null);
    for (let d = 1; d <= last.getDate(); d++) {
      out.push({ day: d, date: new Date(y, mo, d) });
    }
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [viewMonth]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const result = await uploadInstantBookingCreative(file);
      setCreativeUrl(result.secureUrl);
      setCreativeType(result.resourceType);
      setCreativeId(null); // 즉시 업로드는 라이브러리 행 없음
      toast("success", t("uploadDone"));
    } catch (e) {
      toast("error", e instanceof Error ? e.message : t("uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  const handlePickFromLibrary = (item: CreativeListItem) => {
    setCreativeUrl(item.url);
    setCreativeType(item.type);
    setCreativeId(item.id);
    toast("success", `${item.name} 을(를) 선택했습니다.`);
  };

  const submitBooking = async () => {
    if (!rangeStart || !rangeEnd || !creativeUrl) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/instant-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaId: media.id,
          startDate: rangeStart,
          endDate: rangeEnd,
          creativeUrl,
          creativeType,
          creativeId,
          contactName,
          contactEmail,
          contactPhone,
        }),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !data.id) {
        throw new Error(data.error ?? t("submitFailed"));
      }
      router.push(`/bookings/${data.id}/pay`);
    } catch (e) {
      toast("error", e instanceof Error ? e.message : t("submitFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <ol className="flex gap-2 tkad-type-label text-muted-foreground">
        {[1, 2, 3].map((n) => (
          <li
            key={n}
            className={
              step === n
                ? "rounded-full border border-primary px-3 py-1 text-primary"
                : "rounded-full border border-border px-3 py-1"
            }
          >
            {t(`step${n}` as "step1")}
          </li>
        ))}
      </ol>

      {step === 1 ? (
        <section className="space-y-4">
          <h2 className="font-display text-sm font-black uppercase tracking-[0.2em]">
            {t("datesTitle")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("datesDesc")}</p>
          {loadingCal ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("calendarLoading")}
            </p>
          ) : (
            <div className="rounded-[20px] border border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <button
                  type="button"
                  className="rounded-lg border border-border p-2"
                  onClick={() =>
                    setViewMonth(
                      (m) => new Date(m.getFullYear(), m.getMonth() - 1, 1),
                    )
                  }
                  aria-label={t("prevMonth")}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-bold">
                  {viewMonth.getFullYear()}.
                  {String(viewMonth.getMonth() + 1).padStart(2, "0")}
                </span>
                <button
                  type="button"
                  className="rounded-lg border border-border p-2"
                  onClick={() =>
                    setViewMonth(
                      (m) => new Date(m.getFullYear(), m.getMonth() + 1, 1),
                    )
                  }
                  aria-label={t("nextMonth")}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center tkad-type-note font-display uppercase text-muted-foreground">
                {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-7 gap-1">
                {cells.map((cell, i) => {
                  if (!cell) return <span key={`e-${i}`} />;
                  const key = ymd(cell.date);
                  const inRange =
                    rangeStart &&
                    rangeEnd &&
                    key >= rangeStart &&
                    key <= rangeEnd;
                  const blockedDay = isBlocked(cell.date, blocked);
                  const selected =
                    key === rangeStart || key === rangeEnd || inRange;
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={blockedDay}
                      onClick={() => onDayClick(cell.date)}
                      className={`min-h-9 rounded-lg text-sm font-medium ${ blockedDay ? "cursor-not-allowed bg-muted/40 text-muted-foreground line-through" : selected ? "bg-primary text-primary-foreground" : "hover:bg-muted" }`}
                    >
                      {cell.day}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {rangeStart && rangeEnd ? (
            <p className="text-sm">
              {rangeStart} → {rangeEnd} ·{" "}
              <strong>{amountPreview.toLocaleString(isKo ? "ko-KR" : "en-US")}원</strong>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">{t("selectRange")}</p>
          )}
          <BtnBlock
            variant="accent"
            disabled={!rangeStart || !rangeEnd}
            onClick={() => setStep(2)}
          >
            <CalendarDays className="h-4 w-4" />
            {t("next")}
          </BtnBlock>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="space-y-4">
          <h2 className="font-display text-sm font-black uppercase tracking-[0.2em]">
            {t("creativeTitle")}
          </h2>
          <ul className="list-inside list-disc text-sm text-muted-foreground">
            {(isKo ? spec.ko : spec.en).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>

          {/* 라이브러리 / 신규 업로드 토글 */}
          <div className="inline-flex rounded-full border-2 border-border bg-card p-0.5">
            <button
              type="button"
              onClick={() => setCreativeSource("library")}
              className={`rounded-full px-4 py-1.5 tkad-type-label transition-colors ${ creativeSource === "library" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground" }`}
            >
              {isKo ? "내 라이브러리" : "My Library"}
            </button>
            <button
              type="button"
              onClick={() => setCreativeSource("upload")}
              className={`rounded-full px-4 py-1.5 tkad-type-label transition-colors ${ creativeSource === "upload" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground" }`}
            >
              {isKo ? "새로 업로드" : "Upload New"}
            </button>
          </div>

          {creativeSource === "library" ? (
            <div className="space-y-2">
              <CreativeLibraryPicker
                selectedId={creativeId}
                onSelect={handlePickFromLibrary}
              />
              <p className="tkad-type-label text-muted-foreground">
                {isKo ? "처음이신가요?" : "First time?"}{" "}
                <Link
                  href="/creatives/upload"
                  className="border-b border-border pb-0.5 font-bold text-foreground hover:border-accent hover:text-accent"
                >
                  {isKo ? "라이브러리에 소재 업로드 →" : "Upload to library →"}
                </Link>
              </p>
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-[20px] border border-dashed border-border bg-muted/30 p-8">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm font-medium">{t("uploadLabel")}</span>
              <input
                type="file"
                accept="image/*,video/mp4,video/quicktime"
                className="sr-only"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleUpload(f);
                }}
              />
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : creativeUrl && !creativeId ? (
                <span className="text-xs text-primary">{t("uploadDone")}</span>
              ) : null}
            </label>
          )}

          {creativeUrl ? (
            <div className="rounded-2xl border-2 border-border bg-card p-3">
              <p className="mb-2 tkad-type-label text-accent">
                {isKo
                  ? creativeId
                    ? "[ 선택된 소재 — 라이브러리 ]"
                    : "[ 업로드된 소재 ]"
                  : creativeId
                    ? "[ Selected — from library ]"
                    : "[ Uploaded ]"}
              </p>
              {creativeType === "video" ? (
                <video
                  src={creativeUrl}
                  controls
                  className="max-h-48 w-full rounded-md"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={creativeUrl}
                  alt=""
                  className="max-h-48 w-full rounded-md object-contain"
                />
              )}
            </div>
          ) : null}

          <div className="flex gap-2">
            <BtnBlock variant="secondary" onClick={() => setStep(1)}>
              {t("back")}
            </BtnBlock>
            <BtnBlock
              variant="accent"
              disabled={!creativeUrl}
              onClick={() => setStep(3)}
            >
              {t("next")}
            </BtnBlock>
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="space-y-4">
          <h2 className="font-display text-sm font-black uppercase tracking-[0.2em]">
            {t("contactTitle")}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              {t("name")}
              <input
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                required
              />
            </label>
            <label className="block text-sm">
              {t("email")}
              <input
                type="email"
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                required
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              {t("phone")}
              <input
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </label>
          </div>
          <div className="rounded-[16px] border border-border bg-muted/30 p-4 text-sm">
            <p className="font-semibold">{media.name}</p>
            <p>
              {rangeStart} ~ {rangeEnd}
            </p>
            <p className="mt-2 text-lg font-black">
              {amountPreview.toLocaleString(isKo ? "ko-KR" : "en-US")}원
            </p>
          </div>
          <div className="flex gap-2">
            <BtnBlock variant="secondary" onClick={() => setStep(2)}>
              {t("back")}
            </BtnBlock>
            <BtnBlock
              variant="accent"
              disabled={submitting || !contactName || !contactEmail}
              onClick={() => void submitBooking()}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {t("goToPay")}
            </BtnBlock>
          </div>
        </section>
      ) : null}
    </div>
  );
}
