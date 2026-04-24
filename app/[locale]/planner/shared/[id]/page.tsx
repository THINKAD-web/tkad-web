import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { fetchPlannerMediaCatalog } from "@/lib/public-media-catalog";
import { CompositePreview } from "@/components/planner/composite-preview";
import { getPrimaryMediaImageUrl } from "@/lib/media-data";
import { PLANNER_DEFAULT_CATEGORIES } from "@/lib/planner/types";

export const dynamic = "force-dynamic";

type PlanJson = {
  campaignGoal: string | null;
  regions: string[];
  categories: string[];
  budget: string;
  months: number;
  ageKey: string;
  industryKey: string;
  campaignMediaIds: string[];
  creativeUploadedUrl: string | null;
  mediaPlacements: Record<
    string,
    { xPct: number; yPct: number; widthPct: number; rotationDeg?: number }
  >;
};

async function loadPlan(id: string) {
  const plan = await prisma.savedPlannerPlan.findUnique({
    where: { id },
    select: {
      id: true,
      expiresAt: true,
      planJson: true,
      createdAt: true,
    },
  });
  if (!plan) return null;
  if (plan.expiresAt.getTime() < Date.now()) return "expired" as const;
  return plan;
}

export default async function SharedPlannerPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id } = await params;
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  const t = await getTranslations("planner");

  const result = await loadPlan(id);
  if (result === null) notFound();
  if (result === "expired") {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="text-xl font-bold text-navy">{t("shareExpiredTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("shareExpiredBody")}
        </p>
        <Link href="/planner" className="mt-6 inline-block">
          <Button className="btn-gold rounded-full px-8">
            {t("shareExpiredCta")}
          </Button>
        </Link>
      </div>
    );
  }

  const plan = result.planJson as unknown as PlanJson;
  const { catalog } = await fetchPlannerMediaCatalog();
  const byId = new Map(catalog.map((m) => [m.id, m]));
  const selected = (plan.campaignMediaIds ?? [])
    .map((id) => byId.get(id))
    .filter((m): m is NonNullable<typeof m> => Boolean(m));
  const categories = plan.categories ?? PLANNER_DEFAULT_CATEGORIES;
  const budgetMan = Number.parseInt(plan.budget || "0", 10);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <section className="bg-navy py-14 text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Badge className="border-gold/40 bg-gold/15 text-gold">
            {t("shareViewBadge")}
          </Badge>
          <h1 className="mt-3 text-2xl font-extrabold sm:text-3xl">
            {t("title")}
          </h1>
          <p className="mt-2 text-sm text-white/75">
            {t("shareViewSubtitle")}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
        <Card className="border-navy/10 shadow-sm">
          <CardHeader>
            <CardTitle className="text-navy">
              {t("reportSectionOverview")}
            </CardTitle>
            <CardDescription>
              {t("shareViewSubtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">
                {t("reportLabelGoal")}
              </p>
              <p className="font-semibold text-navy">
                {plan.campaignGoal
                  ? t(`goal${capitalize(plan.campaignGoal)}` as never)
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t("reportLabelBudget")}
              </p>
              <p className="font-semibold text-navy">
                {budgetMan.toLocaleString()}
                {isKo ? " 만원" : " ₩10K"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t("reportLabelPeriod")}
              </p>
              <p className="font-semibold text-navy">
                {plan.months}
                {isKo ? "개월" : " months"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t("reportLabelRegions")}
              </p>
              <p className="font-semibold text-navy">
                {(plan.regions ?? []).join(", ") || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t("reportLabelCategories")}
              </p>
              <p className="font-semibold text-navy">
                {categories
                  .map((c) => t(`cat${capitalize(c)}` as never))
                  .join(", ")}
              </p>
            </div>
          </CardContent>
        </Card>

        {selected.length > 0 ? (
          <Card className="border-navy/10 shadow-sm">
            <CardHeader>
              <CardTitle className="text-navy">
                {t("reportSectionMedia")}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {selected.map((m) => (
                <div
                  key={m.id}
                  className="flex flex-col gap-2 rounded-xl border border-navy/10 bg-white p-3"
                >
                  <CompositePreview
                    mediaImageUrl={getPrimaryMediaImageUrl(m)}
                    mediaName={isKo ? m.name : m.nameEn || m.name}
                    logoUrl={plan.creativeUploadedUrl ?? null}
                    placement={plan.mediaPlacements?.[m.id]}
                    missingLabel={t("mediaPhotoMissing")}
                  />
                  <p className="line-clamp-2 text-sm font-bold text-navy">
                    {isKo ? m.name : m.nameEn || m.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isKo
                      ? m.location.slice(0, 40)
                      : (m.locationEn || m.location).slice(0, 40)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        <div className="flex flex-wrap gap-3 pt-4">
          <Link href="/planner">
            <Button className="btn-gold rounded-full px-6 font-semibold">
              {t("shareStartOwnCta")}
            </Button>
          </Link>
          <Link href="/contact">
            <Button variant="outline" className="rounded-full border-navy/20">
              {t("ctaContact")}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
