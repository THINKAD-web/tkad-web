/**
 * 네트워크 지점 좌표 백필 — address 만 있고 lat/lng 가 null 인 location 을
 * Kakao Local API(주소→좌표)로 채운다.
 *
 *   npx tsx scripts/backfill-network-coords.ts            # dry-run (DB 변경 없음, 로그만)
 *   npx tsx scripts/backfill-network-coords.ts --apply    # 실제 DB 업데이트
 *   npx tsx scripts/backfill-network-coords.ts --network=<id>   # 특정 네트워크만
 *
 * 필요 env: KAKAO_REST_API_KEY  (Kakao Developers > 앱 > REST API 키)
 *   - 로컬: .env.local 에 KAKAO_REST_API_KEY=... 추가
 *   - Vercel: Project Settings > Environment Variables 에 KAKAO_REST_API_KEY 추가
 */
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: ".env.local" });

const APPLY = process.argv.includes("--apply");
const NETWORK_ID =
  process.argv.find((a) => a.startsWith("--network="))?.slice("--network=".length) ?? null;
const KEY = process.env.KAKAO_REST_API_KEY?.trim();

const prisma = new PrismaClient();

type KakaoDoc = { x: string; y: string; address_name?: string };

async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`;
  try {
    const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KEY}` } });
    if (!res.ok) {
      // 도로명 검색 실패 시 키워드 검색 폴백
      const kw = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(address)}`;
      const r2 = await fetch(kw, { headers: { Authorization: `KakaoAK ${KEY}` } });
      if (!r2.ok) return null;
      const j2 = (await r2.json()) as { documents?: KakaoDoc[] };
      const d2 = j2.documents?.[0];
      return d2 ? { lat: Number(d2.y), lng: Number(d2.x) } : null;
    }
    const j = (await res.json()) as { documents?: KakaoDoc[] };
    const d = j.documents?.[0];
    return d ? { lat: Number(d.y), lng: Number(d.x) } : null;
  } catch (e) {
    console.error("  geocode error:", e instanceof Error ? e.message : e);
    return null;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  if (!KEY) {
    console.error(
      "❌ KAKAO_REST_API_KEY 가 없습니다. .env.local 또는 환경변수에 추가하세요.\n" +
        "   (Kakao Developers > 내 애플리케이션 > 앱 키 > REST API 키)",
    );
    process.exit(1);
  }

  const rows = await prisma.mediaNetworkLocation.findMany({
    where: {
      OR: [{ latitude: null }, { longitude: null }],
      AND: [{ OR: [{ address: { not: null } }, { fullAddress: { not: null } }] }],
      ...(NETWORK_ID ? { networkId: NETWORK_ID } : {}),
    },
    select: { id: true, name: true, address: true, fullAddress: true, networkId: true },
    orderBy: { networkId: "asc" },
  });

  console.log(
    `${APPLY ? "🟢 APPLY" : "🟡 DRY-RUN"} · 좌표 없는(주소 보유) 지점 ${rows.length}건\n`,
  );
  let ok = 0;
  let fail = 0;
  for (const r of rows) {
    const addr = (r.fullAddress ?? r.address ?? "").trim();
    const geo = await geocode(addr);
    if (!geo || !Number.isFinite(geo.lat) || !Number.isFinite(geo.lng)) {
      fail++;
      console.log(`  ❌ [${r.name}] "${addr}" → 좌표 못 찾음`);
    } else {
      ok++;
      console.log(`  ✅ [${r.name}] "${addr}" → ${geo.lat.toFixed(5)}, ${geo.lng.toFixed(5)}`);
      if (APPLY) {
        await prisma.mediaNetworkLocation.update({
          where: { id: r.id },
          data: { latitude: geo.lat, longitude: geo.lng },
        });
      }
    }
    await sleep(120); // Kakao rate-limit 여유
  }

  console.log(
    `\n── 결과 ── 성공 ${ok} · 실패 ${fail} · 전체 ${rows.length}` +
      (APPLY ? " (DB 반영됨)" : " (DRY-RUN — DB 미변경, --apply 로 반영)"),
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
