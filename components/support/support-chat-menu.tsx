"use client";

import { Bot, MessageCircle, Phone, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { KAKAO_CHANNEL_PUBLIC_URL } from "@/lib/kakao-public";
import type { SupportHoursStatus } from "@/lib/support-chat-hours";
import { cn } from "@/lib/utils";

const PHONE_HREF = "tel:02-515-2772";

type Props = {
  open: boolean;
  onClose: () => void;
  hours: SupportHoursStatus;
  onOpenAi: () => void;
};

export function SupportChatMenu({ open, onClose, hours, onOpenAi }: Props) {
  const t = useTranslations("supportChat");

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label={t("menuLabel")}
      className="relative w-[min(20rem,calc(100vw-5rem))] overflow-hidden rounded-2xl border border-gray-200 bg-white text-gray-900 shadow-xl dark:border-white/12 dark:bg-gray-900 dark:text-white"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.12] tkad-neon-grid"
      />
      <div className="relative p-4">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <p className="font-display text-xs font-medium uppercase tracking-[0.2em] text-gray-400 dark:text-white/40">
              {t("brandEyebrow")}
            </p>
            <p className="mt-1 text-base font-semibold tracking-tight text-gray-900 dark:text-white">
              {t("brandTitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border dark:border-white/12 border-gray-200 dark:bg-white/5 bg-gray-50 dark:text-white text-gray-700 hover:dark:bg-white/10 bg-gray-100"
            aria-label={t("close")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm leading-relaxed text-gray-500 dark:text-white/60">{t("greeting")}</p>

        <div
          className={cn(
            "mt-3 flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium",
            hours.isOpen
              ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-100"
              : "dark:border-white/12 border-gray-200 dark:bg-white/5 bg-gray-50 dark:text-white text-gray-600",
          )}
        >
          <span
            className={cn(
              "h-2 w-2 shrink-0 rounded-full",
              hours.isOpen
                ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]"
                : "bg-white/40",
            )}
            aria-hidden
          />
          <span>{hours.isOpen ? t("hoursOpen") : t("hoursClosed")}</span>
        </div>

        <ul className="mt-4 space-y-2">
          {!hours.isOpen ? (
            <li>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAi();
                }}
                className="flex w-full items-center gap-3 rounded-xl border dark:border-white/14 border-gray-200 bg-[linear-gradient(135deg,rgba(168,85,247,0.85),rgba(34,211,238,0.85))] px-3 py-3 text-sm font-bold dark:text-white text-gray-900 shadow-md shadow-violet-500/20 transition hover:brightness-110"
              >
                <Bot className="h-5 w-5 shrink-0" aria-hidden />
                {t("aiCtaAfterHours")}
              </button>
            </li>
          ) : null}
          <li>
            <a
              href={KAKAO_CHANNEL_PUBLIC_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className="flex w-full items-center gap-3 rounded-xl border border-[#FEE500]/40 bg-[#FEE500] px-3 py-3 text-sm font-bold text-[#191600] shadow-sm transition hover:brightness-105"
            >
              <MessageCircle className="h-5 w-5 shrink-0" aria-hidden />
              {t("kakaoCta")}
            </a>
          </li>
          {hours.isOpen ? (
            <li>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAi();
                }}
                className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-gray-100 px-3 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-200 dark:border-white/14 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
              >
                <Bot className="h-5 w-5 shrink-0" aria-hidden />
                {t("aiCta")}
              </button>
            </li>
          ) : null}
          <li>
            <a
              href={PHONE_HREF}
              onClick={onClose}
              className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-gray-100 px-3 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-200 dark:border-white/12 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
            >
              <Phone className="h-5 w-5 shrink-0 text-cyan-600 dark:text-cyan-400" aria-hidden />
              {t("phoneCta")}
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
