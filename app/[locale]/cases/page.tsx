"use client";

import { useTranslations, useLocale } from "next-intl";
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
import {
  TrendingUp,
  Eye,
  Users,
  Quote,
  ArrowRight,
  MessageSquareQuote,
  Image as ImageIcon,
  Video,
  Search,
  Target,
  Layers,
  Shirt,
  Car,
  UtensilsCrossed,
  RotateCcw,
} from "lucide-react";
import { useState, useMemo } from "react";
import { Link } from "@/i18n/navigation";
import {
  caseStudies,
  categoryColors,
  verticalColors,
  caseMatchesVerticalTab,
  type CaseStudyRegionKey,
  type CaseStudyScale,
  type CaseStudyVertical,
} from "@/lib/case-studies";

type VerticalTab = "all" | CaseStudyVertical | "other";

const REGION_KEYS: readonly (CaseStudyRegionKey | "all")[] = [
  "all",
  "seoul",
  "busan",
  "jeju",
  "national",
  "multi",
];

const SCALE_KEYS: readonly (CaseStudyScale | "all")[] = [
  "all",
  "large",
  "medium",
  "small",
];

export default function CasesPage() {
  const t = useTranslations();
  const locale = useLocale();
  const isKo = locale === "ko";
  const [activeCategory, setActiveCategory] = useState("all");
  const [verticalTab, setVerticalTab] = useState<VerticalTab>("all");
  const [regionKey, setRegionKey] = useState<CaseStudyRegionKey | "all">("all");
  const [scale, setScale] = useState<CaseStudyScale | "all">("all");
  const [query, setQuery] = useState("");

  const categories = [
    { value: "all", label: t("cases.all") },
    { value: "billboard", label: t("cases.billboard") },
    { value: "digital", label: t("cases.digital") },
    { value: "transport", label: t("cases.transport") },
    { value: "special", label: t("cases.special") },
  ];

  const verticalTabs: { value: VerticalTab; label: string }[] = [
    { value: "all", label: t("cases.all") },
    { value: "fashion_beauty", label: t("cases.verticalFashion") },
    { value: "automotive", label: t("cases.verticalAuto") },
    { value: "fb", label: t("cases.verticalFb") },
    { value: "other", label: t("cases.verticalOther") },
  ];

  const regionLabel = (key: CaseStudyRegionKey | "all") => {
    if (key === "all") return t("cases.regionAll");
    const map: Record<CaseStudyRegionKey, string> = {
      seoul: t("cases.regionSeoul"),
      busan: t("cases.regionBusan"),
      jeju: t("cases.regionJeju"),
      national: t("cases.regionNational"),
      multi: t("cases.regionMulti"),
    };
    return map[key];
  };

  const scaleLabel = (key: CaseStudyScale | "all") => {
    if (key === "all") return t("cases.scaleAll");
    const map: Record<CaseStudyScale, string> = {
      large: t("cases.scaleLarge"),
      medium: t("cases.scaleMedium"),
      small: t("cases.scaleSmall"),
    };
    return map[key];
  };

  const verticalBadgeLabel = (v: CaseStudyVertical) => {
    const map: Record<CaseStudyVertical, string> = {
      fashion_beauty: t("cases.verticalFashion"),
      automotive: t("cases.verticalAuto"),
      fb: t("cases.verticalFb"),
      tech: t("cases.verticalOther"),
      entertainment: t("cases.verticalOther"),
      finance: t("cases.verticalOther"),
    };
    return map[v];
  };

  const industrySpotlights: {
    vertical: CaseStudyVertical;
    icon: typeof Shirt;
  }[] = [
    { vertical: "fashion_beauty", icon: Shirt },
    { vertical: "automotive", icon: Car },
    { vertical: "fb", icon: UtensilsCrossed },
  ];

  const resetFilters = () => {
    setActiveCategory("all");
    setVerticalTab("all");
    setRegionKey("all");
    setScale("all");
    setQuery("");
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return caseStudies.filter((c) => {
      if (activeCategory !== "all" && c.category !== activeCategory) return false;
      if (!caseMatchesVerticalTab(c.vertical, verticalTab)) return false;
      if (regionKey !== "all" && c.regionKey !== regionKey) return false;
      if (scale !== "all" && c.scale !== scale) return false;
      if (!q) return true;
      const hay = [
        c.title,
        c.titleEn,
        c.client,
        c.clientEn,
        c.description,
        c.descriptionEn,
        c.results,
        c.resultsEn,
        c.campaignGoal,
        c.campaignGoalEn,
        c.testimonial,
        c.testimonialEn,
        c.testimonialAuthor,
        c.testimonialAuthorEn,
        c.managerComment,
        c.managerCommentEn,
        ...c.mediaUsed,
        ...c.mediaUsedEn,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [activeCategory, verticalTab, regionKey, scale, query]);

  const selectClass =
    "h-9 rounded-md border border-navy/15 bg-white px-2 text-sm text-navy shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40";

  return (
    <>
      <section className="bg-navy py-24 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            {t("cases.title")}
          </h1>
          <p className="mt-2 text-slate-300">{t("cases.subtitle")}</p>

          <div className="mx-auto mt-10 max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-gold/90">
              {t("cases.heroIndustryTitle")}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {t("cases.heroIndustrySubtitle")}
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {industrySpotlights.map(({ vertical, icon: Icon }) => {
                const active = verticalTab === vertical;
                return (
                  <button
                    key={vertical}
                    type="button"
                    onClick={() => setVerticalTab(vertical)}
                    className={`flex flex-col items-center gap-2 rounded-2xl border px-4 py-5 text-center transition-all touch-manipulation ${
                      active
                        ? "border-gold bg-white/10 shadow-lg shadow-gold/10 ring-2 ring-gold/50"
                        : "border-white/15 bg-white/5 hover:border-white/25 hover:bg-white/[0.08]"
                    }`}
                  >
                    <span
                      className={`flex h-12 w-12 items-center justify-center rounded-full ${
                        active ? "bg-gold text-navy" : "bg-white/10 text-gold"
                      }`}
                    >
                      <Icon className="h-6 w-6" aria-hidden />
                    </span>
                    <span className="text-sm font-bold text-white">
                      {verticalBadgeLabel(vertical)}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {t("cases.resultsCount", {
                        count: caseStudies.filter((c) => c.vertical === vertical)
                          .length,
                      })}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-navy/50">
              {t("cases.filterIndustry")}
            </p>
            <div className="flex flex-wrap gap-2">
              {verticalTabs.map((tab) => (
                <Button
                  key={tab.value}
                  variant={verticalTab === tab.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setVerticalTab(tab.value)}
                  className={
                    verticalTab === tab.value
                      ? "bg-navy text-white"
                      : "border-navy/20 text-navy"
                  }
                >
                  {tab.label}
                </Button>
              ))}
            </div>

            <p className="text-xs font-semibold uppercase tracking-wide text-navy/50">
              {t("cases.filterMediaType")}
            </p>
            <div className="flex flex-wrap gap-2">
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
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-navy/55">
                  {t("cases.filterRegion")}
                </label>
                <select
                  className={selectClass}
                  value={regionKey}
                  onChange={(e) =>
                    setRegionKey(e.target.value as CaseStudyRegionKey | "all")
                  }
                >
                  {REGION_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {regionLabel(k)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-navy/55">
                  {t("cases.filterScale")}
                </label>
                <select
                  className={selectClass}
                  value={scale}
                  onChange={(e) =>
                    setScale(e.target.value as CaseStudyScale | "all")
                  }
                >
                  {SCALE_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {scaleLabel(k)}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 shrink-0 border-navy/20"
                onClick={resetFilters}
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
                  <div className="absolute left-3 top-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-navy/15 bg-navy text-[11px] font-extrabold tracking-tight text-gold shadow-sm">
                    {cs.clientLogo}
                  </div>
                  <div className="absolute right-3 top-3 rounded-full bg-gold px-2.5 py-1 text-xs font-extrabold text-navy shadow-md ring-2 ring-gold/40">
                    ROI {cs.roi}
                  </div>
                  <TrendingUp className="h-12 w-12 text-gold/40 transition-transform group-hover:scale-110" />
                </div>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge
                      className={`w-fit text-xs ${verticalColors[cs.vertical]}`}
                    >
                      {verticalBadgeLabel(cs.vertical)}
                    </Badge>
                    <Badge
                      className={`w-fit text-xs ${categoryColors[cs.category]}`}
                    >
                      {categories.find((c) => c.value === cs.category)?.label}
                    </Badge>
                  </div>
                  <CardTitle className="text-base">
                    {isKo ? cs.title : cs.titleEn}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CardDescription className="text-sm leading-relaxed">
                    {isKo ? cs.description : cs.descriptionEn}
                  </CardDescription>

                  <div className="space-y-2 rounded-xl border border-navy/8 bg-white p-3">
                    <div className="flex items-start gap-2 text-xs text-navy/85">
                      <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-dark" />
                      <div>
                        <span className="font-semibold text-navy">
                          {t("cases.goalLabel")}
                        </span>
                        <p className="mt-0.5 leading-relaxed">
                          {isKo ? cs.campaignGoal : cs.campaignGoalEn}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-navy/85">
                      <Layers className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-dark" />
                      <div>
                        <span className="font-semibold text-navy">
                          {t("cases.mediaLabel")}
                        </span>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {(isKo ? cs.mediaUsed : cs.mediaUsedEn).map((m) => (
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

                  <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                        <Eye className="h-3 w-3" />
                        {t("cases.metricExposures")}
                      </div>
                      <div className="mt-0.5 text-sm font-bold text-navy">
                        {isKo ? cs.exposures : cs.exposuresEn}
                      </div>
                    </div>
                    <div className="text-center border-x border-slate-200">
                      <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {t("cases.metricReach")}
                      </div>
                      <div className="mt-0.5 text-sm font-bold text-emerald-600">
                        {cs.reachIncrease}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                        <TrendingUp className="h-3 w-3" />
                        {t("cases.resultsLabel")}
                      </div>
                      <div className="mt-0.5 text-xs font-bold text-gold-dark">
                        {isKo ? cs.results : cs.resultsEn}
                      </div>
                    </div>
                  </div>

                  {cs.gallery.length > 0 ? (
                    <div className="rounded-xl border border-navy/8 bg-slate-50/60 p-3">
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-navy/45">
                        {t("cases.galleryLabel")}
                      </p>
                      <ul className="space-y-1.5">
                        {cs.gallery.map((g, i) => (
                          <li
                            key={i}
                            className="flex items-center gap-2 text-[11px] text-navy/75"
                          >
                            {g.type === "video" ? (
                              <Video className="h-3.5 w-3.5 shrink-0 text-navy/45" />
                            ) : (
                              <ImageIcon className="h-3.5 w-3.5 shrink-0 text-navy/45" />
                            )}
                            <span>{isKo ? g.labelKo : g.labelEn}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <div className="rounded-xl border border-navy/8 bg-navy/[0.03] p-3">
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-navy/45">
                      {t("cases.testimonialLabel")}
                    </p>
                    <Quote className="mb-1 h-4 w-4 text-gold/30" />
                    <p className="text-xs leading-relaxed text-navy/70 italic">
                      &ldquo;{isKo ? cs.testimonial : cs.testimonialEn}&rdquo;
                    </p>
                    <p className="mt-2 text-[11px] font-semibold text-navy/50">
                      — {isKo ? cs.testimonialAuthor : cs.testimonialAuthorEn}
                    </p>
                  </div>

                  <div className="rounded-xl border border-gold/25 bg-gold/8 p-3">
                    <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-gold-dark">
                      <MessageSquareQuote className="h-3.5 w-3.5" />
                      {t("cases.managerCommentTitle")}
                    </div>
                    <p className="text-xs leading-relaxed text-navy/80">
                      &ldquo;{isKo ? cs.managerComment : cs.managerCommentEn}&rdquo;
                    </p>
                    <p className="mt-2 text-[11px] font-semibold text-navy">
                      {isKo ? cs.managerName : cs.managerNameEn}
                      <span className="font-normal text-navy/55">
                        {" "}
                        · {isKo ? cs.managerRole : cs.managerRoleEn}
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Link href={`/cases/${cs.slug}`}>
                      <Button
                        size="sm"
                        className="w-full bg-gold text-xs font-bold text-navy hover:bg-gold-dark"
                      >
                        {t("cases.viewDetails")}
                        <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    </Link>
                    <Link href={`/contact?case=${encodeURIComponent(cs.slug)}`}>
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
        </div>
      </section>
    </>
  );
}
