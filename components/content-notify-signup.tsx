"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BtnBlock } from "@/components/brutalist";
import { cn } from "@/lib/utils";

type Source = "report" | "academy";

type Props = {
  source: Source;
  className?: string;
  variant?: "inline" | "card";
};

export function ContentNotifySignup({
  source,
  className,
  variant = "card",
}: Props) {
  const t = useTranslations("contentNotify");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/content-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source, locale }),
      });
      if (!res.ok) throw new Error("failed");
      setStatus("done");
      setEmail("");
    } catch {
      setStatus("error");
    }
  };

  const form = (
    <form
      onSubmit={submit}
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-stretch",
        variant === "inline" && "sm:justify-center",
      )}
    >
      <label className="sr-only" htmlFor={`notify-${source}`}>
        {t("emailLabel")}
      </label>
      <input
        id={`notify-${source}`}
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (status === "done" || status === "error") setStatus("idle");
        }}
        placeholder={t("emailPlaceholder")}
        disabled={status === "loading" || status === "done"}
        className="h-11 min-w-0 flex-1 border-2 border-border bg-card px-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none sm:min-w-[240px]"
      />
      <BtnBlock
        type="submit"
        variant="accent"
        size="md"
        disabled={status === "loading" || status === "done"}
        className="shrink-0 sm:px-6"
      >
        {status === "loading"
          ? t("submitting")
          : status === "done"
            ? t("submitted")
            : t("submit")}
      </BtnBlock>
    </form>
  );

  if (variant === "inline") {
    return (
      <div className={className}>
        {form}
        {status === "error" ? (
          <p className="mt-2 text-center font-mono text-[11px] text-destructive">
            {t("error")}
          </p>
        ) : null}
        {status === "done" ? (
          <p className="mt-2 text-center font-mono text-[11px] text-muted-foreground">
            {t("successHint")}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "border-2 border-border bg-muted/50 p-6 sm:p-8",
        className,
      )}
    >
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
        [ {t("badge")} ]
      </p>
      <p className="mt-2 text-base font-bold text-foreground">{t("title")}</p>
      <p className="mt-2 font-mono text-[12px] leading-relaxed tracking-tight text-muted-foreground">
        {source === "report" ? t("descReport") : t("descAcademy")}
      </p>
      <div className="mt-5">{form}</div>
      {status === "error" ? (
        <p className="mt-2 font-mono text-[11px] text-destructive">{t("error")}</p>
      ) : null}
      {status === "done" ? (
        <p className="mt-2 font-mono text-[11px] text-muted-foreground">
          {t("successHint")}
        </p>
      ) : null}
    </div>
  );
}
