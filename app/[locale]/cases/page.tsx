"use client";

import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Eye, Users, Quote, ArrowRight } from "lucide-react";
import { useState, useMemo } from "react";
import { Link } from "@/i18n/navigation";
import { caseStudies, categoryColors } from "@/lib/case-studies";

export default function CasesPage() {
  const t = useTranslations();
  const locale = useLocale();
  const isKo = locale === "ko";
  const [activeCategory, setActiveCategory] = useState("all");

  const categories = [
    { value: "all", label: t("cases.all") },
    { value: "billboard", label: t("cases.billboard") },
    { value: "digital", label: t("cases.digital") },
    { value: "transport", label: t("cases.transport") },
    { value: "special", label: t("cases.special") },
  ];

  const filtered = useMemo(
    () =>
      activeCategory === "all"
        ? caseStudies
        : caseStudies.filter((c) => c.category === activeCategory),
    [activeCategory]
  );

  return (
    <>
      <section className="bg-navy py-16">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            {t("cases.title")}
          </h1>
          <p className="mt-2 text-slate-300">{t("cases.subtitle")}</p>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-wrap gap-2">
            {categories.map((cat) => (
              <Button
                key={cat.value}
                variant={activeCategory === cat.value ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCategory(cat.value)}
                className={
                  activeCategory === cat.value
                    ? "bg-navy text-white"
                    : "border-navy/20 text-navy"
                }
              >
                {cat.label}
              </Button>
            ))}
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((cs) => (
              <Card
                key={cs.id}
                className="group overflow-hidden border-0 shadow-md transition-all hover:shadow-xl hover:-translate-y-1"
              >
                <div className="flex h-48 items-center justify-center bg-gradient-to-br from-gold/10 to-navy/10 overflow-hidden">
                  <TrendingUp className="h-12 w-12 text-gold/40 transition-transform group-hover:scale-110" />
                </div>
                <CardHeader className="pb-3">
                  <Badge
                    className={`w-fit text-xs ${categoryColors[cs.category] || ""}`}
                  >
                    {categories.find((c) => c.value === cs.category)?.label}
                  </Badge>
                  <CardTitle className="text-base">
                    {isKo ? cs.title : cs.titleEn}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CardDescription className="text-sm leading-relaxed">
                    {isKo ? cs.description : cs.descriptionEn}
                  </CardDescription>

                  <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                        <Eye className="h-3 w-3" />
                        {isKo ? "노출수" : "Exposures"}
                      </div>
                      <div className="mt-0.5 text-sm font-bold text-navy">
                        {isKo ? cs.exposures : cs.exposuresEn}
                      </div>
                    </div>
                    <div className="text-center border-x border-slate-200">
                      <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {isKo ? "도달률" : "Reach"}
                      </div>
                      <div className="mt-0.5 text-sm font-bold text-emerald-600">
                        {cs.reachIncrease}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                        <TrendingUp className="h-3 w-3" />
                        {isKo ? "성과" : "Result"}
                      </div>
                      <div className="mt-0.5 text-xs font-bold text-gold-dark">
                        {isKo ? cs.results : cs.resultsEn}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-navy/[0.03] p-3">
                    <Quote className="mb-1 h-4 w-4 text-gold/30" />
                    <p className="text-xs leading-relaxed text-navy/70 italic">
                      &ldquo;{isKo ? cs.testimonial : cs.testimonialEn}&rdquo;
                    </p>
                    <p className="mt-2 text-[11px] font-semibold text-navy/50">
                      — {isKo ? cs.testimonialAuthor : cs.testimonialAuthorEn}
                    </p>
                  </div>

                  <Link href={`/cases/${cs.slug}`}>
                    <Button
                      size="sm"
                      className="w-full bg-gold text-navy text-xs font-bold hover:bg-gold-dark mt-1"
                    >
                      {isKo ? "상세 보기" : "View Details"}
                      <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
