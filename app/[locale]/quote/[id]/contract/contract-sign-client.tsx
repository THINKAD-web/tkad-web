"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <p className="py-16 text-center text-sm text-red-600">{t("unavailable")}</p>
    );
  }

  if (session.signed) {
    return (
      <div className="mx-auto max-w-lg space-y-6 py-10 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-green-600" />
        <h1 className="text-2xl font-bold text-navy">{t("signedTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("signedBody")}</p>
        <Button type="button" className="bg-navy text-white" asChild>
          <a
            href={`/api/quote/${quoteId}/contract/signed`}
            target="_blank"
            rel="noreferrer"
          >
            <FileDown className="mr-2 h-4 w-4" />
            {t("downloadSigned")}
          </a>
        </Button>
        <div>
          <Button type="button" variant="outline" asChild>
            <Link href={`/quote/${quoteId}`}>{t("backQuote")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!session.canSign) {
    return (
      <div className="mx-auto max-w-lg py-10 text-center">
        <p className="text-sm text-muted-foreground">{t("notYet")}</p>
        <Button type="button" className="mt-4" variant="outline" asChild>
          <Link href={`/quote/${quoteId}`}>{t("backQuote")}</Link>
        </Button>
      </div>
    );
  }

  const previewSrc = `/api/quote/${quoteId}/contract/preview`;

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-10">
      <div>
        <h1 className="text-2xl font-bold text-navy">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-navy">{t("previewTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border bg-slate-100">
            <iframe
              title="contract-preview"
              src={previewSrc}
              className="h-[min(70vh,720px)] w-full"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-navy">{t("signTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-navy">
                {t("signerName")}
              </label>
              <Input
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-navy">
                {t("signerEmail")}
              </label>
              <Input
                type="email"
                value={signerEmail}
                onChange={(e) => setSignerEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-navy">{t("padLabel")}</p>
            <div className="rounded-md border border-slate-200 bg-white">
              <OohSignaturePad ref={sigRef} />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={clearSig}
            >
              <Eraser className="mr-1 h-3 w-3" />
              {t("clearPad")}
            </Button>
          </div>

          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="mt-1"
            />
            <span>{t("agreeLabel")}</span>
          </label>

          <Button
            type="button"
            className="w-full bg-gold text-navy hover:bg-gold/90 sm:w-auto"
            disabled={submitting}
            onClick={() => void submit()}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              t("submit")
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
