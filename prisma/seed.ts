import "dotenv/config";
import { PrismaClient } from "@prisma/client";
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

  console.log("\nSeed completed!");
  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
