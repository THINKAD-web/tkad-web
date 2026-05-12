"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { BtnBlock } from "@/components/brutalist";
import { Loader2, Eraser, FileDown, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/toast-provider";
import type SignatureCanvas from "react-signature-canvas";
import OohSignaturePad from "@/components/ooh-signature-pad";

type Session = {
  clientName: string;
  clientEmail: string;
  clientCompany: string | null;
  canSign: boolean;
  signed: boolean;
};

export default function ContractSignClient({ quoteId }: { quoteId: string }) {
  const t = useTranslations("quoteContract");
  const { toast } = useToast();
  const sigRef = useRef<SignatureCanvas>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [agree, setAgree] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");

  const loadSession = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/quote/${quoteId}/contract/session`, {
        cache: "no-store",
      });
      const raw: unknown = await res.json();
      if (!res.ok) {
        setSession(null);
        return;
      }
      const s = raw as Session;
      setSession(s);
      setSignerName(s.clientName);
      setSignerEmail(s.clientEmail || "");
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, [quoteId]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const clearSig = () => {
    sigRef.current?.clear();
  };

  const submit = async () => {
    if (!agree) {
      toast("warning", t("needAgree"));
      return;
    }
    if (!signerName.trim() || !signerEmail.trim()) {
      toast("warning", t("needContact"));
      return;
    }
    const dataUrl = sigRef.current?.toDataURL("image/png");
    if (!dataUrl || dataUrl.length < 200) {
      toast("warning", t("needSignature"));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/quote/${quoteId}/contract/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agree: true,
          signaturePngBase64: dataUrl,
          signerName: signerName.trim(),
          signerEmail: signerEmail.trim(),
        }),
      });
      const raw: unknown = await res.json();
      if (!res.ok) {
        const msg =
          typeof raw === "object" &&
          raw !== null &&
          "error" in raw &&
          typeof (raw as { error?: unknown }).error === "string"
            ? (raw as { error: string }).error
            : t("submitFail");
        toast("error", msg);
        return;
      }
      toast("success", t("submitOk"));
      void loadSession();
    } catch {
      toast("error", t("submitFail"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 font-mono text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
        {`// LOADING`}
      </div>
    );
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-lg border-2 border-accent bg-card py-10 text-center">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
          [ UNAVAILABLE ]
        </p>
        <p className="mt-3 px-4 text-sm text-foreground">{t("unavailable")}</p>
      </div>
    );
  }

  if (session.signed) {
    return (
      <div className="mx-auto max-w-lg space-y-6 border-2 border-accent bg-card p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center border-2 border-accent bg-accent text-accent-foreground">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
          [ SIGNED ]
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t("signedTitle")}
        </h1>
        <p className="font-mono text-[12px] tracking-tight text-muted-foreground">
          {`// `}{t("signedBody")}
        </p>
        <div className="flex flex-col items-center gap-3">
          <a
            href={`/api/quote/${quoteId}/contract/signed`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 border-2 border-border bg-hero-void px-6 py-3 font-mono text-xs font-bold uppercase tracking-[0.18em] text-hero-fg transition-colors hover:bg-accent hover:border-accent"
          >
            <FileDown className="h-4 w-4" />
            {t("downloadSigned")}
          </a>
          <BtnBlock href={`/quote/${quoteId}`} variant="secondary" size="md">
            {t("backQuote")}
          </BtnBlock>
        </div>
      </div>
    );
  }

  if (!session.canSign) {
    return (
      <div className="mx-auto max-w-lg border-2 border-border bg-muted py-10 text-center">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
          [ NOT READY ]
        </p>
        <p className="mt-3 px-4 text-sm text-foreground">{t("notYet")}</p>
        <div className="mt-6 flex justify-center">
          <BtnBlock href={`/quote/${quoteId}`} variant="secondary" size="md">
            {t("backQuote")}
          </BtnBlock>
        </div>
      </div>
    );
  }

  const previewSrc = `/api/quote/${quoteId}/contract/preview`;

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-10">
      <div>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
          [ CONTRACT SIGN ]
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {t("title")}
        </h1>
        <p className="mt-1 font-mono text-[11px] tracking-tight text-muted-foreground">
          {`// `}{t("subtitle")}
        </p>
      </div>

      <div className="border-2 border-border bg-card">
        <div className="border-b-2 border-border p-5">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
            [ PREVIEW ]
          </p>
          <h2 className="mt-2 text-base font-bold tracking-tight text-foreground">
            {t("previewTitle")}
          </h2>
        </div>
        <div className="p-5">
          <div className="overflow-hidden border-2 border-border bg-muted">
            <iframe
              title="contract-preview"
              src={previewSrc}
              className="h-[min(70vh,720px)] w-full"
            />
          </div>
        </div>
      </div>

      <div className="border-2 border-border bg-card">
        <div className="border-b-2 border-border p-5">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
            [ SIGNATURE ]
          </p>
          <h2 className="mt-2 text-base font-bold tracking-tight text-foreground">
            {t("signTitle")}
          </h2>
        </div>
        <div className="space-y-4 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
                [ {t("signerName")} ]
              </label>
              <input
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                className="h-11 w-full border-2 border-border bg-card px-3 font-mono text-sm text-foreground focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
                [ {t("signerEmail")} ]
              </label>
              <input
                type="email"
                value={signerEmail}
                onChange={(e) => setSignerEmail(e.target.value)}
                className="h-11 w-full border-2 border-border bg-card px-3 font-mono text-sm text-foreground focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          <div>
            <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
              [ {t("padLabel")} ]
            </p>
            <div className="border-2 border-border bg-card">
              <OohSignaturePad ref={sigRef} />
            </div>
            <div className="mt-2">
              <BtnBlock variant="secondary" size="sm" onClick={clearSig}>
                <Eraser className="h-3 w-3" />
                {t("clearPad")}
              </BtnBlock>
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-3 border-2 border-border bg-muted p-3 text-sm">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="mt-1 h-4 w-4 accent-cta"
            />
            <span className="text-foreground">{t("agreeLabel")}</span>
          </label>

          <BtnBlock
            variant="accent"
            size="lg"
            disabled={submitting}
            onClick={() => void submit()}
            className="w-full sm:w-auto"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              t("submit")
            )}
          </BtnBlock>
        </div>
      </div>
    </div>
  );
}
