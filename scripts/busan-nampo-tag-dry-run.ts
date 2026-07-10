/**
 * busan_nampo regionSub 태깅 dry-run (DB 변경 없음).
 * 실행: npx tsx --env-file=.env.local scripts/busan-nampo-tag-dry-run.ts
 */
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";

const NAMPO_RE =
  /남포|광복|자갈치|중구|부산역|동광|보수동|nampo|gwangbok/i;

async function main() {
  const catalog = await fetchPublicMediaCatalog();
  const busan = catalog.filter(
    (m) => m.regionMain === "busan" || m.region === "busan",
  );

  const candidates = busan.filter((m) => {
    if (m.regionSub === "busan_nampo") return false;
    const hay = [
      m.name,
      m.location,
      m.district,
      m.nearbyStations,
      m.nearbyLandmarks,
      m.nearbyFacilities,
    ]
      .filter(Boolean)
      .join(" ");
    return NAMPO_RE.test(hay);
  });

  console.log("=== busan_nampo 태깅 dry-run (적용 안 함) ===");
  console.log(`부산 매체: ${busan.length}`);
  console.log(`busan_nampo 후보: ${candidates.length}`);
  console.log("");

  for (const m of candidates) {
    console.log(
      `- [${m.id}] ${m.name} | regionSub=${m.regionSub ?? "(null)"} | ${m.location}`,
    );
  }

  if (candidates.length === 0) {
    console.log("(후보 없음 — 키워드 매칭 0건)");
  } else {
    console.log("");
    console.log(
      "승인 후 적용 예시 SQL (수동 검토 필요):",
    );
    for (const m of candidates) {
      console.log(
        `-- UPDATE "Media" SET "regionSub" = 'busan_nampo' WHERE id = '${m.id}';`,
      );
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
