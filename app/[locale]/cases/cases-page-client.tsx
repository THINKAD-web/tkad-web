"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Layers, RotateCcw, Search, TrendingUp } from "lucide-react";
import type { PublicSuccessCaseListItem } from "@/lib/success-case-public";

type Props = { initialCases: PublicSuccessCaseListItem[] };

export default function CasesPageClient({ initialCases }: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const isKo = locale === "ko";
  const [industry, setIndustry] = useState<string>("all");
  const [query, setQuery] = useState("");

  const industries = useMemo(() => {
    const set = new Set(initialCases.map((c) => c.industry.trim()).filter(Boolean));
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

  const preparing = initialCases.length === 0;

  return (
    <>
      <section className="bg-navy py-24 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            {t("cases.title")}
          </h1>
          <p className="mt-2 text-slate-300">{t("cases.subtitle")}</p>
        </div>
      </section>

      <section className="py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {preparing ? (
            <div className="mx-auto max-w-lg rounded-2xl border border-navy/10 bg-slate-50 px-8 py-14 text-center">
              <p className="text-lg font-semibold text-navy">
                {t("cases.preparingCases")}
              </p>
              <p className="mt-2 text-sm text-navy/65">
                {t("cases.preparingCasesDesc")}
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-navy/50">
                  {t("cases.filterIndustry")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {industries.map((key) => (
                    <Button
                      key={key}
                      variant={industry === key ? "default" : "outline"}
                      size="sm"
                      onClick={() => setIndustry(key)}
                      className={
                        industry === key
                          ? "bg-navy text-white"
                          : "border-navy/20 text-navy"
                      }
                    >
                      {key === "all" ? t("cases.all") : key}
                    </Button>
                  ))}
                </div>

                <div className="flex flex-col gap-3 rounded-xl border border-navy/10 bg-slate-50/80 p-4 sm:flex-row sm:flex-wrap sm:items-end">
                  <div className="relative min-w-[200px] flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy/35" />
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={t("cases.searchPlaceholder")}
                      className="h-10 border-navy/15 pl-9"
                      aria-label={t("cases.searchPlaceholder")}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10 shrink-0 border-navy/20"
                    onClick={() => {
                      setIndustry("all");
                      setQuery("");
                    }}
                  >
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                    {t("cases.resetFilters")}
                  </Button>
                </div>

                <p className="text-sm text-navy/60">
                  {t("cases.resultsCount", { count: filtered.length })}
                </p>
              </div>

              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {filtered.map((cs) => (
                  <Card
                    key={cs.id}
                    className="group overflow-hidden border-0 shadow-md transition-all hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="relative flex h-48 items-center justify-center overflow-hidden bg-gradient-to-br from-gold/10 to-navy/10">
                      {cs.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cs.thumbnailUrl}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      ) : (
                        <TrendingUp className="h-12 w-12 text-gold/40 transition-transform group-hover:scale-110" />
                      )}
                      <Badge className="absolute right-3 top-3 bg-gold text-navy">
                        {cs.industry}
                      </Badge>
                    </div>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">
                        {isKo ? cs.titleKo : cs.titleEn ?? cs.titleKo}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <CardDescription className="text-sm leading-relaxed">
                        {cs.summaryKo}
                      </CardDescription>
                      <div className="space-y-2 rounded-xl border border-navy/8 bg-white p-3">
                        <div className="flex items-start gap-2 text-xs text-navy/85">
                          <Layers className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-dark" />
                          <div>
                            <span className="font-semibold text-navy">
                              {t("cases.mediaLabel")}
                            </span>
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {cs.mediaUsed.map((m) => (
                                <span
                                  key={m}
                                  className="rounded-md bg-navy/[0.06] px-2 py-0.5 text-[11px] font-medium text-navy"
                                >
                                  {m}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Link href={`/cases/${cs.id}`}>
                          <Button
                            size="sm"
                            className="w-full bg-gold text-xs font-bold text-navy hover:bg-gold-dark"
                          >
                            {t("cases.viewDetails")}
                            <ArrowRight className="ml-1 h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <Link
                          href={`/contact?case=${encodeURIComponent(cs.id)}`}
                        >
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full border-navy/25 text-xs font-bold text-navy hover:bg-navy/5"
                          >
                            {t("cases.ctaSimilar")}
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="mt-16 rounded-2xl border border-navy/10 bg-gradient-to-br from-navy/[0.04] to-gold/10 px-6 py-10 text-center">
                <h2 className="text-xl font-bold text-navy sm:text-2xl">
                  {t("cases.sectionCtaTitle")}
                </h2>
                <p className="mx-auto mt-2 max-w-xl text-sm text-navy/65">
                  {t("cases.sectionCtaDesc")}
                </p>
                <Link href="/contact" className="mt-6 inline-block">
                  <Button className="bg-navy px-8 text-white hover:bg-navy/90">
                    {t("cases.sectionCtaButton")}
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
