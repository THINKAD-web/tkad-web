"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { NeonSection } from "@/components/landing/neon/neon-section";
import { NeonSectionHead } from "@/components/landing/neon/neon-section-head";
import { NETWORK_NEON_PANEL } from "@/components/media-network/network-neon-ui";
import { cn } from "@/lib/utils";

const FAQ_ITEMS = [
  {
    qKo: "지점을 직접 선택할 수 있나요?",
    qEn: "Can I choose specific sites?",
    aKo: "가능합니다. 견적 요청 시 희망 지역·유형(버스쉘터, 아파트 등)을 남겨주시면 가용 지점 목록과 함께 제안드립니다.",
    aEn: "Yes. Share preferred regions and types (bus shelter, apartment, etc.) in your quote request and we will propose available sites.",
  },
  {
    qKo: "계약 기간 변경이 가능한가요?",
    qEn: "Can I change the contract period?",
    aKo: "집행 전·중 일정 조정이 가능하며, 기간 연장 시 패키지 할인율이 적용될 수 있습니다.",
    aEn: "Schedule adjustments are possible before and during the campaign; extensions may qualify for package discounts.",
  },
  {
    qKo: "효과 측정은 어떻게 하나요?",
    qEn: "How is performance measured?",
    aKo: "노출 추정, 지역 커버리지, 유동인구 데이터를 기반으로 리포트를 제공합니다. 디지털 연동 시 노출 로그도 확인할 수 있습니다.",
    aEn: "We provide reports based on estimated impressions, regional coverage, and foot traffic. Digital integrations can include exposure logs.",
  },
  {
    qKo: "최소 집행 지점 수가 있나요?",
    qEn: "Is there a minimum number of sites?",
    aKo: "네트워크·매체별 최소 단위가 다릅니다. 계산기에서 1지점부터 시뮬레이션할 수 있으며, 실제 계약은 매체별 최소 수량이 적용됩니다.",
    aEn: "Minimums vary by network and media type. The calculator works from 1 site; actual contracts follow each network's minimum.",
  },
] as const;

type Props = { isKo: boolean };

export function NetworkFAQ({ isKo }: Props) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <NeonSection>
      <NeonSectionHead
        number="05"
        kicker="FAQ"
        title={
          <>
            {isKo ? "자주 묻는 " : "Frequently asked "}
            <span className="tkad-home-accent-text">
              {isKo ? "질문" : "questions"}
            </span>
          </>
        }
        meta={
          isKo
            ? "네트워크 집행 전 궁금한 점"
            : "Common questions before launching"
        }
      />

      <div className={cn(NETWORK_NEON_PANEL, "mt-6 divide-y divide-gray-200 p-0 dark:divide-white/10")}>
        {FAQ_ITEMS.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={i}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-bold text-gray-900 transition hover:bg-gray-50 dark:text-white dark:hover:bg-white/5"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
              >
                <span>{isKo ? item.qKo : item.qEn}</span>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 shrink-0 text-gray-400 transition dark:text-white/45",
                    isOpen && "rotate-180",
                  )}
                />
              </button>
              {isOpen ? (
                <p className="px-5 pb-4 text-sm leading-relaxed text-gray-600 dark:text-white/55">
                  {isKo ? item.aKo : item.aEn}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </NeonSection>
  );
}
