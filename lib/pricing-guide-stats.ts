import type { MediaItem } from "@/lib/media-data";
import { typeLabels } from "@/lib/media-data";
import {
  MEDIA_REGION_ZONES,
  regionZoneLabel,
  type MediaRegionZoneId,
} from "@/lib/media-regions";
import {
  mediaMonthlyPriceWon,
  resolveMediaZoneId,
} from "@/lib/media-price-transparency";

export type TypePriceRange = {
  type: string;
  labelKo: string;
  labelEn: string;
  minWon: number;
  maxWon: number;
  avgWon: number;
  count: number;
};

export type ZonePriceRow = {
  zoneId: string;
  labelKo: string;
  labelEn: string;
  avgWon: number;
  minWon: number;
  maxWon: number;
  count: number;
};

export type PricingGuideStats = {
  typeRanges: TypePriceRange[];
  zoneRows: ZonePriceRow[];
  totalActive: number;
  seasonNotesKo: string[];
  seasonNotesEn: string[];
  negotiationKo: string;
  negotiationEn: string;
};

export function buildPricingGuideStats(
  catalog: readonly MediaItem[],
): PricingGuideStats {
  const active = catalog.filter((m) => mediaMonthlyPriceWon(m) > 0);

  const byType = new Map<string, number[]>();
  for (const m of active) {
    const p = mediaMonthlyPriceWon(m);
    const arr = byType.get(m.type) ?? [];
    arr.push(p);
    byType.set(m.type, arr);
  }

  const typeRanges: TypePriceRange[] = [...byType.entries()].map(
    ([type, prices]) => {
      prices.sort((a, b) => a - b);
      const sum = prices.reduce((a, b) => a + b, 0);
      const labels = typeLabels[type];
      return {
        type,
        labelKo: labels?.ko ?? type,
        labelEn: labels?.en ?? type,
        minWon: prices[0] ?? 0,
        maxWon: prices[prices.length - 1] ?? 0,
        avgWon: Math.round(sum / prices.length),
        count: prices.length,
      };
    },
  );

  const byZone = new Map<string, number[]>();
  for (const m of active) {
    const z = resolveMediaZoneId(m) ?? "other";
    const p = mediaMonthlyPriceWon(m);
    const arr = byZone.get(z) ?? [];
    arr.push(p);
    byZone.set(z, arr);
  }

  const zoneRows: ZonePriceRow[] = MEDIA_REGION_ZONES.map((z) => {
    const prices = byZone.get(z.id) ?? [];
    prices.sort((a, b) => a - b);
    const sum = prices.reduce((a, b) => a + b, 0);
    return {
      zoneId: z.id,
      labelKo: z.labelKo,
      labelEn: z.labelEn,
      avgWon: prices.length ? Math.round(sum / prices.length) : 0,
      minWon: prices[0] ?? 0,
      maxWon: prices[prices.length - 1] ?? 0,
      count: prices.length,
    };
  }).filter((r) => r.count > 0);

  const otherPrices = byZone.get("other") ?? [];
  if (otherPrices.length > 0) {
    otherPrices.sort((a, b) => a - b);
    const sum = otherPrices.reduce((a, b) => a + b, 0);
    zoneRows.push({
      zoneId: "other",
      labelKo: "기타",
      labelEn: "Other",
      avgWon: Math.round(sum / otherPrices.length),
      minWon: otherPrices[0]!,
      maxWon: otherPrices[otherPrices.length - 1]!,
      count: otherPrices.length,
    });
  }

  return {
    typeRanges: typeRanges.sort((a, b) => b.count - a.count),
    zoneRows: zoneRows.sort((a, b) => b.avgWon - a.avgWon),
    totalActive: active.length,
    seasonNotesKo: [
      "1~2월·7~8월: 신년·휴가철 — 프리미엄 지역 5~15% 상승 구간이 많습니다.",
      "3~5월·9~11월: 런칭 시즌 — 수요가 높아 조기 예약을 권장합니다.",
      "12월: 연말 프로모션 — 일부 매체는 패키지 할인이 제공됩니다.",
    ],
    seasonNotesEn: [
      "Jan–Feb & Jul–Aug: peak premiums on prime districts (+5–15%).",
      "Mar–May & Sep–Nov: launch season — book early.",
      "December: year-end packages may include discounts.",
    ],
    negotiationKo:
      "표시 단가는 월 기준 참고가입니다. 집행 기간·슬롯·제작비에 따라 10~25% 협상 여지가 있는 경우가 많으며, THINKAD에서 가격 제안을 매체사에 익명 전달할 수 있습니다.",
    negotiationEn:
      "Listed rates are monthly references. Depending on flight length and production, 10–25% negotiation is common. You can submit an anonymous offer via THINKAD.",
  };
}

export function seoZoneKeywords(): { ko: string[]; en: string[] } {
  const ko = MEDIA_REGION_ZONES.flatMap((z) => [
    `${z.labelKo} 전광판 광고비`,
    `${z.labelKo} 옥외광고 단가`,
  ]);
  return {
    ko: [...ko, "옥외광고 가격", "OOH 광고비", "디지털 사이니지 가격"],
    en: ["OOH advertising cost Korea", "billboard price Seoul"],
  };
}
