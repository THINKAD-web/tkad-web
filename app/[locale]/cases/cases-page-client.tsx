"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BtnBlock } from "@/components/brutalist";
import {
  ArrowRight,
  Layers,
  RotateCcw,
  Search,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PublicSuccessCaseListItem } from "@/lib/success-case-public";

type Props = { initialCases: PublicSuccessCaseListItem[] };

export default function CasesPageClient({ initialCases }: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const isKo = locale === "ko";
  const [industry, setIndustry] = useState<string>("all");
  const [query, setQuery] = useState("");

  const industries = useMemo(() => {
    const set = new Set(
      initialCases.map((c) => c.industry.trim()).filter(Boolean),
    );
    return ["all", ...[...set].sort((a, b) => a.localeCompare(b, "ko"))];
  }, [initialCases]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return initialCases.filter((c) => {
      if (industry !== "all" && c.industry !== industry) return false;
      if (!q) return true;
      const hay = [
        c.titleKo,
        c.titleEn ?? "",
        c.clientName,
        c.summaryKo,
        ...c.mediaUsed,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [initialCases, industry, query]);

  const empty = initialCases.length === 0;

  const featureCards = [
    {
      titleKey: "cases.reportFeature1Title" as const,
      descKey: "cases.reportFeature1Desc" as const,
    },
    {
      titleKey: "cases.reportFeature2Title" as const,
      descKey: "cases.reportFeature2Desc" as const,
    },
    {
      titleKey: "cases.reportFeature3Title" as const,
      descKey: "cases.reportFeature3Desc" as const,
    },
  ];

  return (
    <>
      <section className="bg-bx-black py-24">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-bx-accent">
            {`// 08 / Cases`}
          </p>
          <div className="mt-3 inline-flex flex-wrap items-center justify-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-bx-white sm:text-5xl lg:text-6xl">
              {empty ? t("cases.reportHeroTitle") : t("cases.title")}
            </h1>
            <span className="border-2 border-bx-accent bg-bx-accent px-2 py-0.5 font-mono text-[10px] font-bold tracking-[0.22em] text-bx-white">
              BETA
            </span>
          </div>
          <p className="mx-auto mt-5 max-w-2xl font-mono text-[12px] tracking-tight text-bx-white/75 sm:text-sm">
            {empty ? t("cases.reportHeroSubtitle") : t("cases.subtitle")}
          </p>
        </div>
      </section>

      <section className="bg-bx-off py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {empty ? (
            <div className="space-y-14">
              <p className="mx-auto max-w-3xl text-center text-lg font-bold leading-relaxed text-bx-black sm:text-xl">
                {t("cases.reportLead")}
              </p>

              <div className="grid gap-0 md:grid-cols-3">
                {featureCards.map((card) => (
                  <div
                    key={card.titleKey}
                    className="-mt-[2px] -ml-[2px] border-2 border-bx-black bg-bx-white p-5"
                  >
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                      [ {t(card.titleKey)} ]
                    </p>
                    <p className="mt-3 font-mono text-[12px] leading-relaxed tracking-tight text-bx-gray-dim">
                      {t(card.descKey)}
                    </p>
                  </div>
                ))}
              </div>

              <div>
                <div className="mx-auto max-w-2xl border-2 border-bx-black bg-bx-white p-6 sm:p-8">
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <span className="border-2 border-bx-black bg-bx-accent px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-white">
                      [ {t("cases.reportSampleBadge")} ]
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-bx-gray-dim">
                      {t("cases.reportSampleLabel")}
                    </span>
                  </div>
                  <div className="space-y-3 border-2 border-bx-black bg-bx-off p-4">
                    <div className="h-2.5 w-3/4 bg-bx-black" />
                    <div className="h-2 w-1/2 bg-bx-black/40" />
                    <div className="mt-4 space-y-2 border-t-2 border-bx-black pt-4">
                      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                        [ {t("cases.reportSampleLine1")} ]
                      </p>
                      <div className="h-16 border-2 border-bx-black bg-bx-white" />
                      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                        [ {t("cases.reportSampleLine2")} ]
                      </p>
                      <div className="flex gap-0">
                        <div className="-ml-[2px] h-12 flex-1 border-2 border-bx-accent bg-bx-accent" />
                        <div className="-ml-[2px] h-12 flex-1 border-2 border-bx-black bg-bx-white" />
                        <div className="-ml-[2px] h-12 flex-1 border-2 border-bx-black bg-bx-white" />
                      </div>
                      <p className="pt-1 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                        [ {t("cases.reportSampleLine3")} ]
                      </p>
                      <div className="h-2 w-full bg-bx-black/30" />
                      <div className="h-2 w-5/6 bg-bx-black/20" />
                    </div>
                  </div>
                </div>
                <p className="mt-4 text-center font-mono text-[11px] tracking-tight text-bx-gray-dim">
                  {`// `}{t("cases.reportSampleCaption")}
                </p>
              </div>

              <div className="flex flex-col items-center justify-center">
                <BtnBlock href="/quote" variant="accent" size="lg">
                  {t("cases.reportCtaQuote")}
                </BtnBlock>
              </div>
            </div>
          ) : (
            <>
              <p className="mb-10 text-center font-mono text-[12px] tracking-tight text-bx-gray-dim sm:text-sm">
                {`// `}{t("cases.listIntro")}
              </p>

              <div className="mb-8 space-y-4">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                  [ {t("cases.filterIndustry")} ]
                </p>
                <div className="flex flex-wrap gap-0">
                  {industries.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setIndustry(key)}
                      className={cn(
                        "-mt-[2px] -ml-[2px] border-2 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] transition-colors",
                        industry === key
                          ? "border-bx-accent bg-bx-accent text-bx-white"
                          : "border-bx-black bg-bx-white text-bx-black hover:bg-bx-off",
                      )}
                    >
                      {key === "all" ? t("cases.all") : key}
                    </button>
                  ))}
                </div>

                <div className="flex flex-col gap-3 border-2 border-bx-black bg-bx-white p-4 sm:flex-row sm:flex-wrap sm:items-stretch">
                  <div className="relative min-w-[200px] flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bx-gray-dim" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={t("cases.searchPlaceholder")}
                      className="h-11 w-full border-2 border-bx-black bg-bx-white pl-10 pr-3 font-mono text-sm text-bx-black placeholder:text-bx-gray-dim focus:border-bx-accent focus:outline-none"
                      aria-label={t("cases.searchPlaceholder")}
                    />
                  </div>
                  <BtnBlock
                    variant="secondary"
                    size="md"
                    onClick={() => {
                      setIndustry("all");
                      setQuery("");
                    }}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    {t("cases.resetFilters")}
                  </BtnBlock>
                </div>

                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-bx-gray-dim">
                  {`// `}{t("cases.resultsCount", { count: filtered.length })}
                </p>
              </div>

              <div className="grid gap-0 md:grid-cols-2 lg:grid-cols-3">
                {filtered.map((cs) => (
                  <article
                    key={cs.id}
                    className="group -mt-[2px] -ml-[2px] flex flex-col overflow-hidden border-2 border-bx-black bg-bx-white"
                  >
                    <div className="relative flex h-48 items-center justify-center overflow-hidden border-b-2 border-bx-black bg-bx-off">
                      {cs.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cs.thumbnailUrl}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover grayscale transition-all duration-500 group-hover:grayscale-0"
                        />
                      ) : (
                        <TrendingUp className="h-12 w-12 text-bx-gray-dim transition-transform group-hover:scale-110" />
                      )}
                      <span className="absolute right-3 top-3 border-2 border-bx-accent bg-bx-accent px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-white">
                        [ {cs.industry} ]
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                        [ CASE / {cs.id.slice(0, 6).toUpperCase()} ]
                      </p>
                      <h3 className="mt-2 text-base font-bold tracking-tight text-bx-black">
                        {isKo ? cs.titleKo : cs.titleEn ?? cs.titleKo}
                      </h3>
                      <p className="mt-3 font-mono text-[12px] leading-relaxed tracking-tight text-bx-gray-dim">
                        {cs.summaryKo}
                      </p>
                      <div className="mt-4 border-2 border-bx-black bg-bx-off p-3">
                        <div className="flex items-start gap-2">
                          <Layers className="mt-0.5 h-3.5 w-3.5 shrink-0 text-bx-accent" />
                          <div className="min-w-0">
                            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                              [ {t("cases.mediaLabel")} ]
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {cs.mediaUsed.map((m) => (
                                <span
                                  key={m}
                                  className="border-2 border-bx-black bg-bx-white px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-bx-black"
                                >
                                  {m}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-auto flex flex-col gap-2 pt-4">
                        <BtnBlock
                          href={`/cases/${cs.id}`}
                          variant="accent"
                          size="sm"
                          className="w-full"
                        >
                          {t("cases.viewDetails")}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </BtnBlock>
                        <BtnBlock
                          href={`/contact?case=${encodeURIComponent(cs.id)}`}
                          variant="secondary"
                          size="sm"
                          className="w-full"
                        >
                          {t("cases.ctaSimilar")}
                        </BtnBlock>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="mt-16 border-2 border-bx-accent bg-bx-black px-6 py-10 text-center">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                  [ NEXT STEP ]
                </p>
                <h2 className="mt-3 text-xl font-bold tracking-tight text-bx-white sm:text-2xl">
                  {t("cases.sectionCtaTitle")}
                </h2>
                <p className="mx-auto mt-3 max-w-xl font-mono text-[12px] tracking-tight text-bx-white/75">
                  {`// `}{t("cases.sectionCtaDesc")}
                </p>
                <div className="mt-6 inline-flex">
                  <BtnBlock href="/contact" variant="accent" size="lg">
                    {t("cases.sectionCtaButton")}
                  </BtnBlock>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
