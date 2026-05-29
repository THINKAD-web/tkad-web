import { QuotePremium } from "@/components/quote/quote-premium";
import type { QuotePremiumProps } from "@/components/quote/quote-premium";

/** QA / 스크린샷용 — 샘플 데이터로 프리미엄 제안서 + 공식 견적서 렌더 */
const SAMPLE: QuotePremiumProps = {
  customerName: "샘플 브랜드",
  contactName: "홍길동",
  brandName: "샘플 브랜드",
  version: "v1.0",
  dateLabel: "2026.05.26",
  durationLabel: "2개월",
  periodKey: "1month",
  periodMonths: 2,
  region: "서울 강남 · 명동 · 홍대",
  goal: "브랜드 인지도 · OOH 집행",
  quoteNumber: "QT-20260526-00042",
  subtotalWon: 48_000_000,
  vatWon: 4_800_000,
  grandTotalWon: 52_800_000,
  contactPhone: "02-1234-5678",
  contactEmail: "hello@thinkad.co.kr",
  issuedAt: new Date("2026-05-26"),
  mediaItems: [
    {
      id: "sample-1",
      name: "명동 K파이낸스빌딩 외벽",
      location: "서울 중구",
      thumbUrl:
        "https://res.cloudinary.com/demo/image/upload/sample.jpg",
      lineTotalWon: 18_000_000,
      unitPriceWon: 9_000_000,
      dailyFootTraffic: 120_000,
      size: "20m × 12m",
      mediaTypeLabel: "빌보드",
      executionPeriodLabel: "2개월",
    },
    {
      id: "sample-2",
      name: "강남역 스크린도어",
      location: "서울 강남구",
      thumbUrl: null,
      lineTotalWon: 15_000_000,
      unitPriceWon: 7_500_000,
      dailyFootTraffic: 95_000,
      size: "스크린도어",
      mediaTypeLabel: "교통",
      executionPeriodLabel: "2개월",
    },
    {
      id: "sample-3",
      name: "홍대입구역 LED",
      location: "서울 마포구",
      thumbUrl: null,
      lineTotalWon: 15_000_000,
      unitPriceWon: 7_500_000,
      dailyFootTraffic: 88_000,
      size: "LED 패널",
      mediaTypeLabel: "디지털",
      executionPeriodLabel: "2개월",
    },
  ],
};

export const metadata = {
  title: "Premium quote preview",
  robots: { index: false, follow: false },
};

export default function QuotePremiumPreviewPage() {
  return (
    <main className="flex min-h-screen items-start justify-center bg-[#1a1a24] px-4 py-10">
      <QuotePremium {...SAMPLE} />
    </main>
  );
}
