"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, MessageSquarePlus } from "lucide-react";
import { BtnBlock } from "@/components/brutalist";
import { cn } from "@/lib/utils";

type Props = {
  quoteId: string;
  status: string;
  revisionMessage: string | null;
  revisionRequestedAt: string | null;
  onSubmitted?: () => void;
  embedded?: boolean;
};

export function QuoteRevisionRequestPanel({
  quoteId,
  status,
  revisionMessage,
  revisionRequestedAt,
  onSubmitted,
  embedded = false,
}: Props) {
  const t = useTranslations("quoteCustomer");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(revisionMessage ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [submittedAt, setSubmittedAt] = useState(revisionRequestedAt);

  if (status !== "sent") return null;

  const onSubmit = async () => {
    const message = draft.trim();
    if (message.length < 3 || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/quote/${quoteId}/revision-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) {
        window.alert(t("revisionRequestFail"));
        return;
      }
      const data = (await res.json()) as { revisionRequestedAt?: string };
      setSubmittedAt(data.revisionRequestedAt ?? new Date().toISOString());
      setOpen(false);
      onSubmitted?.();
    } catch {
      window.alert(t("revisionRequestFail"));
    } finally {
      setSubmitting(false);
    }
  };

  const body = (
    <div className="space-y-3">
      {submittedAt ? (
        <p className="text-sm text-foreground">{t("revisionRequestReceived")}</p>
      ) : null}
      {!open ? (
        <BtnBlock
          variant="secondary"
          size="md"
          onClick={() => setOpen(true)}
        >
          <MessageSquarePlus className="h-4 w-4" />
          {revisionMessage || submittedAt
            ? t("revisionRequestEdit")
            : t("revisionRequestButton")}
        </BtnBlock>
      ) : (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-foreground">
            {t("revisionRequestLabel")}
          </label>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder={t("revisionRequestPlaceholder")}
            className={cn(
              "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground",
              "focus:outline-none focus:ring-2 focus:ring-[color:var(--qp-accent)]/35",
            )}
          />
          <p className="tkad-type-caption text-muted-foreground">
            {t("revisionRequestHint")}
          </p>
          <div className="flex flex-wrap gap-2">
            <BtnBlock
              variant="accent"
              size="md"
              onClick={() => void onSubmit()}
              disabled={submitting || draft.trim().length < 3}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("revisionRequestSubmit")
              )}
            </BtnBlock>
            <BtnBlock
              variant="secondary"
              size="md"
              onClick={() => {
                setOpen(false);
                setDraft(revisionMessage ?? "");
              }}
              disabled={submitting}
            >
              {t("revisionRequestCancel")}
            </BtnBlock>
          </div>
        </div>
      )}
      {revisionMessage && !open ? (
        <blockquote className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">
          {revisionMessage}
        </blockquote>
      ) : null}
    </div>
  );

  if (embedded) {
    return (
      <div className="mt-4 border-t border-border pt-4 dark:border-white/10">
        <p className="mb-2 tkad-type-label text-accent">
          [ {t("revisionRequestTitle")} ]
        </p>
        {body}
      </div>
    );
  }

  return (
    <div className="border-2 border-border bg-card p-5">
      <p className="tkad-type-label text-accent">
        [ {t("revisionRequestTitle")} ]
      </p>
      <div className="mt-3">{body}</div>
    </div>
  );
}
