import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const OPEN_REPORT_TITLE_KO =
  "THINKAD 싱커드 정식 오픈 — 한국 OOH 시장 새로운 기준";

/** 오픈 공지용 트렌드 리포트·이벤트 메타 시드 (관리자 1회 실행) */
export async function POST(request: NextRequest) {
  const denied = assertAdminDb(request);
  if (denied) return denied;
  if (!isDatabaseConfigured()) {
    return json({ error: "DB not configured" }, 503);
  }

  const db = getPrisma();
  const existing = await db.trendReport.findFirst({
    where: { titleKo: { contains: "정식 오픈" } },
    select: { id: true, slug: true },
  });

  if (existing) {
    return json({
      ok: true,
      skipped: true,
      reportId: existing.id,
      slug: existing.slug,
      message: "Open launch report already exists",
    });
  }

  const slug = `thinkad-official-open-${new Date().getFullYear()}`;
  const report = await db.trendReport.create({
    data: {
      slug,
      titleKo: OPEN_REPORT_TITLE_KO,
      titleEn: "THINKAD Official Launch — A New Standard for Korea OOH",
      summaryKo: [
        "THINKAD 싱커드 정식 오픈 — 데이터 기반 OOH 기획·500+ 검증 매체",
        "오픈 기념: 첫 30명 무료 컨설팅 + PRO 1개월 체험",
      ],
      marketTrendKo: [
        "한국 OOH 시장은 디지털·데이터 결합 수요가 빠르게 성장 중",
        "매체 검증·투명한 견적 프로세스가 광고주 의사결정의 핵심",
      ],
      doohTrendKo: ["DOOH·프로그래매틱 옥외 연동 수요 증가"],
      contentKo: `## 정식 오픈

THINKAD 싱커드가 한국 OOH 시장을 위한 **데이터·기획·집행 원스톱** 플랫폼으로 정식 오픈했습니다.

### 오픈 이벤트
- **첫 30명**: 무료 컨설팅 + PRO 1개월 체험 — [요금제](/pricing)

### 지금 바로
- [AI 플래너](/planner) · [성공 사례](/cases)
`,
      status: "published",
      publishedAt: new Date(),
      generationMethod: "manual",
      metaDescription:
        "THINKAD 싱커드 정식 오픈. 한국 OOH 시장의 새로운 기준 — 데이터 기반 매체 추천·견적·집행.",
      tags: ["launch", "ooh", "thinkad"],
    },
    select: { id: true, slug: true },
  });

  return json({
    ok: true,
    reportId: report.id,
    slug: report.slug,
    eventCopy: {
      banner: "🎉 정식 오픈! 첫 30명 PRO 무료 체험 신청하기 →",
      pricingHref: "/pricing",
    },
  });
}
