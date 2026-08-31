"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, X, Calendar as CalIcon, AlertTriangle } from "lucide-react";
import { TurnstileWidget } from "@/components/turnstile";

type Props = {
  open: boolean;
  mediaId: string;
  mediaName: string;
  /** 캘린더 위젯이 fetch 한 차단 범위 — 폼에서 같은 기간 선택 시 경고 */
  blockedRanges?: { start: string; end: string }[];
  /** 가입 사용자 prefill (있으면 이메일·이름 자동 입력) */
  prefill?: {
    name?: string;
    email?: string;
  };
  onClose: () => void;
  /** 제출 성공 시 호출 (예: toast / 캘린더 새로고침) */
  onSuccess?: (id: string) => void;
};

/**
 * 광고주 자가 예약 신청 모달.
 * - 시작일 / 종료일 / 이름 / 이메일 / 연락처 / 예산(만원) / 메모
 * - Turnstile (운영 도메인만 활성)
 * - 약관 동의 체크박스
 * - blockedRanges 와 겹치면 경고 (제출은 가능 — 운영자가 검토 후 다른 일정 제안)
 */
export function BookingRequestModal({
  open,
  mediaId,
  mediaName,
  blockedRanges = [],
  prefill,
  onClose,
  onSuccess,
}: Props) {
  const t = useTranslations("mediaDetail.bookingRequest");

  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [name, setName] = useState(prefill?.name ?? "");
  const [email, setEmail] = useState(prefill?.email ?? "");
  const [phone, setPhone] = useState("");
  /** 광고주 입력 단위는 만원 — 서버 전송 시 ×10000 */
  const [budgetMan, setBudgetMan] = useState("");
  const [notes, setNotes] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 모달 열릴 때마다 상태 리셋 (prefill 은 유지)
  useEffect(() => {
    if (open) {
      setError(null);
      setBusy(false);
    }
  }, [open]);

  // ESC 닫기
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Turnstile 운영 도메인 판정 — 매체 상세 캘린더와 동일 정책
  const isProductionDomain =
    typeof window !== "undefined" &&
    (window.location.hostname === "tkad.co.kr" ||
      window.location.hostname === "www.tkad.co.kr");
  const turnstileEnabled =
    isProductionDomain &&
    (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim().length ?? 0) >= 20;

  // 유효성 (UI 단)
  const datesValid = (() => {
    if (!startsAt || !endsAt) return false;
    const s = new Date(startsAt);
    const e = new Date(endsAt);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return false;
    return e > s && s >= new Date(new Date().setHours(0, 0, 0, 0));
  })();
  const overlapsBlocked = useMemo(() => {
    if (!datesValid) return false;
    const s = new Date(startsAt).getTime();
    const e = new Date(endsAt).getTime();
    return blockedRanges.some((r) => {
      const rs = new Date(r.start).getTime();
      const re = new Date(r.end).getTime();
      return rs < e && re > s;
    });
  }, [startsAt, endsAt, blockedRanges, datesValid]);

  const canSubmit =
    datesValid &&
    name.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    agreeTerms &&
    (turnstileEnabled ? turnstileToken.length > 0 : true) &&
    !busy;

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);

    const budgetWon = (() => {
      const n = Number(budgetMan);
      if (!Number.isFinite(n) || n <= 0) return null;
      return Math.round(n * 10_000);
    })();

    try {
      const res = await fetch(
        `/api/public/media/${encodeURIComponent(mediaId)}/booking-request`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startsAt: new Date(startsAt).toISOString(),
            endsAt: new Date(endsAt).toISOString(),
            requesterName: name.trim(),
            requesterEmail: email.trim(),
            requesterPhone: phone.trim() || undefined,
            budgetWon,
            notes: notes.trim() || undefined,
            agreeTerms: true,
            turnstileToken: turnstileToken || undefined,
          }),
        },
      );
      const data = (await res.json()) as { ok?: boolean; id?: string; error?: string };
      if (!res.ok || !data.ok || !data.id) {
        setError(data.error ?? "신청을 저장하지 못했습니다.");
        return;
      }
      onSuccess?.(data.id);
      onClose();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-request-modal-title"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto dark:bg-black bg-white dark:bg-white/5 bg-gray-500 p-4 sm:items-center"
    >
      <div className="relative w-full max-w-xl border-2 border-border bg-card">
        <div className="flex items-center justify-between border-b-2 border-border px-5 py-4">
          <div>
            <p className="tkad-type-label text-accent">
              [ {t("eyebrow")} ]
            </p>
            <h3
              id="booking-request-modal-title"
              className="mt-1 text-base font-bold tracking-tight text-foreground"
            >
              <CalIcon className="mr-1.5 inline-block h-4 w-4 text-accent" aria-hidden />
              {t("title")}
            </h3>
            <p className="mt-1 line-clamp-1 tkad-type-label text-muted-foreground">
              {`// `}{mediaName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="border-2 border-border bg-card p-1.5 transition-colors hover:bg-foreground hover:text-background"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          {/* 시작 / 종료 */}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="tkad-type-label text-muted-foreground">
                {t("startsAt")} *
              </span>
              <input
                type="datetime-local"
                required
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="mt-1 w-full border-2 border-border bg-card px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="tkad-type-label text-muted-foreground">
                {t("endsAt")} *
              </span>
              <input
                type="datetime-local"
                required
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="mt-1 w-full border-2 border-border bg-card px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              />
            </label>
          </div>

          {overlapsBlocked ? (
            <p className="flex items-start gap-2 border-2 border-accent bg-accent/10 px-3 py-2 tkad-type-caption tracking-tight text-accent">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {t("overlapWarning")}
            </p>
          ) : null}

          {/* 이름 / 이메일 */}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="tkad-type-label text-muted-foreground">
                {t("name")} *
              </span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("namePlaceholder")}
                maxLength={80}
                className="mt-1 w-full border-2 border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="tkad-type-label text-muted-foreground">
                {t("email")} *
              </span>
              {/* type="text" + inputMode — Safari/iOS 의 type="email" 검증 회피
                  서버 zod 가 정식 검증 */}
              <input
                type="text"
                inputMode="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@domain.com"
                className="mt-1 w-full border-2 border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
              />
            </label>
          </div>

          {/* 연락처 / 예산 */}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="tkad-type-label text-muted-foreground">
                {t("phone")}
              </span>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010-1234-5678"
                maxLength={40}
                className="mt-1 w-full border-2 border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="tkad-type-label text-muted-foreground">
                {t("budget")}
              </span>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={budgetMan}
                onChange={(e) => setBudgetMan(e.target.value)}
                placeholder={t("budgetPlaceholder")}
                className="mt-1 w-full border-2 border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
              />
            </label>
          </div>

          {/* 메모 */}
          <label className="block">
            <span className="tkad-type-label text-muted-foreground">
              {t("notes")}
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("notesPlaceholder")}
              maxLength={2000}
              rows={3}
              className="mt-1 w-full resize-y border-2 border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
            />
          </label>

          {/* honeypot — bot 차단 (사람에겐 안 보임) */}
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            className="absolute -left-[9999px] h-0 w-0 opacity-0"
            aria-hidden
          />

          {/* Turnstile */}
          {turnstileEnabled ? (
            <div>
              <p className="tkad-type-label text-muted-foreground">
                {t("captcha")}
              </p>
              <div className="mt-1">
                <TurnstileWidget onVerify={setTurnstileToken} />
              </div>
            </div>
          ) : null}

          {/* 약관 동의 */}
          <label className="flex items-start gap-2 text-xs text-foreground">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 border-2 border-border"
              required
            />
            <span className="leading-relaxed">{t("agreeTerms")}</span>
          </label>

          {error ? (
            <p className="border-2 border-accent bg-card px-3 py-2 tkad-type-caption tracking-tight text-accent">
              {`// `}{error}
            </p>
          ) : null}

          {/* 제출 / 취소 */}
          <div className="flex flex-wrap gap-2 border-t-2 border-border/10 pt-4">
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center gap-2 border-2 border-accent bg-accent px-5 py-2.5 tkad-type-label text-accent-foreground transition-colors hover:bg-foreground hover:border-border disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {t("submitting")}
                </>
              ) : (
                t("submit")
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 border-2 border-border bg-card px-5 py-2.5 tkad-type-label text-foreground transition-colors hover:bg-foreground hover:text-background"
            >
              {t("cancel")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
