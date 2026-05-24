import "dotenv/config";
import { PrismaClient, ReportCategory } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { randomBytes, scryptSync } from "crypto";
import { allSampleSuccessCaseSeedData } from "@/lib/sample-success-case";
import { normalizePgDatabaseUrl } from "@/lib/normalize-pg-database-url";

function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plain, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  const pool = new Pool({
    connectionString: normalizePgDatabaseUrl(process.env.DATABASE_URL!),
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  console.log("Seeding database...\n");

  const { seedMediaCategories } = await import("@/lib/seed-media-categories");
  await seedMediaCategories(prisma);
  console.log("MediaCategory + TargetCategory seeded");

  // --- Admin ---
  const admin = await prisma.adminUser.upsert({
    where: { email: "admin@tkad.co.kr" },
    update: {},
    create: {
      email: "admin@tkad.co.kr",
      password: hashPassword("admin1234!"),
      name: "관리자",
    },
  });
  console.log(`Admin: ${admin.email}`);

  // --- Media (THINKAD representative media) ---
  const mediaData = [
    {
      name: "코엑스 K-POP 스퀘어",
      nameEn: "COEX K-POP Square LED",
      location: "서울 강남구 영동대로 513 코엑스",
      region: "서울",
      type: "digital",
      price: 50000000,
      width: "80900",
      height: "20100",
    },
    {
      name: "강남대로 미디어폴 G-LIGHT",
      nameEn: "Gangnam-daero Media Pole G-LIGHT",
      location: "강남역-신논현역 760m 구간",
      region: "서울",
      type: "digital",
      price: 40000000,
      width: "1500",
      height: "5340",
    },
    {
      name: "신논현역 DSG빌딩 전광판",
      nameEn: "Sinnonhyeon DSG Building LED",
      location: "강남대로 신논현역 사거리",
      region: "서울",
      type: "digital",
      price: 28000000,
      width: "12000",
      height: "8000",
    },
    {
      name: "청담동 학동사거리 SS타워 전광판",
      nameEn: "Cheongdam SS Tower LED",
      location: "서울 강남구 학동사거리",
      region: "서울",
      type: "digital",
      price: 32000000,
      width: "10000",
      height: "7000",
    },
    {
      name: "성수동 반도 외벽광고",
      nameEn: "Seongsu Bando Exterior Ad",
      location: "서울 성동구 성수동2가",
      region: "서울",
      type: "static",
      price: 20000000,
      width: "15000",
      height: "10000",
    },
    {
      name: "지하철 2호선 성수역 디지털광고",
      nameEn: "Seongsu Station Line 2 Digital Ad",
      location: "서울 성동구 성수역",
      region: "서울",
      type: "mobile",
      price: 15000000,
      width: "2000",
      height: "800",
    },
    {
      name: "코엑스 파르나스 미디어타워",
      nameEn: "COEX Parnas Media Tower",
      location: "삼성역 코엑스",
      region: "서울",
      type: "digital",
      price: 35000000,
      width: "5000",
      height: "12000",
    },
  ];

  for (const m of mediaData) {
    await prisma.media.create({ data: m });
  }
  console.log(`Media: ${mediaData.length} created`);

  // --- Contact Inquiries (5 test) ---
  const inquiryData = [
    {
      company: "삼성전자",
      name: "김민수",
      phone: "010-1234-5678",
      email: "minsu.kim@samsung.com",
      budget: "over5000",
      message:
        "강남역 인근 대형 전광판 캠페인을 기획 중입니다. 3개월 단위 계약이 가능한지 문의드립니다.",
    },
    {
      company: "카카오",
      name: "이지은",
      phone: "010-9876-5432",
      email: "jieun.lee@kakao.com",
      budget: "3000to5000",
      message:
        "신규 서비스 런칭에 맞춰 수도권 지하철 광고를 진행하고 싶습니다. 가능한 매체 리스트를 보내주세요.",
    },
    {
      company: "스타트업허브",
      name: "박서연",
      phone: "010-5555-1234",
      email: "seoyeon@startuphub.kr",
      budget: "under1000",
      message:
        "소규모 예산으로 홍대 지역 옥외광고를 알아보고 있습니다. 추천 매체가 있을까요?",
    },
    {
      company: "현대자동차",
      name: "정재호",
      phone: "010-3333-7777",
      email: "jaeho.jung@hyundai.com",
      budget: "over5000",
      message:
        "전국 주요 도시에서 동시에 진행하는 대규모 OOH 캠페인을 계획 중입니다. 미팅 일정 조율 부탁드립니다.",
    },
    {
      company: "무신사",
      name: "최유나",
      phone: "010-7777-8888",
      email: "yuna.choi@musinsa.com",
      budget: "1000to3000",
      message:
        "코엑스 미디어월에 2주간 광고를 게재하고 싶습니다. 가격과 제작 가이드를 보내주세요.",
    },
  ];

  for (const inq of inquiryData) {
    await prisma.contactInquiry.create({ data: inq });
  }
  console.log(`Inquiries: ${inquiryData.length} created`);

  // --- Published sample success cases (matches /cases fallback copy) ---
  const sampleCases = allSampleSuccessCaseSeedData();
  for (const sampleCase of sampleCases) {
    await prisma.successCase.upsert({
      where: { id: sampleCase.id! },
      create: sampleCase,
      update: {
        status: "published",
        clientName: sampleCase.clientName,
        industry: sampleCase.industry,
        titleKo: sampleCase.titleKo,
        titleEn: sampleCase.titleEn,
        summaryKo: sampleCase.summaryKo,
        challengeKo: sampleCase.challengeKo,
        solutionKo: sampleCase.solutionKo,
        resultsKo: sampleCase.resultsKo,
        metricsJson: sampleCase.metricsJson,
        mediaUsed: sampleCase.mediaUsed,
        periodStart: sampleCase.periodStart,
        periodEnd: sampleCase.periodEnd,
        thumbnailUrl: sampleCase.thumbnailUrl,
        galleryUrls: sampleCase.galleryUrls,
        testimonialKo: sampleCase.testimonialKo,
        publishedAt: sampleCase.publishedAt,
      },
    });
    console.log(`Success case sample: ${sampleCase.id} (published)`);
  }

  // --- Public trend reports (/[locale]/report) ---
  const publishedAt = new Date();
  const reportSeeds: Array<{
    slug: string;
    title: string;
    summary: string;
    category: ReportCategory;
    content: string;
  }> = [
    {
      slug: "ooh-trend-2026",
      title: "2026년 주목할 OOH 광고 트렌드 5가지",
      category: ReportCategory.TREND,
      summary:
        "DOOH 확산, 데이터 기반 매체 선택, 크리에이티브 자동화 등 주목할 변화를 정리했습니다.",
      content: `## 1. DOOH와 프로그래매틱

디지털 옥외는 이제 선택이 아니라 기본 전제에 가깝습니다. 송출·재고가 API로 연결되면서 캠페인 운영 속도가 빨라집니다.

## 2. 데이터 기반 매체 선정

노출수만이 아닌 오디언스·동선·상권 데이터가 견적과 기획의 중심에 섭니다. A/B 테스트와 사후 검증 루틴이 표준화됩니다.

## 3. 크리에이티브 자동화

소재 제작·검수 파이프라인이 자동화되며, 동적 소재로 시간대·날씨·이벤트에 맞춘 메시지 전환이 쉬워집니다.

## 4. 브랜드 세이프티

UGC·리스크 키워드 필터링과 송출 전 검수 체크리스트가 운영 필수 항목으로 자리합니다.

## 5. 통합 리포팅

캠페인 KPI를 웹 대시보드로 공유하고, 대행사·광고주·매체사가 같은 숫자를 보며 의사결정하는 흐름이 가속화됩니다.`,
    },
    {
      slug: "seongsu-hannam-ooh-2026",
      title: "성수·한남 상권 OOH 매체 현황 분석",
      category: ReportCategory.REGION,
      summary:
        "서울 핵심 상권의 옥외광고 매체 분포와 단가 현황을 현장 데이터 기반으로 분석했습니다.",
      content: `## 상권 개요

성수·한남 일대는 유동 인구와 체류 시간이 모두 높아 OOH 수요가 꾸준한 핵심 상권입니다.

## 매체 믹스

대형 전광판·미디어폴·버스쉘터 등 포맷이 다층적으로 분포합니다. 캠페인 목적에 따라 상·하단 믹스를 나누는 전략이 흔합니다.

## 단가·가용성

시즌·패키지에 따라 변동폭이 큽니다. 동일 상권이라도 노출 각도·교통량·야간 가시성에 따라 단가 편차가 발생합니다.

## 실행 체크포인트

제작물 규격, 전기·구조 안전, 송출 스케줄을 사전 확정하면 현장 변수를 줄일 수 있습니다.`,
    },
    {
      slug: "ooh-budget-10m-guide",
      title: "OOH 예산 1천만원, 어떻게 쓸까?",
      category: ReportCategory.CAMPAIGN,
      summary:
        "제한된 예산으로 최대 노출을 뽑는 매체 믹스 전략을 사례 중심으로 안내합니다.",
      content: `## 목표 정의

1천만원 예산에서는 "노출 최대"와 "타깃 정확도" 중 하나를 우선해야 합니다. KPI를 하나로 좁히면 매체 선택이 쉬워집니다.

## 믹스 전략

고가 단일 매체보다, 상보적인 중소형 매체 조합이 리치 대비 효율이 나은 경우가 많습니다.

## 기간·주파수

짧고 강한 집중 vs 길게 나눈 노출. 브랜드 인지 목적이면 주파수를, 리텐션 목적이면 기간을 우선하세요.

## 사후 측정

QR·랜딩·검색량·매장 유입 등 간접 지표를 사전에 설계해 두면 성과 설명이 명확해집니다.`,
    },
  ];

  for (const r of reportSeeds) {
    await prisma.report.upsert({
      where: { slug: r.slug },
      create: {
        slug: r.slug,
        title: r.title,
        summary: r.summary,
        content: r.content,
        category: r.category,
        published: true,
        publishedAt: publishedAt,
      },
      update: {
        title: r.title,
        summary: r.summary,
        content: r.content,
        category: r.category,
        published: true,
        publishedAt: publishedAt,
      },
    });
    console.log(`Report seed: ${r.slug}`);
  }

  console.log("\nSeed completed!");
  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
