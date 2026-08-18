/**
 * U-4 verification — overseas media registration smoke (DB + catalog filter).
 * Run: npx tsx scripts/verify-u4-overseas-media.mts
 */
import { getPrisma } from "../lib/prisma.ts";
import { fetchPlannerMediaCatalog } from "../lib/public-media-catalog.ts";

const TEST_ID = "u4-shibuya-verify-temp";

async function main() {
  const db = getPrisma();
  await db.media.deleteMany({ where: { id: TEST_ID } }).catch(() => {});

  const created = await db.media.create({
    data: {
      id: TEST_ID,
      slug: "u4-shibuya-vision-test",
      name: "시부야 비전 (U4 검증)",
      nameEn: "Shibuya Vision U4",
      country: "JP",
      location: "1-2-3 Dogenzaka, Shibuya, Tokyo",
      region: "jp",
      regionMain: null,
      regionSub: null,
      type: "digital",
      price: 5000000,
      latitude: 35.6595,
      longitude: 139.7004,
      isActive: true,
    },
  });

  const { catalog } = await fetchPlannerMediaCatalog();
  const inPlanner = catalog.some((m) => m.id === created.id);

  const row = await db.media.findUnique({ where: { id: TEST_ID } });
  await db.media.delete({ where: { id: TEST_ID } });

  console.log(
    JSON.stringify(
      {
        created: {
          id: created.id,
          country: created.country,
          lat: created.latitude,
          lng: created.longitude,
          regionMain: created.regionMain,
        },
        plannerExcluded: !inPlanner,
        plannerCatalogSize: catalog.length,
        dbRowOk:
          row?.country === "JP" &&
          row.latitude === 35.6595 &&
          row.regionMain == null,
        pass: !inPlanner && row?.country === "JP",
      },
      null,
      2,
    ),
  );

  if (inPlanner || row?.country !== "JP") process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    const db = getPrisma();
    await db.$disconnect();
  });
