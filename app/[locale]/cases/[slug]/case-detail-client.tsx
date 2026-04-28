"use client";

import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { BtnBlock } from "@/components/brutalist";
import type { PublicSuccessCaseDetail } from "@/lib/success-case-public";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Calendar,
  Download,
  Eye,
  Quote,
  Target,
} from "lucide-react";

const LeadCaptureModal = dynamic(() =>
  import("@/components/lead-capture-modal").then((m) => ({
    default: m.LeadCaptureModal,
  })),
);

type NavItem = { id: string; titleKo: string; titleEn: string | null };

type Props = {
  row: PublicSuccessCaseDetail;
  prev: NavItem | null;
  next: NavItem | null;
};

function formatPeriod(
  start: string | null,
  end: string | null,
  isKo: boolean,
): string | null {
  if (!start && !end) return null;
  const opts: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  };
  const a = start ? new Date(start).toLocaleDateString(isKo ? "ko-KR" : "en-US", opts) : "";
  const b = end ? new Date(end).toLocaleDateString(isKo ? "ko-KR" : "en-US", opts) : "";
  if (a && b) return `${a} – ${b}`;
  return a || b || null;
}

export default function CaseDetailClient({ row, prev, next }: Props) {
  const locale = useLocale();
  const t = useTranslations();
  const isKo = locale === "ko";
  const [showLeadModal, setShowLeadModal] = useState(false);

  const title = isKo ? row.titleKo : row.titleEn ?? row.titleKo;
  const period = formatPeriod(row.periodStartIso, row.periodEndIso, isKo);

  const metricEntries = row.metricsJson
    ? Object.entries(row.metricsJson).filter(
        ([, v]) => v != null && String(v).length > 0,
      )
    : [];

  return (
    <>
      <section className="bg-bx-black py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/cases"
            className="group mb-6 inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-bx-white/65 transition-colors hover:text-bx-accent"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            {t("cases.detailBack")}
          </Link>

          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-bx-accent">
            {`// CASE / ${row.id.slice(0, 8).toUpperCase()}`}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="border-2 border-bx-accent bg-bx-accent px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-white">
              [ {row.industry} ]
            </span>
            <span className="inline-flex items-center gap-1.5 border-2 border-bx-white bg-transparent px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-white">
              <BadgeCheck className="h-3 w-3" />
              {t("cases.detailVerified")}
            </span>
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-tight text-bx-white sm:text-5xl lg:text-6xl">
            {title}
          </h1>

          <p className="mt-5 max-w-3xl font-mono text-sm leading-relaxed tracking-tight text-bx-white/75">
            {row.summaryKo}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <BtnBlock
              href={`/contact?case=${encodeURIComponent(row.id)}`}
              variant="accent"
              size="lg"
            >
              {t("cases.ctaSimilar")}
              <ArrowRight className="h-4 w-4" />
            </BtnBlock>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-[0.18em] text-bx-white/65">
            <span className="flex items-center gap-2">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-bx-accent bg-bx-black font-mono text-xs font-bold tracking-tight text-bx-accent">
                {row.clientName.slice(0, 2)}
              </span>
              <span>{row.clientName}</span>
            </span>
            {period ? (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-bx-accent" />
                {period}
              </span>
            ) : null}
          </div>
        </div>
      </section>

      <section className="bg-bx-white py-20 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-0 md:grid-cols-2">
            <div className="-mt-[2px] -ml-[2px] border-2 border-bx-black p-6 sm:p-8">
              <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                <Target className="h-4 w-4" />
                [ {t("cases.challengeLabel")} ]
              </div>
              <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-bx-black sm:text-lg">
                {row.challengeKo}
              </p>
            </div>
            <div className="-mt-[2px] -ml-[2px] border-2 border-bx-black p-6 sm:p-8">
              <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                <Eye className="h-4 w-4" />
                [ {t("cases.solutionLabel")} ]
              </div>
              <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-bx-black sm:text-lg">
                {row.solutionKo}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-bx-off py-20 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
            <Eye className="h-4 w-4" />
            [ {t("cases.mediaLabel")} ]
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {row.mediaUsed.map((m) => (
              <span
                key={m}
                className="border-2 border-bx-black bg-bx-white px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-bx-black"
              >
                {m}
              </span>
            ))}
          </div>

          {row.resultsKo.length > 0 ? (
            <div className="mt-10 border-2 border-bx-black bg-bx-white p-5 sm:p-6">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                [ {t("cases.resultsLabel")} ]
              </p>
              <ul className="mt-4 space-y-3">
                {row.resultsKo.map((line, i) => (
                  <li key={i} className="flex items-start gap-3 text-bx-black">
                    <span className="mt-1.5 inline-block h-2 w-2 shrink-0 bg-bx-accent" />
                    <span className="leading-relaxed">{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {metricEntries.length > 0 ? (
            <div className="mt-8 grid gap-0 sm:grid-cols-2 lg:grid-cols-3">
              {metricEntries.map(([k, v]) => (
                <div
                  key={k}
                  className="-mt-[2px] -ml-[2px] border-2 border-bx-black bg-bx-white p-4"
                >
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                    [ {k} ]
                  </p>
                  <p className="mt-2 font-mono text-lg font-bold tabular-nums text-bx-black">
                    {typeof v === "object" ? JSON.stringify(v) : String(v)}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {row.galleryUrls.length > 0 ? (
        <section className="bg-bx-white py-16">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <p className="mb-5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
              [ {t("cases.galleryLabel")} ]
            </p>
            <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-3">
              {row.galleryUrls.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={url}
                  alt={
                    isKo
                      ? `${title} 캠페인 이미지 ${i + 1}`
                      : `${title} campaign image ${i + 1}`
                  }
                  className="-mt-[2px] -ml-[2px] aspect-video w-full border-2 border-bx-black object-cover grayscale transition-all duration-500 hover:grayscale-0"
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {row.testimonialKo ? (
        <section className="bg-bx-off py-20 sm:py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="border-2 border-bx-accent bg-bx-white p-8">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                [ {t("cases.testimonialLabel")} ]
              </p>
              <Quote className="mt-4 h-8 w-8 text-bx-accent" />
              <p className="mt-4 whitespace-pre-wrap text-lg leading-relaxed text-bx-black">
                &ldquo;{row.testimonialKo}&rdquo;
              </p>
              <div className="mt-6 border-t-2 border-bx-black pt-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-bx-gray-dim">
                  — {row.clientName}
                </p>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="bg-bx-white py-20 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <BtnBlock
              variant="accent"
              size="lg"
              onClick={() => setShowLeadModal(true)}
            >
              <Download className="h-5 w-5" />
              {t("cases.detailDownloadPdf")}
            </BtnBlock>
            <BtnBlock
              href={`/contact?case=${encodeURIComponent(row.id)}`}
              variant="dark"
              size="lg"
            >
              {t("cases.detailSimilarCampaign")}
              <ArrowRight className="h-4 w-4" />
            </BtnBlock>
          </div>
        </div>
      </section>

      {(prev || next) && (
        <section className="bg-bx-off py-20 sm:py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-stretch justify-between gap-0">
              {prev ? (
                <Link
                  href={`/cases/${prev.id}`}
                  className="group -ml-[2px] flex flex-1 flex-col border-2 border-bx-black bg-bx-white p-5 transition-colors hover:bg-bx-black hover:text-bx-white"
                >
                  <span className="flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                    <ArrowLeft className="h-3 w-3" />
                    [ {t("cases.detailPrev")} ]
                  </span>
                  <span className="mt-2 text-sm font-bold tracking-tight">
                    {isKo ? prev.titleKo : prev.titleEn ?? prev.titleKo}
                  </span>
                </Link>
              ) : (
                <div className="flex-1" />
              )}
              {next ? (
                <Link
                  href={`/cases/${next.id}`}
                  className="group -ml-[2px] flex flex-1 flex-col items-end border-2 border-bx-black bg-bx-white p-5 text-right transition-colors hover:bg-bx-black hover:text-bx-white"
                >
                  <span className="flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                    [ {t("cases.detailNext")} ]
                    <ArrowRight className="h-3 w-3" />
                  </span>
                  <span className="mt-2 text-sm font-bold tracking-tight">
                    {isKo ? next.titleKo : next.titleEn ?? next.titleKo}
                  </span>
                </Link>
              ) : (
                <div className="flex-1" />
              )}
            </div>
          </div>
        </section>
      )}

      <LeadCaptureModal
        open={showLeadModal}
        onClose={() => setShowLeadModal(false)}
        onSubmit={() => setShowLeadModal(false)}
        locale={locale}
        title={isKo ? "문의 접수" : "Get in touch"}
        description={
          isKo
            ? "담당자가 캠페인 자료 안내를 도와드립니다."
            : "Our team can share more about this campaign."
        }
      />
    </>
  );
}
