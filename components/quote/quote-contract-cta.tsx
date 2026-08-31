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
          className="mt-4 inline-flex items-center gap-2 tkad-type-title text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-300"
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
        "my-4 rounded-2xl border border-[color:var(--qp-accent)]/30 bg-[color:var(--qp-accent-soft)] p-5",
        className,
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <FileSignature
          className="h-5 w-5 shrink-0 text-[color:var(--qp-accent)]"
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
        className="inline-flex items-center gap-2 rounded-xl bg-[color:var(--qp-accent)] px-5 py-2.5 tkad-type-title text-white shadow-sm transition-colors hover:bg-[color:var(--qp-accent-hover)]"
      >
        {t("openContract")} →
      </Link>
      {!canSignContract ? (
        <p className="mt-3 tkad-type-caption text-gray-500 dark:text-white/45">
          {t("contractSignRetryHint")}
        </p>
      ) : null}
    </div>
  );
}
