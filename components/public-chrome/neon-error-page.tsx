"use client";

import type { ReactNode } from "react";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { BtnBlock } from "@/components/brutalist";
import { cn } from "@/lib/utils";

export type NeonErrorPageProps = {
  code: string;
  eyebrow: string;
  title: string;
  description: string;
  retryLabel?: string;
  homeLabel: string;
  onReset?: () => void;
  homeHref?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  footerNote?: string;
  className?: string;
  /** `app/not-found`, `global-error` — i18n·테마 프로바이더 밖 */
  standalone?: boolean;
};

const actionBtnClass =
  "inline-flex min-h-12 w-full items-center justify-center gap-2 border-2 px-8 py-4 font-mono text-sm font-bold uppercase tracking-[0.18em] transition-colors duration-150 sm:w-auto";

function NeonErrorActions({
  standalone,
  retryLabel,
  onReset,
  homeHref = "/",
  homeLabel,
  secondaryHref,
  secondaryLabel,
}: Pick<
  NeonErrorPageProps,
  | "standalone"
  | "retryLabel"
  | "onReset"
  | "homeHref"
  | "homeLabel"
  | "secondaryHref"
  | "secondaryLabel"
>) {
  const homeClass = cn(
    actionBtnClass,
    "border-white/15 bg-white/5 text-white hover:bg-white/10",
  );
  const secondaryClass = cn(
    actionBtnClass,
    "border-cyan-400/25 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/15",
  );
  const retryClass = cn(
    actionBtnClass,
    "border-transparent bg-gradient-to-r from-violet-500 to-cyan-400 text-white shadow-lg shadow-violet-500/30",
  );

  return (
    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
      {onReset && retryLabel ? (
        standalone ? (
          <button type="button" className={retryClass} onClick={onReset}>
            <RotateCcw className="h-4 w-4" aria-hidden />
            {retryLabel}
          </button>
        ) : (
          <BtnBlock
            type="button"
            variant="accent"
            size="lg"
            className="min-h-12 w-full bg-gradient-to-r from-violet-500 to-cyan-400 text-base font-bold text-white shadow-lg shadow-violet-500/30 sm:w-auto"
            onClick={onReset}
          >
            <RotateCcw className="h-4 w-4" />
            {retryLabel}
          </BtnBlock>
        )
      ) : null}
      {standalone ? (
        <a href={homeHref} className={homeClass}>
          <Home className="h-4 w-4" aria-hidden />
          {homeLabel}
        </a>
      ) : (
        <BtnBlock
          href={homeHref}
          variant="secondary"
          size="lg"
          className="min-h-12 w-full border-white/15 bg-white/5 text-white hover:bg-white/10 sm:w-auto"
        >
          <Home className="h-4 w-4" />
          {homeLabel}
        </BtnBlock>
      )}
      {secondaryHref && secondaryLabel ? (
        standalone ? (
          <a href={secondaryHref} className={secondaryClass}>
            {secondaryLabel}
          </a>
        ) : (
          <BtnBlock
            href={secondaryHref}
            variant="secondary"
            size="lg"
            className="min-h-12 w-full border-cyan-400/25 bg-cyan-500/10 text-cyan-100 sm:w-auto"
          >
            {secondaryLabel}
          </BtnBlock>
        )
      ) : null}
    </div>
  );
}

function NeonErrorShell({
  className,
  code,
  eyebrow,
  title,
  description,
  footerNote,
  children,
}: Pick<
  NeonErrorPageProps,
  "className" | "code" | "eyebrow" | "title" | "description" | "footerNote"
> & { children: ReactNode }) {
  return (
    <div
      className={cn(
        "tkad-landing-neon tkad-planner-neon relative flex min-h-[calc(100vh-72px)] flex-col items-center justify-center overflow-hidden bg-[#05050a] px-4 py-16",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.14] tkad-neon-grid"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(34,211,238,0.16),transparent_52%),radial-gradient(circle_at_88%_22%,rgba(168,85,247,0.14),transparent_55%),radial-gradient(circle_at_50%_100%,rgba(244,63,94,0.1),transparent_58%)]"
      />

      <div className="relative z-10 mx-auto w-full max-w-lg">
        <div className="tkad-glass-surface relative overflow-hidden rounded-[28px] border border-white/12 p-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:p-10">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-20 tkad-neon-grid"
          />

          <div className="relative">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-400/30 bg-rose-500/10 shadow-[0_0_32px_rgba(244,63,94,0.2)]">
              <AlertTriangle
                className="h-8 w-8 text-rose-300"
                strokeWidth={1.75}
                aria-hidden
              />
            </div>

            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-300/90">
              {eyebrow}
            </p>

            <p
              className="mt-4 bg-gradient-to-r from-violet-300 via-cyan-200 to-violet-300 bg-clip-text text-7xl font-black leading-none tracking-tighter text-transparent sm:text-8xl"
              aria-hidden
            >
              {code}
            </p>

            <h1 className="mt-4 text-xl font-bold tracking-tight text-white sm:text-2xl">
              {title}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-white/60">
              {description}
            </p>

            {children}

            {footerNote ? (
              <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">
                {footerNote}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function NeonErrorPage({
  code,
  eyebrow,
  title,
  description,
  retryLabel,
  homeLabel,
  onReset,
  homeHref = "/",
  secondaryHref,
  secondaryLabel,
  footerNote,
  className,
  standalone = false,
}: NeonErrorPageProps) {
  const body = (
    <NeonErrorShell
      className={className}
      code={code}
      eyebrow={eyebrow}
      title={title}
      description={description}
      footerNote={footerNote}
    >
      <NeonErrorActions
        standalone={standalone}
        retryLabel={retryLabel}
        onReset={onReset}
        homeHref={homeHref}
        homeLabel={homeLabel}
        secondaryHref={secondaryHref}
        secondaryLabel={secondaryLabel}
      />
    </NeonErrorShell>
  );

  if (standalone) return body;
  return <HomeLandingDayNight>{body}</HomeLandingDayNight>;
}
