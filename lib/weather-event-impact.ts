import type { EventSynergy } from "@/lib/data-source-types";
import type { MediaItem } from "@/lib/media-data";

/** 지역·랜드마크 기반 이벤트 시너지 (콘서트·스포츠·축제) */
export function buildEventSynergies(media: MediaItem): EventSynergy[] {
  const loc = `${media.location} ${media.region} ${media.nearbyLandmarks ?? ""}`.toLowerCase();
  const out: EventSynergy[] = [];

  if (/잠실|송파|jamsil/.test(loc)) {
    out.push({
      labelKo: "잠실 야구·콘서트 시즌 노출 +30%",
      labelEn: "Jamsil baseball/concert season +30% exposure",
      boostPct: 30,
    });
  }
  if (/올림픽|잠원|한강/.test(loc)) {
    out.push({
      labelKo: "한강·축제·야외 행사 시너지 +20%",
      labelEn: "Han River festival synergy +20%",
      boostPct: 20,
    });
  }
  if (/홍대|이태|성수/.test(loc)) {
    out.push({
      labelKo: "주말 공연·팝업 이벤트 시너지 +25%",
      labelEn: "Weekend concert/pop-up synergy +25%",
      boostPct: 25,
    });
  }
  if (/강남|코엑스|삼성/.test(loc)) {
    out.push({
      labelKo: "컨퍼런스·전시 시즌 B2B 노출 +15%",
      labelEn: "Conference/exhibition B2B boost +15%",
      boostPct: 15,
    });
  }
  if (/명동|종로|광화/.test(loc)) {
    out.push({
      labelKo: "관광·축제 시즌 외국인 노출 +22%",
      labelEn: "Tourism festival int'l traffic +22%",
      boostPct: 22,
    });
  }

  if (out.length === 0) {
    out.push({
      labelKo: "지역 행사·시즌 이벤트 시 추가 노출 가능",
      labelEn: "Seasonal local events may add exposure",
      boostPct: 10,
    });
  }

  return out.slice(0, 3);
}
