/**
 * 네트워크 가격 단위 보정 — 만원 → 원 (1회성 마이그레이션).
 *
 * 배경:
 *   과거 네트워크 가격(pricePerUnit·pricePackage·packageOptions[].price)은 "만원" 단위로
 *   저장되고, 공개 표시에서 ×10,000 하여 원으로 변환했다(일반 매체는 처음부터 원 단위).
 *   이 단위 불일치를 제거하기 위해 코드 전반을 "원 단위"로 통일하면서 표시 ×10,000 을 제거했다.
 *   따라서 "기존" 네트워크 데이터(만원)는 ×10,000 하여 원으로 1회 보정해야 표시 금액이 유지된다.
 *   (보정 방향 1번: 현재 표시 금액 보존)
 *
 *   순효과: 표시 ×10,000 제거 + DB 값 ×10,000 = 사용자에게 보이는 금액 불변.
 *
 * ⚠️ 반드시 코드(단위 통일) 배포 "직후, 새 네트워크가 원 단위로 생성되기 전에" 1회만 실행할 것.
 *   값 자체로는 "만원 30000(=3억)"과 "원 30000(=₩30,000)"을 구분할 수 없으므로
 *   (동일한 숫자, 다른 의미) 중복 실행 방지는 SiteSetting 플래그에 의존한다.
 *
 * 사용법:
 *   npx tsx scripts/backfill-network-price-units.ts            # dry-run (DB 변경 없음, 로그만)
 *   npx tsx scripts/backfill-network-price-units.ts --apply    # 실제 DB 업데이트 + 완료 플래그 기록
 *   npx tsx scripts/backfill-network-price-units.ts --apply --force   # 이미 완료 플래그가 있어도 강제 실행
 *
 * 필요 env: DATABASE_URL (prod Neon 등). 로컬에서 prod 에 직접 접근이 막혀 있으면
 *   접근 가능한 환경(예: Vercel 서버리스 콘솔, 또는 prod DATABASE_URL 을 가진 곳)에서 실행할 것.
 */
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: ".env.local" });

const APPLY = process.argv.includes("--apply");
const FORCE = process.argv.includes("--force");
const MIGRATION_FLAG = "network_price_unit_migrated_to_won_v1";

/**
 * 이미 "원 단위"로 보이는 값은 건너뛴다(이중 ×10,000 방지 안전장치).
 * 만원 단위에서 1,000,000(=100억원)은 비현실적이므로, 이 이상이면 이미 원 단위로 간주.
 * 단, 이 휴리스틱만으로는 완전한 구분이 불가능하므로 주 방어선은 MIGRATION_FLAG 이다.
 */
const ALREADY_WON_THRESHOLD = 1_000_000;

const prisma = new PrismaClient();

/** 만원 → 원. 이미 원으로 보이는 값(임계 이상)은 그대로 반환하고 skipped 로 표시. */
function manWonToWon(
  value: number | null | undefined,
): { next: number | null; changed: boolean; skipped: boolean } {
  if (value == null || !Number.isFinite(value) || value <= 0) {
    return { next: value ?? null, changed: false, skipped: false };
  }
  if (value >= ALREADY_WON_THRESHOLD) {
    return { next: value, changed: false, skipped: true };
  }
  return { next: Math.round(value * 10_000), changed: true, skipped: false };
}

type PackageTier = { units?: unknown; price?: unknown; [k: string]: unknown };

function convertPackageOptions(raw: unknown): {
  next: unknown;
  changed: boolean;
  logs: string[];
} {
  if (!Array.isArray(raw)) return { next: raw, changed: false, logs: [] };
  let changed = false;
  const logs: string[] = [];
  const next = raw.map((item) => {
    if (!item || typeof item !== "object") return item;
    const o = item as PackageTier;
    const price = typeof o.price === "number" ? o.price : Number(o.price);
    if (!Number.isFinite(price)) return item;
    const r = manWonToWon(price);
    if (r.changed) {
      changed = true;
      logs.push(`      tier(units=${String(o.units)}): ${price} → ${r.next}`);
      return { ...o, price: r.next };
    }
    if (r.skipped) {
      logs.push(`      tier(units=${String(o.units)}): ${price} (이미 원 단위로 판단, 건너뜀)`);
    }
    return item;
  });
  return { next, changed, logs };
}

async function main() {
  console.log(
    `${APPLY ? "🟢 APPLY" : "🟡 DRY-RUN"} · 네트워크 가격 단위 보정 (만원 → 원)\n`,
  );

  // 중복 실행 방지 플래그 확인
  const existingFlag = await prisma.siteSetting.findUnique({
    where: { key: MIGRATION_FLAG },
  });
  if (existingFlag && !FORCE) {
    console.error(
      `❌ 이미 마이그레이션 완료 플래그(${MIGRATION_FLAG} = ${existingFlag.value})가 존재합니다.\n` +
        "   중복 ×10,000 을 막기 위해 중단합니다. 정말 다시 실행하려면 --force 를 추가하세요.",
    );
    await prisma.$disconnect();
    process.exit(1);
  }

  const networks = await prisma.mediaNetwork.findMany({
    select: {
      id: true,
      name: true,
      pricePerUnit: true,
      pricePackage: true,
      packageOptions: true,
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`대상 네트워크 ${networks.length}건\n`);

  let updatedCount = 0;
  for (const n of networks) {
    const data: {
      pricePerUnit?: number;
      pricePackage?: number;
      packageOptions?: unknown;
    } = {};
    const logs: string[] = [];

    const ppu = manWonToWon(n.pricePerUnit);
    if (ppu.changed && ppu.next != null) {
      data.pricePerUnit = ppu.next;
      logs.push(`    pricePerUnit: ${n.pricePerUnit} → ${ppu.next}`);
    } else if (ppu.skipped) {
      logs.push(`    pricePerUnit: ${n.pricePerUnit} (이미 원 단위로 판단, 건너뜀)`);
    }

    const ppk = manWonToWon(n.pricePackage);
    if (ppk.changed && ppk.next != null) {
      data.pricePackage = ppk.next;
      logs.push(`    pricePackage: ${n.pricePackage} → ${ppk.next}`);
    } else if (ppk.skipped) {
      logs.push(`    pricePackage: ${n.pricePackage} (이미 원 단위로 판단, 건너뜀)`);
    }

    const pkg = convertPackageOptions(n.packageOptions);
    if (pkg.changed) {
      data.packageOptions = pkg.next;
      logs.push("    packageOptions:");
      logs.push(...pkg.logs);
    } else if (pkg.logs.length > 0) {
      logs.push("    packageOptions:");
      logs.push(...pkg.logs);
    }

    if (Object.keys(data).length === 0) {
      continue;
    }

    console.log(`  • [${n.name}] (${n.id})`);
    for (const l of logs) console.log(l);

    if (APPLY) {
      await prisma.mediaNetwork.update({
        where: { id: n.id },
        // packageOptions 가 변경된 경우에만 Json 으로 전달
        data: data as never,
      });
    }
    updatedCount++;
  }

  if (APPLY) {
    await prisma.siteSetting.upsert({
      where: { key: MIGRATION_FLAG },
      create: { key: MIGRATION_FLAG, value: new Date().toISOString() },
      update: { value: new Date().toISOString() },
    });
  }

  console.log(
    `\n── 결과 ── 보정 대상 ${updatedCount} / 전체 ${networks.length}` +
      (APPLY
        ? ` (DB 반영됨, 완료 플래그 ${MIGRATION_FLAG} 기록)`
        : " (DRY-RUN — DB 미변경, --apply 로 반영)"),
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
