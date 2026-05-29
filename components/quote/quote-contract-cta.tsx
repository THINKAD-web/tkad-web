"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CheckCircle2, FileSignature } from "lucide-react";
import { cn } from "@/lib/utils";

export type QuoteContractCtaProps = {
  quoteId: string;
  status: string;
  contractSigned: boolean;
  /** false여도 booking_confirmed면 서명 페이지로 안내 */
  canSignContract?: boolean;
  className?: string;
};

export function QuoteContractCta({
  quoteId,
  status,
  contractSigned,
  canSignContract = true,
  className,
}: QuoteContractCtaProps) {
  const t = useTranslations("quoteCustomer");

  if (contractSigned) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-500/30 dark:bg-emerald-500/10",
          className,
        )}
      >
        <div className="flex items-center gap-2">
          <CheckCircle2
            className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400"
            aria-hidden
          />
          <p className="font-bold text-gray-900 dark:text-white">
            {t("contractSignedTitle")}
          </p>
        </div>
        <p className="mt-2 text-sm text-gray-600 dark:text-white/60">
          {t("contractSignedBody")}
        </p>
        <a
          href={`/api/quote/${quoteId}/contract/signed`}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-300"
        >
          {t("contractSignedDownload")} →
        </a>
      </div>
    );
  }

  if (status !== "booking_confirmed") {
    return null;
  }

  return (
    <div
      className={cn(
        "my-4 rounded-2xl border border-violet-200 bg-violet-50 p-5 dark:border-violet-500/30 dark:bg-violet-500/10",
        className,
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <FileSignature
          className="h-5 w-5 shrink-0 text-violet-600 dark:text-violet-400"
          aria-hidden
        />
        <p className="font-bold text-gray-900 dark:text-white">
          {t("contractSignNeededTitle")}
        </p>
      </div>
      <p className="mb-4 text-sm text-gray-600 dark:text-white/60">
        {t("contractSignNeededBody")}
      </p>
      <Link
        href={`/quote/${quoteId}/contract`}
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-95"
      >
        {t("openContract")} →
      </Link>
      {!canSignContract ? (
        <p className="mt-3 text-[11px] text-gray-500 dark:text-white/45">
          {t("contractSignRetryHint")}
        </p>
      ) : null}
    </div>
  );
}
