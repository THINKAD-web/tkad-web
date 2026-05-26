import { getPrisma } from "../lib/prisma";
import { MEDIA_PACKAGE_SEED_DATA } from "../lib/media-package-seed-data";

const prisma = getPrisma();

async function main() {
  for (const pkg of MEDIA_PACKAGE_SEED_DATA) {
    await prisma.mediaPackage.upsert({
      where: { slug: pkg.slug },
      create: {
        slug: pkg.slug,
        name: pkg.name,
        subtitle: pkg.subtitle,
        description: pkg.description,
        heroColor: pkg.heroColor,
        icon: pkg.icon,
        order: pkg.order ?? 0,
        isActive: pkg.isActive ?? true,
        filterRegion: pkg.filterRegion,
        filterCategory: pkg.filterCategory,
        filterTarget: pkg.filterTarget,
        filterMaxPrice: pkg.filterMaxPrice,
        filterMinPrice: pkg.filterMinPrice,
        sortBy: pkg.sortBy,
        badgeText: pkg.badgeText ?? null,
        guideSteps: pkg.guideSteps,
        faqs: pkg.faqs,
        targetIndustry: pkg.targetIndustry,
        avgBudget: pkg.avgBudget ?? null,
      },
      update: {
        name: pkg.name,
        subtitle: pkg.subtitle,
        description: pkg.description,
        heroColor: pkg.heroColor,
        icon: pkg.icon,
        order: pkg.order ?? 0,
        isActive: pkg.isActive ?? true,
        filterRegion: pkg.filterRegion,
        filterCategory: pkg.filterCategory,
        filterTarget: pkg.filterTarget,
        filterMaxPrice: pkg.filterMaxPrice,
        filterMinPrice: pkg.filterMinPrice,
        sortBy: pkg.sortBy,
        badgeText: pkg.badgeText ?? null,
        guideSteps: pkg.guideSteps,
        faqs: pkg.faqs,
        targetIndustry: pkg.targetIndustry,
        avgBudget: pkg.avgBudget ?? null,
      },
    });
    console.log(`✓ ${pkg.slug}`);
  }
  console.log(`Seeded ${MEDIA_PACKAGE_SEED_DATA.length} media packages.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
