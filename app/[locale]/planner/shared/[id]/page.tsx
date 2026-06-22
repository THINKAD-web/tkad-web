import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { BtnBlock } from "@/components/brutalist";
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
  ageKeys?: string[];
  ageKey?: string;
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
        <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-primary">
          [ EXPIRED ]
        </p>
        <h1 className="mt-3 text-xl font-bold tracking-tight text-foreground">
          {t("shareExpiredTitle")}
        </h1>
        <p className="mt-2 text-[12px] tracking-tight text-muted-foreground">
          {t("shareExpiredBody")}
        </p>
        <div className="mt-6 inline-block">
          <BtnBlock href="/planner" variant="accent" size="md">
            {t("shareExpiredCta")}
          </BtnBlock>
        </div>
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
    <div className="min-h-screen bg-background">
      <section className="bg-hero-void py-14 text-hero-fg">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-primary">
            {`// SHARED PLAN`}
          </p>
          <div className="mt-3 inline-block border-2 border-primary bg-primary px-2 py-0.5 font-display text-xs font-medium uppercase tracking-[0.22em] text-primary-foreground">
            {t("shareViewBadge")}
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-3 text-[12px] tracking-tight text-hero-fg/75">
            {t("shareViewSubtitle")}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
        <div className="border-2 border-border bg-card">
          <div className="border-b-2 border-border p-5">
            <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-primary">
              [ OVERVIEW ]
            </p>
            <h3 className="mt-2 text-lg font-bold tracking-tight text-foreground">
              {t("reportSectionOverview")}
            </h3>
            <p className="mt-1 text-[11px] tracking-tight text-muted-foreground">
              {t("shareViewSubtitle")}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-0 p-4 text-sm sm:grid-cols-2">
            <div className="-mt-[2px] -ml-[2px] border-2 border-border bg-card p-4">
              <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                [ {t("reportLabelGoal")} ]
              </p>
              <p className="mt-2 font-bold text-foreground">
                {plan.campaignGoal
                  ? t(`goal${capitalize(plan.campaignGoal)}` as never)
                  : "—"}
              </p>
            </div>
            <div className="-mt-[2px] -ml-[2px] border-2 border-border bg-card p-4">
              <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                [ {t("reportLabelBudget")} ]
              </p>
              <p className="mt-2 font-display font-bold tabular-nums text-foreground">
                {budgetMan.toLocaleString()}
                {isKo ? " 만원" : " ₩10K"}
              </p>
            </div>
            <div className="-mt-[2px] -ml-[2px] border-2 border-border bg-card p-4">
              <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                [ {t("reportLabelPeriod")} ]
              </p>
              <p className="mt-2 font-bold text-foreground">
                {plan.months}
                {isKo ? "개월" : " months"}
              </p>
            </div>
            <div className="-mt-[2px] -ml-[2px] border-2 border-border bg-card p-4">
              <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                [ {t("reportLabelRegions")} ]
              </p>
              <p className="mt-2 font-bold text-foreground">
                {(plan.regions ?? []).join(", ") || "—"}
              </p>
            </div>
            <div className="-mt-[2px] -ml-[2px] border-2 border-border bg-card p-4 sm:col-span-2">
              <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                [ {t("reportLabelCategories")} ]
              </p>
              <p className="mt-2 font-bold text-foreground">
                {categories
                  .map((c) => t(`cat${capitalize(c)}` as never))
                  .join(", ")}
              </p>
            </div>
          </div>
        </div>

        {selected.length > 0 ? (
          <div className="border-2 border-border bg-card">
            <div className="border-b-2 border-border p-5">
              <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-primary">
                [ {t("reportSectionMedia")} ]
              </p>
            </div>
            <div className="grid grid-cols-1 gap-0 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {selected.map((m) => (
                <div
                  key={m.id}
                  className="-mt-[2px] -ml-[2px] flex flex-col gap-2 border-2 border-border bg-card p-3"
                >
                  <CompositePreview
                    mediaImageUrl={getPrimaryMediaImageUrl(m)}
                    mediaName={isKo ? m.name : m.nameEn || m.name}
                    logoUrl={plan.creativeUploadedUrl ?? null}
                    placement={plan.mediaPlacements?.[m.id]}
                    missingLabel={t("mediaPhotoMissing")}
                  />
                  <p className="line-clamp-2 text-sm font-bold tracking-tight text-foreground">
                    {isKo ? m.name : m.nameEn || m.name}
                  </p>
                  <p className="font-display text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    {`// `}{isKo
                      ? m.location.slice(0, 40)
                      : (m.locationEn || m.location).slice(0, 40)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3 border-t-2 border-border pt-6">
          <BtnBlock href="/planner" variant="accent" size="md">
            {t("shareStartOwnCta")}
          </BtnBlock>
          <BtnBlock href="/contact" variant="secondary" size="md">
            {t("ctaContact")}
          </BtnBlock>
        </div>
      </div>
    </div>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
