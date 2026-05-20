import { AB_TEST_KEY, isAbVariant, type AbVariant } from "@/lib/ab-testing";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export async function ensureAbTestConfig() {
  if (!isDatabaseConfigured()) return null;
  const db = getPrisma();
  return db.abTestConfig.upsert({
    where: { testKey: AB_TEST_KEY },
    create: { testKey: AB_TEST_KEY },
    update: {},
  });
}

export async function getAbTestConfig() {
  if (!isDatabaseConfigured()) return null;
  const db = getPrisma();
  const row = await db.abTestConfig.findUnique({
    where: { testKey: AB_TEST_KEY },
  });
  if (!row) {
    return db.abTestConfig.create({
      data: { testKey: AB_TEST_KEY },
    });
  }
  return row;
}

export async function getForcedAbVariant(): Promise<AbVariant | null> {
  const row = await getAbTestConfig();
  if (!row?.forcedVariant) return null;
  return isAbVariant(row.forcedVariant) ? row.forcedVariant : null;
}

export async function setAbTestWinner(variant: AbVariant) {
  if (!isDatabaseConfigured()) {
    throw new Error("Database not configured");
  }
  const db = getPrisma();
  return db.abTestConfig.upsert({
    where: { testKey: AB_TEST_KEY },
    create: { testKey: AB_TEST_KEY, forcedVariant: variant },
    update: { forcedVariant: variant },
  });
}

export async function startNextAbTest() {
  if (!isDatabaseConfigured()) {
    throw new Error("Database not configured");
  }
  const db = getPrisma();
  const existing = await getAbTestConfig();
  return db.abTestConfig.upsert({
    where: { testKey: AB_TEST_KEY },
    create: { testKey: AB_TEST_KEY, generation: 1, forcedVariant: null },
    update: {
      forcedVariant: null,
      generation: (existing?.generation ?? 0) + 1,
    },
  });
}

export type AbEventStats = {
  generation: number;
  forcedVariant: AbVariant | null;
  variants: {
    variant: AbVariant;
    impressions: number;
    ctaClicks: number;
    ctr: number;
  }[];
};

export async function getAbEventStats(): Promise<AbEventStats | null> {
  if (!isDatabaseConfigured()) return null;
  const db = getPrisma();
  const config = await getAbTestConfig();
  const generation = config?.generation ?? 1;

  const [impressions, clicks] = await Promise.all([
    db.abEvent.groupBy({
      by: ["variant"],
      where: { testKey: AB_TEST_KEY, event: "hero_impression" },
      _count: { _all: true },
    }),
    db.abEvent.groupBy({
      by: ["variant"],
      where: { testKey: AB_TEST_KEY, event: "cta_click" },
      _count: { _all: true },
    }),
  ]);

  const impMap = new Map(
    impressions.map((r) => [r.variant, r._count._all]),
  );
  const clickMap = new Map(clicks.map((r) => [r.variant, r._count._all]));

  const variants = (["a", "b"] as const).map((variant) => {
    const imp = impMap.get(variant) ?? 0;
    const ctaClicks = clickMap.get(variant) ?? 0;
    const ctr = imp > 0 ? (ctaClicks / imp) * 100 : 0;
    return { variant, impressions: imp, ctaClicks, ctr };
  });

  const forcedRaw = config?.forcedVariant ?? null;
  const forcedVariant = isAbVariant(forcedRaw) ? forcedRaw : null;
  return {
    generation,
    forcedVariant,
    variants,
  };
}

export async function recordAbEvent(input: {
  variant: AbVariant;
  event: string;
  page: string;
  testKey?: string;
}) {
  if (!isDatabaseConfigured()) return false;
  const db = getPrisma();
  await db.abEvent.create({
    data: {
      testKey: input.testKey ?? AB_TEST_KEY,
      variant: input.variant,
      event: input.event,
      page: input.page,
    },
  });
  return true;
}
