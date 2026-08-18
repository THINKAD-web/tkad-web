import { prisma } from "@/lib/prisma";

async function main() {
  const rows = await prisma.$queryRaw<
    {
      id: string;
      name: string;
      name_en: string | null;
      location: string;
      region: string;
      region_main: string | null;
    }[]
  >`
    SELECT id, name, name_en, location, region, region_main
    FROM media
    WHERE name_en ILIKE '%Gangnam%'
       OR location ILIKE '%Shibuya%' OR location ILIKE '%시부야%'
    LIMIT 50
  `;
  console.log(JSON.stringify({ count: rows.length, rows }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
