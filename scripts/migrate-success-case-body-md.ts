/**
 * published 성공사례 challengeKo/solutionKo 1회성 정리 — GFM 테이블 정합성·mega-blob 분리.
 *
 *   npx tsx scripts/migrate-success-case-body-md.ts           # dry-run
 *   npx tsx scripts/migrate-success-case-body-md.ts --apply   # DB 반영
 *
 * 대상: F&B/K-pop/뷰티 solutionKo 중복 제거, 패션 challenge/solution 재분할.
 * summaryKo·resultsKo·IT/앱(cmpmpuap6…) 은 변경하지 않음.
 */
import { config } from "dotenv";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

config({ path: ".env.local" });

const APPLY = process.argv.includes("--apply");

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error("DATABASE_URL not set (.env.local)");
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const IT_APP_ID = "cmpmpuap60001s82jdeczcltp";

/** solutionKo — 테이블 + 집행 운영 설명만 (중복 전략 섹션 제거) */
const SOLUTION_REPLACEMENTS: Record<string, string> = {
  cmpmpw1fm0003s82jyw0ig1tr: `| 항목 | 내용 |
|------|------|
| **지역** | 성수동 카페거리·뚝섬역 일대 / 한남동 이태원로·한강진역 인근 |
| **버스쉘터** | 성수 3면 + 한남 3면, 총 6면 집행 |
| **DOOH** | 성수 상권 2개소 + 한남 상권 2개소, 총 4개소 |
| **기간** | 2개월 (오픈 D-14 선집행 → 오픈 후 6주 유지) |
| **소재** | 버스쉘터: 메뉴 핵심 비주얼 + '성수/한남 오픈' 카피 / DOOH: 15초 영상 소재 (메뉴 퍼레이드 + 오픈 이벤트 고지) |
| **예산 배분** | 버스쉘터 월 350만원 + DOOH 월 450만원 (총 월 800만원) |

오픈 2주 전부터 버스쉘터를 먼저 집행해 **'곧 옵니다'** 티저 무드를 형성하고, 오픈 당일 DOOH 소재를 **'드디어 오픈'** 버전으로 교체해 현장감을 높였다. DOOH의 경우 주말 피크타임(12~19시)에 노출 빈도를 집중 배분하여 실제 상권 방문객에게 도달 효율을 높였다.`,

  cmpmpv6s30002s82jlxjmt4i7: `| 구분 | 매체 | 위치 | 소재 | 기간 |
|------|------|------|------|------|
| DOOH | 대형 외벽 전광판 | 코엑스 인근 A빌딩 외벽 | 15초 영상 (컴백 티저 + 앨범 하이라이트) | 4주 |
| DOOH | 미디어폴 | 강남역 11번 출구 앞 | 10초 루프 영상 (아티스트 비주얼 컷) | 4주 |
| 지하철 | 스크린도어 (PSD) | 2호선 강남역 전 승강장 | 정지형 이미지 + 컴백 D-day 카운트다운 | 4주 |
| 지하철 | 스크린도어 (PSD) | 2호선 삼성역 전 승강장 | 그룹 단체 비주얼 이미지 | 4주 |
| 지하철 | 와이드 칼라 현수막 | 강남역 2·4번 출구 환승 통로 | 아티스트 개인별 풀샷 컷 4종 | 4주 |

**소재 전략:** 컴백 1주차는 티저 무드의 미스터리한 분위기 소재, 2주차 발매일 전후로는 타이틀곡 MV 하이라이트 컷과 앨범 커버를 전면 배치, 3~4주차에는 음방 퍼포먼스 스틸컷으로 소재를 교체하여 캠페인 기간 내 소재 노출 피로도를 줄이고 팬들이 "또 왔더니 달라졌다"는 재방문 동기를 만들었다.`,

  cmpmpteu40000s82j3r7yo6iw: `| 구분 | 내용 |
|------|------|
| **집행 지역** | 강남구 일대 (강남역 사거리, 신사동 가로수길, 압구정 로데오 인근) |
| **매체 유형** | 실외 DOOH 대형 전광판 2개소, 실내 DOOH 스크린(복합쇼핑몰 내) 3개소 |
| **집행 기간** | 3개월 (1월~3월) |
| **월 예산** | 1,500만원 × 3개월 = 총 4,500만원 |
| **소재 구성** | 15초 영상 소재 2종(브랜드 인지용 / 제품 기능 소구용), 정적 이미지 소재 1종 |
| **노출 빈도** | 1시간당 평균 6~8회 루프 반복 노출 |
| **시간대 운영** | 평일 07:00~22:00 / 주말 10:00~23:00 |

**소재 전략** 측면에서는 글로벌 본사의 비주얼 가이드라인을 유지하면서도, 한국 소비자 감성에 맞게 자막과 제품 클로즈업 컷을 현지화하여 제작하였습니다. 특히 가로수길 외부 전광판은 SNS 촬영 명소로 알려진 위치에 배치하여 자발적 바이럴 유도를 의도하였습니다.`,
};

const FASHION_ID = "cmpmpwvte0004s82j4mx4tutt";

const FASHION_CHALLENGE = `### 📌 캠페인 배경

패션 브랜드 E사는 론칭 초기 10~20대 초반을 겨냥한 캐주얼 브랜드로 자리잡았으나, 시간이 지나면서 **"저렴하고 트렌디하지 않다"는 이미지**가 굳어지는 위기에 직면했다. 실제 소비자 조사에서 핵심 타깃으로 삼고자 하는 20대 중후반 MZ세대의 브랜드 호감도가 경쟁사 대비 현저히 낮게 나타났으며, 신규 컬렉션 출시에도 반응이 기대치를 밑돌고 있었다.

이에 E사는 단순한 프로모션 광고가 아닌, **브랜드 자체의 정체성을 재정립하는 리포지셔닝 전략**이 필요하다고 판단했다. 디지털 광고만으로는 브랜드의 물리적 존재감과 신뢰감을 구축하기 어렵다는 내부 결론 아래, OOH 매체 집행을 핵심 채널로 선정했다.

특히 "브랜드를 보여주는 것"이 아니라 **"브랜드가 어디에 있는지를 보여주는 것"** 자체가 메시지가 되어야 한다는 전략 방향을 설정했고, 그 무대로 홍대를 선택했다.

### 🎯 전략

**왜 홍대인가?**

홍대는 단순한 유동인구 밀집 지역을 넘어, 국내 패션·문화 트렌드의 발원지이자 MZ세대가 "이 브랜드, 홍대에 있네"라는 인식만으로도 감도 높은 브랜드로 재평가하는 상징성을 지닌 지역이다. 실제 패션 업계에서는 홍대 노출 여부가 브랜드의 스트리트 크레디빌리티(Street Credibility)에 직결된다는 인식이 형성되어 있다.

**왜 빌보드인가?**

디지털 배너나 SNS 광고는 스킵이 가능하지만, 대형 빌보드는 **회피 불가능한 존재감**을 지닌다. E사가 목표한 리포지셔닝은 짧은 노출이 반복되는 디지털 방식보다, 특정 공간에서 **압도적인 시각 임팩트로 브랜드 이미지를 각인**시키는 방식이 더 효과적이라고 판단했다. 또한 홍대 거리를 오가는 소비자들이 빌보드를 배경으로 사진을 찍고 SNS에 업로드하는 **자발적 2차 확산 효과**도 전략에 포함되었다.

3개월이라는 기간 설정 역시 중요한 전략적 선택이었다. 단기 집행으로 이미지를 바꾸려는 시도는 오히려 "캠페인성 이벤트"로 소비될 수 있기 때문에, **계절 한 사이클을 아우르는 3개월 연속 노출**을 통해 브랜드 이미지 변화의 지속성을 확보하고자 했다.`;

const FASHION_SOLUTION = `### 📋 집행 내용

| 항목 | 내용 |
|------|------|
| **매체** | 홍대 메인 스트리트 대형 빌보드 1면 (단독 독점 게재) |
| **위치** | 홍대입구역~홍대 걷고싶은거리 주요 교차점 인근 초대형 빌보드 |
| **규격** | 가로 10m × 세로 7m 대형 사이즈 |
| **기간** | 3개월 (총 90일 연속 게재) |
| **월 예산** | 1,200만원 × 3개월 = 총 3,600만원 |
| **소재 구성** | 총 3개 소재, 월 1회 교체 방식으로 운영 |

**소재 구성 상세:**

- **1개월차 소재:** 브랜드 로고와 새로운 슬로건만을 담은 미니멀한 비주얼. "E사가 달라졌다"는 메시지를 말 대신 여백으로 전달. 배경은 무채색 계열로 기존 브랜드 이미지와의 단절을 시각화.

- **2개월차 소재:** 신규 시즌 컬렉션의 핵심 룩을 착장한 모델 이미지. 모델은 기존 광고에서 볼 수 없었던 20대 후반~30대 초반의 도시적 감성을 지닌 인물로 선정. 카피는 "다시, E"로 압축.

- **3개월차 소재:** 실제 홍대 거리를 배경으로 촬영한 캠페인 비주얼. OOH 광고가 걸린 홍대 공간 자체를 콘텐츠화함으로써 "E사는 이미 홍대의 일부"라는 메시지를 자연스럽게 내재화.`;

type FieldUpdate = {
  id: string;
  industry: string;
  field: "challengeKo" | "solutionKo";
  before: string;
  after: string;
};

async function main() {
  const targetIds = [...Object.keys(SOLUTION_REPLACEMENTS), FASHION_ID];
  const rows = await prisma.successCase.findMany({
    where: { id: { in: targetIds }, status: "published" },
    select: {
      id: true,
      industry: true,
      challengeKo: true,
      solutionKo: true,
      summaryKo: true,
    },
  });

  if (rows.length === 0) {
    console.error("대상 published 사례 없음.");
    process.exit(1);
  }

  const updates: FieldUpdate[] = [];

  for (const id of Object.keys(SOLUTION_REPLACEMENTS)) {
    const row = rows.find((r) => r.id === id);
    if (!row) {
      console.warn(`skip missing ${id}`);
      continue;
    }
    const after = SOLUTION_REPLACEMENTS[id]!;
    if (row.solutionKo.trim() !== after.trim()) {
      updates.push({
        id,
        industry: row.industry,
        field: "solutionKo",
        before: row.solutionKo,
        after,
      });
    }
  }

  const fashion = rows.find((r) => r.id === FASHION_ID);
  if (fashion) {
    if (fashion.challengeKo.trim() !== FASHION_CHALLENGE.trim()) {
      updates.push({
        id: FASHION_ID,
        industry: fashion.industry,
        field: "challengeKo",
        before: fashion.challengeKo,
        after: FASHION_CHALLENGE,
      });
    }
    if (fashion.solutionKo.trim() !== FASHION_SOLUTION.trim()) {
      updates.push({
        id: FASHION_ID,
        industry: fashion.industry,
        field: "solutionKo",
        before: fashion.solutionKo,
        after: FASHION_SOLUTION,
      });
    }
  }

  const backupDir = join(process.cwd(), "scripts", ".backups");
  mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = join(backupDir, `success-case-body-md-${stamp}.json`);
  writeFileSync(backupPath, JSON.stringify({ updates }, null, 2), "utf8");

  console.log(`${APPLY ? "🟢 APPLY" : "🟡 DRY-RUN"} · ${updates.length}건 갱신 예정`);
  console.log(`백업: ${backupPath}\n`);
  console.log(`제외: summaryKo, resultsKo, ${IT_APP_ID}\n`);

  for (const u of updates) {
    console.log(`  [${u.industry}] ${u.id} · ${u.field}`);
    console.log(`    before (${u.before.length}자): ${u.before.slice(0, 72)}…`);
    console.log(`    after  (${u.after.length}자): ${u.after.slice(0, 72)}…`);
    if (APPLY) {
      await prisma.successCase.update({
        where: { id: u.id },
        data: { [u.field]: u.after },
      });
    }
  }

  if (!APPLY && updates.length > 0) {
    console.log("\n실제 반영: npx tsx scripts/migrate-success-case-body-md.ts --apply");
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
