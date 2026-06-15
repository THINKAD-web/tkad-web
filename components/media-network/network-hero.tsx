import { Network } from "lucide-react";
import { MediaKeywordLandingHero } from "@/components/media-keyword-landing-hero";

type Props = {
  isKo: boolean;
  totalLocations: number;
  networkCount: number;
};

export function NetworkHero({
  isKo,
  totalLocations,
  networkCount,
}: Props) {
  const stats =
    totalLocations > 0
      ? isKo
        ? `전국 ${totalLocations.toLocaleString("ko-KR")}개 지점 · ${networkCount}개 네트워크 운영`
        : `${totalLocations.toLocaleString("en-US")} sites nationwide · ${networkCount} active networks`
      : "";

  const description = isKo
    ? `작은 비용으로 전국 눈길 사로잡기 — 버스쉘터, 아파트, 편의점 앞 등 다지점 패키지를 한 번에.${stats ? ` ${stats}` : ""}`
    : `Capture attention nationwide at scale — bus shelters, apartments, convenience fronts, and more.${stats ? ` ${stats}` : ""}`;

  return (
    <MediaKeywordLandingHero
      eyebrow={`// ${isKo ? "02 · DISCOVERY · NETWORK" : "02 · DISCOVERY · NETWORK"}`}
      title={
        isKo
          ? "네트워크 매체, 전국 어디든"
          : "Network media, nationwide reach"
      }
      description={description}
      icon={<Network className="h-7 w-7 text-cyan-400/90" aria-hidden />}
      showBeta={false}
      primaryCta={{
        href: "#calculator",
        label: isKo ? "가격 계산하기" : "Calculate price",
      }}
      secondaryCta={{
        href: "#map",
        label: isKo ? "지도에서 보기" : "View on map",
      }}
    />
  );
}
