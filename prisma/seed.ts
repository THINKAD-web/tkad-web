import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { randomBytes, scryptSync } from "crypto";

function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plain, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
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

  // --- Media (10 Korean OOH locations) ---
  const mediaData = [
    {
      name: "강남역 디지털 전광판",
      nameEn: "Gangnam Station Digital Billboard",
      location: "서울 강남구 강남대로 396",
      region: "서울",
      type: "디지털 전광판",
      price: 15000000,
      width: "12000",
      height: "8000",
    },
    {
      name: "홍대입구역 대형 LED",
      nameEn: "Hongdae Station Large LED",
      location: "서울 마포구 양화로 160",
      region: "서울",
      type: "LED",
      price: 12000000,
      width: "10000",
      height: "6000",
    },
    {
      name: "명동 쇼핑거리 빌보드",
      nameEn: "Myeongdong Shopping Street Billboard",
      location: "서울 중구 명동길 14",
      region: "서울",
      type: "빌보드",
      price: 18000000,
      width: "14000",
      height: "10000",
    },
    {
      name: "부산 서면 전광판",
      nameEn: "Busan Seomyeon Billboard",
      location: "부산 부산진구 중앙대로 680",
      region: "부산",
      type: "디지털 전광판",
      price: 8000000,
      width: "8000",
      height: "5000",
    },
    {
      name: "인천공항 라이트박스",
      nameEn: "Incheon Airport Lightbox",
      location: "인천 중구 공항로 272",
      region: "인천",
      type: "라이트박스",
      price: 5000000,
      width: "3000",
      height: "2000",
    },
    {
      name: "대구 동성로 디지털사이니지",
      nameEn: "Daegu Dongseongro Digital Signage",
      location: "대구 중구 동성로 50",
      region: "대구",
      type: "디지털사이니지",
      price: 6000000,
      width: "5000",
      height: "3000",
    },
    {
      name: "코엑스 실내 미디어월",
      nameEn: "COEX Indoor Media Wall",
      location: "서울 강남구 영동대로 513",
      region: "서울",
      type: "미디어월",
      price: 20000000,
      width: "16000",
      height: "4000",
    },
    {
      name: "잠실역 지하철 스크린도어",
      nameEn: "Jamsil Station Screen Door Ad",
      location: "서울 송파구 올림픽로 지하 240",
      region: "서울",
      type: "스크린도어",
      price: 3000000,
      width: "2000",
      height: "800",
    },
    {
      name: "광주 충장로 전광판",
      nameEn: "Gwangju Chungjangro Billboard",
      location: "광주 동구 충장로 1",
      region: "광주",
      type: "전광판",
      price: 5500000,
      width: "7000",
      height: "4500",
    },
    {
      name: "판교 테크노밸리 빌보드",
      nameEn: "Pangyo Technovalley Billboard",
      location: "경기 성남시 분당구 판교역로 235",
      region: "경기",
      type: "빌보드",
      price: 9000000,
      width: "10000",
      height: "5000",
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

  console.log("\nSeed completed!");
  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
