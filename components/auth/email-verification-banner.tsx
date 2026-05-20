"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { Mail, X } from "lucide-react";
import { useLocale } from "next-intl";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  onDismiss?: () => void;
};

export function EmailVerificationBanner({ className, onDismiss }: Props) {
  const locale = useLocale();
  const isKo = locale === "ko";
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (dismissed) return null;

  async function resend() {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/verify-email/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(
          data?.error?.message ??
            (isKo ? "재발송에 실패했습니다." : "Failed to resend."),
        );
        return;
      }
      setSent(true);
    } catch {
      setError(isKo ? "네트워크 오류가 발생했습니다." : "Network error.");
    } finally {
      setSending(false);
    }
  }

  function dismiss() {
    setDismissed(true);
    onDismiss?.();
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-amber-500/35 bg-gradient-to-r from-amber-500/15 via-violet-500/10 to-cyan-500/10 px-4 py-3 backdrop-blur-sm dark:border-amber-400/25 dark:from-amber-500/10 sm:px-5",
        className,
      )}
      role="status"
    >
      <div className="flex flex-wrap items-start gap-3 sm:items-center">
        <Mail
          className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            {isKo ? "이메일 인증이 필요합니다" : "Verify your email"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {sent
              ? isKo
                ? "인증 메일을 다시 보냈습니다. 받은편지함을 확인해 주세요."
                : "Verification email sent. Check your inbox."
              : isKo
                ? "가입 시 발송된 링크로 인증하거나, 재발송·설정에서 확인할 수 있습니다."
                : "Use the link we sent at signup, or resend from settings."}
          </p>
          {error && (
            <p className="mt-1 font-mono text-[11px] text-destructive">{error}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void resend()}
            disabled={sending || sent}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/90 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted/60 disabled:opacity-60 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
          >
            {sending && <Spinner size="sm" />}
            {isKo ? "인증 메일 재발송" : "Resend email"}
          </button>
          <Link
            href="/my/settings"
            className="rounded-lg border border-border bg-card/80 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted/60 dark:border-white/15 dark:bg-white/5 dark:text-white/90 dark:hover:bg-white/10"
          >
            {isKo ? "설정" : "Settings"}
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground dark:hover:bg-white/10 dark:hover:text-white"
            aria-label={isKo ? "닫기" : "Dismiss"}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
