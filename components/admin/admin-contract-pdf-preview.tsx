"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink, Loader2 } from "lucide-react";

type Props = {
  quoteId: string;
  previewKey?: number;
  className?: string;
  title: string;
};

/** 어드민 계약 PDF — blob fetch (업로드 PDF·Bunny URL iframe 직접 로드 이슈 회피) */
export function AdminContractPdfPreview({
  quoteId,
  previewKey = 0,
  className,
  title,
}: Props) {
  const t = useTranslations("adminOohQuotes");
  const tQuote = useTranslations("quoteContract");
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  const adminPreviewPath = `/api/admin/ooh-quotes/${quoteId}/contract-preview`;

  useEffect(() => {
    let revoked: string | null = null;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setFailed(false);
      setBlobUrl(null);
      try {
        const res = await fetch(adminPreviewPath, {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) {
          if (!cancelled) setFailed(true);
          return;
        }
        const buf = await res.arrayBuffer();
        if (buf.byteLength < 100) {
          if (!cancelled) setFailed(true);
          return;
        }
        const head = new TextDecoder().decode(new Uint8Array(buf, 0, 5));
        if (!head.startsWith("%PDF-")) {
          if (!cancelled) setFailed(true);
          return;
        }
        const blob = new Blob([buf], { type: "application/pdf" });
        revoked = URL.createObjectURL(blob);
        if (!cancelled) setBlobUrl(revoked);
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [quoteId, previewKey, adminPreviewPath]);

  if (loading) {
    return (
      <div
        className={`flex min-h-[200px] items-center justify-center gap-2 rounded-xl border border-gray-200 bg-muted/30 text-muted-foreground dark:border-white/10 ${className ?? ""}`}
      >
        <Loader2 className="h-5 w-5 animate-spin" />
        {t("loading")}
      </div>
    );
  }

  if (failed || !blobUrl) {
    return (
      <div
        className={`space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center dark:border-amber-500/30 dark:bg-amber-950/30 ${className ?? ""}`}
      >
        <p className="text-xs text-amber-950 dark:text-amber-100">
          {tQuote("previewFailed")}
        </p>
        <a
          href={adminPreviewPath}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[color:var(--qp-accent)] hover:underline"
        >
          <ExternalLink className="h-3 w-3" aria-hidden />
          {t("contractPreviewNewTab")}
        </a>
      </div>
    );
  }

  return (
    <iframe
      title={title}
      src={blobUrl}
      className={
        className ??
        "h-[min(520px,70vh)] w-full rounded-xl border border-gray-200 bg-white dark:border-white/10"
      }
    />
  );
}
