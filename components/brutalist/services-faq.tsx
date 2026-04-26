"use client";

/**
 * ServicesFaq — 아코디언 FAQ.
 * 각 행 80px | 1fr | 80px 그리드.
 * 첫 항목 기본 열림 상태. + 토글 (열림 시 45deg 회전 → ✕).
 * 답변 영역 #f5f5f5 배경, max-height transition 으로 부드럽게.
 */
import { useState } from "react";
import { SectionHead } from "@/components/brutalist";

type Item = {
  no: string;
  qKo: string;
  qEn: string;
  aKo: string;
  aEn: string;
};

const ITEMS: Item[] = [
  {
    no: "01",
    qKo: "견적은 어떻게 받을 수 있나요?",
    qEn: "How do I get a quote?",
    aKo: "캠페인 목적·예산·집행 기간을 알려주시면 24시간 내 전문 컨설턴트가 큐레이션 추천과 함께 견적을 보내드립니다. 매체 상세 페이지에서 [즉시 견적 요청] 또는 우상단 [Contact] 버튼으로 신청 가능합니다.",
    aEn: "Tell us your goal, budget, and timeline — our consultant returns a curated proposal and quote within 24 hours. You can request a quote from the [Get a quote] button on any media detail page or via the [Contact] button in the header.",
  },
  {
    no: "02",
    qKo: "최소 집행 기간·예산은 얼마인가요?",
    qEn: "What's the minimum period and budget?",
    aKo: "디지털 매체는 2주, 고정형은 1개월 이상부터 집행 가능합니다. 예산은 매체 1개 단독부터 가능하며 평균 ₩1,000만~ 부터 시작합니다. 정확한 견적은 매체 조합·기간에 따라 달라집니다.",
    aEn: "Digital media start at 2 weeks; static media at 1 month. Budget can start from a single media (avg ₩10M+). Exact quotes depend on the mix and duration.",
  },
  {
    no: "03",
    qKo: "DOOH(디지털 OOH) 집행이 가능한가요?",
    qEn: "Do you handle DOOH (digital OOH)?",
    aKo: "네, DOOH 가 핵심 서비스 중 하나입니다. 코엑스 K-POP 스퀘어, 강남대로 미디어폴, 성수역 디지털 등 200+ 디지털 매체를 운영 중이며, 영상 크리에이티브·스케줄·실시간 송출 모니터링까지 원스톱으로 책임집니다.",
    aEn: "Yes — DOOH is core to our service. We run 200+ digital media (COEX K-POP Square, Gangnam Media Pole, Seongsu Digital, etc.) including creative, scheduling, and real-time broadcast monitoring under one roof.",
  },
  {
    no: "04",
    qKo: "캠페인 모니터링은 어떻게 하나요?",
    qEn: "How is monitoring handled during the campaign?",
    aKo: "주간 단위로 송출 상태·이슈·노출 데이터를 자동 리포트로 제공합니다. 디지털 매체는 실시간 송출 인증 사진/로그를, 고정형은 격주 현장 점검 사진을 함께 전달합니다. 종료 후 최종 성과 리포트와 함께 다음 라운드 제안서도 작성해 드립니다.",
    aEn: "We auto-deliver weekly reports on broadcast status, issues, and exposure. Digital media include real-time broadcast logs/photos; static media get bi-weekly site-check photos. After the campaign, we send the final performance report and a proposal for the next round.",
  },
];

export function ServicesFaq({ isKo }: { isKo: boolean }) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section className="border-b-2 border-bx-black bg-bx-white">
      <SectionHead
        number="05"
        category="FAQ"
        title={
          isKo ? (
            <>
              자주 묻는 <span className="bx-accent">[질문.]</span>
            </>
          ) : (
            <>
              <span className="bx-accent">[Frequent]</span> questions.
            </>
          )
        }
        meta={isKo ? "Most asked\n(top 4)" : "Most asked\n(top 4)"}
      />
      <ul className="divide-y-2 divide-bx-black border-t-0">
        {ITEMS.map((it, i) => {
          const isOpen = openIdx === i;
          return (
            <li key={it.no}>
              <button
                type="button"
                onClick={() => setOpenIdx(isOpen ? null : i)}
                aria-expanded={isOpen}
                className={[
                  "grid w-full grid-cols-[64px_1fr_56px] items-stretch text-left transition-colors duration-150 lg:grid-cols-[80px_1fr_80px]",
                  isOpen
                    ? "bg-bx-black text-bx-white"
                    : "bg-bx-white text-bx-black hover:bg-bx-off",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex items-center justify-center border-r-2 font-mono text-base font-bold tracking-tight sm:text-lg",
                    isOpen
                      ? "border-bx-white text-bx-accent"
                      : "border-bx-black text-bx-gray-dim",
                  ].join(" ")}
                >
                  [{it.no}]
                </span>
                <span className="flex items-center px-5 py-6 text-base font-semibold leading-snug sm:px-8 sm:text-[22px]">
                  {isKo ? it.qKo : it.qEn}
                </span>
                <span
                  className={[
                    "flex items-center justify-center border-l-2",
                    isOpen ? "border-bx-white" : "border-bx-black",
                  ].join(" ")}
                >
                  <span
                    aria-hidden
                    className={[
                      "block text-2xl font-bold transition-transform duration-200 ease-out sm:text-3xl",
                      isOpen ? "rotate-45" : "rotate-0",
                    ].join(" ")}
                    style={{
                      color: isOpen ? "var(--color-bx-accent)" : "var(--color-bx-black)",
                    }}
                  >
                    +
                  </span>
                </span>
              </button>

              {/* 답변 — max-height transition 부드러운 펼침 */}
              <div
                className={[
                  "grid overflow-hidden bg-bx-off transition-[grid-template-rows] duration-300 ease-out",
                  isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                ].join(" ")}
              >
                <div className="min-h-0">
                  <div className="border-t-2 border-bx-black px-6 py-8 sm:px-10 sm:py-10">
                    <p className="max-w-3xl text-sm leading-[1.7] text-bx-black sm:text-base">
                      {isKo ? it.aKo : it.aEn}
                    </p>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
