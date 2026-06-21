/**
 * Measure Media.targetAge DB coverage for planner age-matching decisions.
 * Usage: npx tsx scripts/measure-target-age-coverage.mts
 */
import { getPrisma, isDatabaseConfigured } from "../lib/prisma";

async function main() {
  if (!isDatabaseConfigured()) {
    console.error("DATABASE_URL not configured — skip coverage measurement.");
    process.exit(1);
  }

  const prisma = getPrisma();

  const total = await prisma.media.count({
    where: { isActive: true },
  });

  const withTargetAge = await prisma.media.count({
    where: {
      isActive: true,
      AND: [{ targetAge: { not: null } }, { NOT: { targetAge: "" } }],
    },
  });

  const pct = total > 0 ? (withTargetAge / total) * 100 : 0;

  console.log("=== Media.targetAge coverage (active media) ===");
  console.log(`Total active: ${total}`);
  console.log(`With targetAge: ${withTargetAge}`);
  console.log(`Coverage: ${pct.toFixed(1)}%`);
  console.log(
    pct >= 40
      ? "\nRecommendation: coverage is moderate/high — age matching may be viable in a follow-up."
      : "\nRecommendation: coverage is low — defer targetAge matching (Phase 2-a).",
  );

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
