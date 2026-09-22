"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

type Props = {
  quoteId: string;
  className?: string;
  title: string;
};

/** 계약 PDF 미리보기 — API fetch 후 blob URL (Bunny/iframe 호환) */
export default function ContractPdfPreview({ quoteId, className, title }: Props) {
  const t = useTranslations("quoteContract");
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let revoked: string | null = null;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setFailed(false);
      try {
        const res = await fetch(`/api/quote/${quoteId}/contract/preview`, {
          cache: "no-store",
        });
        if (!res.ok) {
          if (!cancelled) setFailed(true);
          return;
        }
        const blob = await res.blob();
        if (blob.size < 100 || blob.type.includes("text")) {
          if (!cancelled) setFailed(true);
          return;
        }
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
  }, [quoteId]);

  if (loading) {
    return (
      <div
        className={`flex min-h-[240px] items-center justify-center gap-2 border-2 border-border bg-muted tkad-type-label text-muted-foreground ${className ?? ""}`}
      >
        <Loader2 className="h-5 w-5 animate-spin text-accent" />
        {t("previewLoading")}
      </div>
    );
  }

  if (failed || !blobUrl) {
    return (
      <div
        className={`space-y-3 border-2 border-border bg-muted p-6 text-center ${className ?? ""}`}
      >
        <p className="text-sm text-muted-foreground">{t("previewFailed")}</p>
        <a
          href={`/api/quote/${quoteId}/contract/preview`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex border-2 border-border bg-card px-4 py-2 tkad-type-label text-foreground hover:border-accent"
        >
          {t("previewOpenTab")}
        </a>
      </div>
    );
  }

  return (
    <iframe
      title={title}
      src={blobUrl}
      className={className ?? "h-[min(70vh,720px)] w-full border-0 bg-white"}
    />
  );
}
