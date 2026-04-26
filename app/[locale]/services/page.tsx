import { resolveLocaleParam } from "@/lib/resolve-locale";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  ArrowDown,
  Compass,
  PlaySquare,
  LineChart,
  Plus,
} from "lucide-react";
import { BtnBlock, SectionHead } from "@/components/brutalist";
import { ServicesFaq } from "@/components/brutalist/services-faq";

type Props = { params: Promise<{ locale: string }> };

export const revalidate = 3600;

export default async function ServicesPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const isKo = locale === "ko";

  return (
    <>
      <BreadcrumbBar isKo={isKo} />
      <Header isKo={isKo} />
      <CoreServices isKo={isKo} />
      <ProcessTimeline isKo={isKo} />
      <Deliverables isKo={isKo} />
      <WhyUs isKo={isKo} />
      <ServicesFaq isKo={isKo} />
      <FinalCta isKo={isKo} />
    </>
  );
}

function BreadcrumbBar({ isKo }: { isKo: boolean }) {
  return (
    <div className="border-b-2 border-bx-black bg-bx-white">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-3 sm:px-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em]">
          <Link
            href="/"
            className="text-bx-gray-dim transition-colors hover:text-bx-accent"
          >
            Home
          </Link>
          <span className="mx-2 text-bx-gray-dim">/</span>
          <span className="text-bx-black">Services</span>
        </p>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-bx-gray-dim">
          [01 / 04]
        </p>
        {/* sr-only for isKo to silence unused */}
        <span className="sr-only">{isKo ? "ko" : "en"}</span>
      </div>
    </div>
  );
}

function Header({ isKo }: { isKo: boolean }) {
  const metas = [
    { label: "Page", value: "Services Overview" },
    {
      label: "Service Type",
      value: "OOH Planning / Media Operations / Data Analytics",
    },
    {
      label: "Delivery",
      value: "End-to-end / One-stop",
    },
    {
      label: "Lead Time",
      value: "24h Response / 2-4wk Launch",
    },
  ];
  return (
    <section className="border-b-2 border-bx-black bg-bx-white">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 lg:grid-cols-12">
        <aside className="border-bx-black bg-bx-off px-6 py-10 sm:px-8 sm:py-12 lg:col-span-4 lg:border-r-2 lg:px-10 lg:py-16">
          <div className="space-y-8">
            {metas.map((m) => (
              <div key={m.label}>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
                  {m.label}
                </p>
                <p className="mt-2 font-mono text-[12px] leading-snug text-bx-black">
                  {m.value}
                </p>
              </div>
            ))}
          </div>
        </aside>

        <div className="px-6 py-12 sm:px-10 sm:py-16 lg:col-span-8 lg:px-12 lg:py-20">
          <span className="inline-block bg-bx-accent px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-white">
            [ Services / 서비스 ]
          </span>
          <h1 className="mt-8 font-extrabold leading-[0.96] tracking-[-0.02em] text-bx-black [font-size:clamp(2.5rem,6vw,5.5rem)]">
            {isKo ? (
              <>
                데이터로 <span className="bx-accent">[설계]</span>하고,
                <br />
                현장에서 <span className="bx-invert">완성</span>한다.
              </>
            ) : (
              <>
                <span className="bx-accent">[Designed]</span> by data,
                <br />
                <span className="bx-invert">delivered</span> on site.
              </>
            )}
          </h1>
          <p className="mt-8 max-w-2xl text-base leading-relaxed text-bx-gray-dim sm:text-lg">
            {isKo
              ? "OOH 매체 기획부터 운영·데이터 분석까지 — 싱커드는 캠페인의 모든 단계를 직접 책임집니다. 검증된 매체, 투명한 데이터, 검증된 ROI."
              : "From media planning through operations to data analytics — THINKAD owns every step of your campaign. Verified media, transparent data, measurable ROI."}
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <BtnBlock
              href="/contact"
              variant="primary"
              className="!w-full sm:!w-auto"
            >
              {isKo ? "견적 요청" : "Request quote"}
            </BtnBlock>
            <BtnBlock
              href="/media"
              variant="secondary"
              icon={false}
              className="!w-full justify-between sm:!w-auto"
            >
              <span>{isKo ? "매체 보기" : "Browse media"}</span>
              <ArrowDown className="h-4 w-4" aria-hidden />
            </BtnBlock>
          </div>
        </div>
      </div>
    </section>
  );
}

function CoreServices({ isKo }: { isKo: boolean }) {
  const services = [
    {
      no: "01",
      Icon: Compass,
      titleKo: "매체 기획",
      titleEn: "Media Planning",
      descKo:
        "타깃·예산·집행 기간을 입력하면 데이터 기반으로 최적의 매체 믹스를 설계합니다.",
      descEn:
        "We design the optimal media mix from your target, budget, and timeline using compounded data.",
      itemsKo: ["타깃 분석", "상권 데이터 매핑", "매체 믹스 설계", "예산 시뮬레이션"],
      itemsEn: ["Target analysis", "Market data mapping", "Media mix design", "Budget simulation"],
    },
    {
      no: "02",
      Icon: PlaySquare,
      titleKo: "매체 운영",
      titleEn: "Media Operations",
      descKo:
        "매체 선정·계약·설치·송출·모니터링까지 모든 운영 단계를 한 팀이 책임집니다.",
      descEn:
        "Selection, contract, install, broadcast, and monitoring — owned end-to-end by one team.",
      itemsKo: ["선정·계약", "크리에이티브 검수", "설치·송출", "실시간 모니터링"],
      itemsEn: ["Selection · contract", "Creative QA", "Install · broadcast", "Real-time monitoring"],
    },
    {
      no: "03",
      Icon: LineChart,
      titleKo: "데이터 분석",
      titleEn: "Data Analytics",
      descKo:
        "주간·월간 리포트 + 유동인구 분석 + ROI 측정 + AI 플래너로 다음 캠페인을 설계합니다.",
      descEn:
        "Weekly · monthly reports, footfall analysis, ROI measurement, and AI-assisted planning for the next round.",
      itemsKo: ["주간·월간 리포트", "유동인구 분석", "ROI 측정", "AI 플래너"],
      itemsEn: ["Weekly · monthly reports", "Footfall analysis", "ROI measurement", "AI Planner"],
    },
  ];

  return (
    <section className="border-b-2 border-bx-black bg-bx-white">
      <SectionHead
        number="01"
        category="Core"
        title={
          isKo ? (
            <>
              3가지 <span className="bx-accent">[핵심]</span> 서비스.
            </>
          ) : (
            <>
              Three <span className="bx-accent">[core]</span> services.
            </>
          )
        }
        meta={
          isKo ? "Planning · Operations\nAnalytics" : "Planning · Operations\nAnalytics"
        }
      />
      <div className="grid grid-cols-1 lg:grid-cols-3">
        {services.map((s, i) => {
          const Icon = s.Icon;
          return (
            <article
              key={s.no}
              className={[
                "group relative flex flex-col bg-bx-white p-8 transition-colors duration-150 hover:bg-bx-off sm:p-10 lg:min-h-[480px]",
                "border-bx-black",
                i > 0 ? "border-t-2 lg:border-l-2 lg:border-t-0" : "",
              ].join(" ")}
            >
              <span className="inline-flex h-20 w-20 items-center justify-center border-2 border-bx-black bg-bx-white text-bx-black transition-colors duration-150 group-hover:border-bx-accent group-hover:bg-bx-accent group-hover:text-bx-white">
                <Icon className="h-9 w-9" strokeWidth={1.6} />
              </span>
              <p className="mt-8 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
                / Service {s.no}
              </p>
              <h3 className="mt-3 font-extrabold leading-[0.96] tracking-[-0.02em] text-bx-black [font-size:clamp(1.75rem,2.5vw,2.25rem)]">
                {isKo ? s.titleKo : s.titleEn}
              </h3>
              <p className="mt-5 text-sm leading-relaxed text-bx-gray-dim sm:text-base">
                {isKo ? s.descKo : s.descEn}
              </p>
              <ul className="mt-auto space-y-2.5 pt-8 border-t-2 border-bx-black">
                {(isKo ? s.itemsKo : s.itemsEn).map((it) => (
                  <li key={it} className="flex items-baseline gap-2 font-mono text-[12px] tracking-tight text-bx-black">
                    <Plus className="h-3 w-3 shrink-0 text-bx-accent" aria-hidden strokeWidth={3} />
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
 * 4. PROCESS TIMELINE — 5단계 가로 행
 *   80px | 1fr | 1fr 그리드, hover 시 #f5f5f5 배경 + 번호 박스 주황
 * ──────────────────────────────────────────────────────────────── */
function ProcessTimeline({ isKo }: { isKo: boolean }) {
  const steps = [
    {
      no: "01",
      stepEn: "Briefing",
      titleKo: "브리핑 & 목표 설정",
      titleEn: "Briefing & goal-setting",
      descKo: "캠페인 목적·타깃·예산을 함께 정의하며 KPI 까지 합의합니다.",
      descEn: "We align on campaign goal, target, budget, and KPIs together.",
    },
    {
      no: "02",
      stepEn: "Strategy",
      titleKo: "전략 & 미디어플랜",
      titleEn: "Strategy & media plan",
      descKo: "검증된 매체 데이터와 상권 분석으로 최적의 매체 믹스를 제안합니다.",
      descEn: "Verified media data + market analysis → optimal media mix proposal.",
    },
    {
      no: "03",
      stepEn: "Contract",
      titleKo: "매체 확정 & 계약",
      titleEn: "Media lock-in & contract",
      descKo: "선정된 매체와의 직접 계약·일정 확정·필요 시 우선권 협상까지.",
      descEn: "Direct contract, schedule lock-in, and priority negotiation if needed.",
    },
    {
      no: "04",
      stepEn: "Production",
      titleKo: "제작 · 설치 · 송출",
      titleEn: "Produce · install · broadcast",
      descKo: "크리에이티브 검수·설치 인증·송출 시작까지 한 팀이 책임집니다.",
      descEn: "One team handles creative QA, install verification, and broadcast.",
    },
    {
      no: "05",
      stepEn: "Reporting",
      titleKo: "모니터링 & 리포트",
      titleEn: "Monitoring & reports",
      descKo: "실시간 모니터링 + 주간·월간 리포트 + 다음 캠페인 제안까지.",
      descEn: "Real-time monitoring + weekly · monthly reports + next-step proposal.",
    },
  ];

  return (
    <section className="border-b-2 border-bx-black bg-bx-white">
      <SectionHead
        number="02"
        category="Workflow"
        title={
          isKo ? (
            <>
              진행 <span className="bx-accent">[5단계.]</span>
            </>
          ) : (
            <>
              <span className="bx-accent">[5 steps]</span> to launch.
            </>
          )
        }
        meta={isKo ? "Briefing → Reports" : "Briefing → Reports"}
      />
      <ul className="divide-y-2 divide-bx-black border-t-0">
        {steps.map((s) => (
          <li
            key={s.no}
            className="group grid grid-cols-[64px_1fr] items-stretch transition-colors duration-150 hover:bg-bx-off lg:grid-cols-[80px_1fr_1.5fr]"
          >
            {/* 번호 박스 */}
            <div className="flex items-center justify-center border-r-2 border-bx-black bg-bx-black text-bx-white transition-colors duration-150 group-hover:bg-bx-accent">
              <span className="font-mono text-2xl font-extrabold tracking-tight sm:text-3xl">
                {s.no}
              </span>
            </div>
            {/* 단계명 */}
            <div className="flex flex-col justify-center border-bx-black px-5 py-6 sm:px-8 lg:border-r-2 lg:py-8">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
                Step {s.no} / {s.stepEn}
              </p>
              <p className="mt-2 text-lg font-bold leading-tight tracking-tight text-bx-black sm:text-xl">
                {isKo ? s.titleKo : s.titleEn}
              </p>
            </div>
            {/* 설명 */}
            <div className="col-span-2 border-t-2 border-bx-black px-5 py-5 sm:px-8 lg:col-span-1 lg:border-t-0 lg:px-10 lg:py-8">
              <p className="text-sm leading-relaxed text-bx-gray-dim sm:text-base">
                {isKo ? s.descKo : s.descEn}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
 * 5. DELIVERABLES — 4x2 그리드 (8개)
 * ──────────────────────────────────────────────────────────────── */
function Deliverables({ isKo }: { isKo: boolean }) {
  const items = [
    {
      no: "01",
      titleKo: "현장 검증 리포트",
      titleEn: "On-site verification report",
      descKo: "방문 사진·시인성·환경·유동인구 측정 결과를 문서화.",
      descEn: "Site photos, visibility, environment, and footfall — documented.",
    },
    {
      no: "02",
      titleKo: "미디어 플랜",
      titleEn: "Media plan",
      descKo: "예산 분배·매체 조합·기간 시뮬레이션을 한 장에.",
      descEn: "Budget split · media mix · period simulation in one sheet.",
    },
    {
      no: "03",
      titleKo: "유동인구 분석",
      titleEn: "Footfall analysis",
      descKo: "시간대·요일·월별 패턴을 시각화한 분석 자료.",
      descEn: "Hourly · weekly · monthly patterns visualised.",
    },
    {
      no: "04",
      titleKo: "크리에이티브 가이드",
      titleEn: "Creative guideline",
      descKo: "각 매체 사양·해상도·노출 환경에 맞춘 가이드라인 문서.",
      descEn: "Guideline doc tailored to each media's spec and exposure.",
    },
    {
      no: "05",
      titleKo: "설치 인증 문서",
      titleEn: "Install certification",
      descKo: "설치 완료 사진·시간·체크리스트를 기록한 인증서.",
      descEn: "Photo, timestamp, checklist — install certified document.",
    },
    {
      no: "06",
      titleKo: "중간 모니터링",
      titleEn: "Mid-flight monitoring",
      descKo: "주간 단위 송출 상태·이슈·노출 데이터 리포트.",
      descEn: "Weekly broadcast status · issues · exposure data report.",
    },
    {
      no: "07",
      titleKo: "최종 성과 리포트",
      titleEn: "Final performance report",
      descKo: "노출·도달·CPM·ROI 최종 정리 리포트.",
      descEn: "Final report on impressions, reach, CPM, and ROI.",
    },
    {
      no: "08",
      titleKo: "다음 캠페인 제안",
      titleEn: "Next-round proposal",
      descKo: "데이터 학습 결과로 다음 라운드 매체 큐레이션 제안.",
      descEn: "Curated proposal for the next round, based on learnings.",
    },
  ];

  return (
    <section className="border-b-2 border-bx-black bg-bx-white">
      <SectionHead
        number="03"
        category="Output"
        title={
          isKo ? (
            <>
              제공되는 <span className="bx-accent">[결과물.]</span>
            </>
          ) : (
            <>
              The <span className="bx-accent">[deliverables.]</span>
            </>
          )
        }
        meta={isKo ? "8 documents\ndelivered" : "8 documents\ndelivered"}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it, i) => (
          <article
            key={it.no}
            className={[
              "group flex flex-col bg-bx-white p-6 transition-colors duration-150 hover:bg-bx-black hover:text-bx-white sm:p-8",
              "border-bx-black",
              i > 0 ? "border-t-2 sm:border-t-0" : "",
              i % 2 === 1 ? "sm:border-l-2" : "",
              i >= 2 ? "sm:border-t-2 lg:border-t-0" : "",
              "lg:border-l-2",
              i % 4 === 0 ? "lg:border-l-0" : "",
              i >= 4 ? "lg:border-t-2" : "",
            ].join(" ")}
          >
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-accent">
              // {it.no}
            </p>
            <h3 className="mt-4 text-lg font-bold leading-tight tracking-tight sm:text-[22px]">
              {isKo ? it.titleKo : it.titleEn}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-bx-gray-dim transition-colors group-hover:text-bx-gray sm:text-[13.5px]">
              {isKo ? it.descKo : it.descEn}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
/* ────────────────────────────────────────────────────────────────
 * 6. WHY US — 2x2 그리드 (4가지 차별점)
 *   셀 hover 색감: 1·4 검정, 2·3 주황 (대비)
 * ──────────────────────────────────────────────────────────────── */
function WhyUs({ isKo }: { isKo: boolean }) {
  const items: {
    no: string;
    titleKo: string;
    titleEn: string;
    descKo: string;
    descEn: string;
    statKo: string;
    statEn: string;
    statValue: string;
    hover: "black" | "accent";
  }[] = [
    {
      no: "01",
      titleKo: "검증된 매체 네트워크",
      titleEn: "Verified network",
      descKo:
        "모든 매체를 담당자가 직접 방문해 시인성·환경·유동인구를 확인. 검증을 통과한 매체만 등록됩니다.",
      descEn:
        "Every media is personally verified for visibility, environment, and traffic. Only verified ones are listed.",
      statKo: "Verified Network",
      statEn: "Verified Network",
      statValue: "500+",
      hover: "black",
    },
    {
      no: "02",
      titleKo: "투명한 운영 데이터",
      titleEn: "Transparent ops",
      descKo:
        "송출 인증·설치 사진·실시간 모니터링까지 — 광고주가 모든 단계를 직접 확인할 수 있습니다.",
      descEn:
        "Broadcast logs, install photos, live monitoring — every step is visible to the advertiser.",
      statKo: "Transparency",
      statEn: "Transparency",
      statValue: "5/5",
      hover: "accent",
    },
    {
      no: "03",
      titleKo: "1년+ 축적된 효과 데이터",
      titleEn: "1+ year of data",
      descKo:
        "단기 캠페인이 아닌 1년 이상 누적된 매체별 효과 데이터로 ROI 검증된 매체만 추천합니다.",
      descEn:
        "Recommendations come from 1+ years of compounded performance — ROI-verified media only.",
      statKo: "Data-Driven",
      statEn: "Data-Driven",
      statValue: "1Y+",
      hover: "accent",
    },
    {
      no: "04",
      titleKo: "AI 플래너 결합",
      titleEn: "AI-augmented planning",
      descKo:
        "AI 미디어 믹스 추천 + 효과 시뮬레이션으로 캠페인 설계 시간을 절반 이하로 단축.",
      descEn:
        "AI media-mix recommendation + effect simulation cut campaign design time in half.",
      statKo: "AI-Augmented",
      statEn: "AI-Augmented",
      statValue: "AI",
      hover: "black",
    },
  ];

  return (
    <section className="border-b-2 border-bx-black bg-bx-white">
      <SectionHead
        number="04"
        category="Differentiation"
        title={
          isKo ? (
            <>
              싱커드만의 <span className="bx-accent">[4가지]</span> 차별점.
            </>
          ) : (
            <>
              The <span className="bx-accent">[four]</span> differentiators.
            </>
          )
        }
        meta={isKo ? "Why we win\nlong-term" : "Why we win\nlong-term"}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2">
        {items.map((it, i) => {
          const hoverCls =
            it.hover === "accent"
              ? "hover:bg-bx-accent hover:text-bx-white"
              : "hover:bg-bx-black hover:text-bx-white";
          return (
            <article
              key={it.no}
              className={[
                "group flex flex-col bg-bx-white p-8 transition-colors duration-150 sm:p-10 lg:p-12",
                hoverCls,
                "border-bx-black",
                i > 0 ? "border-t-2 lg:border-t-0" : "",
                i % 2 === 1 ? "lg:border-l-2" : "",
                i >= 2 ? "lg:border-t-2" : "",
              ].join(" ")}
            >
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim transition-colors group-hover:text-bx-gray">
                [{it.no}] / Why
              </p>
              <h3 className="mt-6 font-extrabold leading-[0.96] tracking-[-0.02em] [font-size:clamp(1.75rem,3vw,2.5rem)]">
                {isKo ? it.titleKo : it.titleEn}
              </h3>
              <p className="mt-5 max-w-md text-sm leading-relaxed text-bx-gray-dim transition-colors group-hover:text-bx-gray sm:text-base">
                {isKo ? it.descKo : it.descEn}
              </p>
              <div className="mt-auto flex items-baseline justify-between border-t-2 border-bx-black pt-6 transition-colors group-hover:border-bx-white">
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim transition-colors group-hover:text-bx-gray">
                  / {isKo ? it.statKo : it.statEn}
                </span>
                <span className="font-extrabold tracking-tight text-bx-accent [font-size:clamp(1.75rem,3vw,2.5rem)]">
                  {it.statValue}
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
 * 8. FINAL CTA — 검정 2:1
 * ──────────────────────────────────────────────────────────────── */
function FinalCta({ isKo }: { isKo: boolean }) {
  return (
    <section className="border-b-2 border-bx-black bg-bx-black text-bx-white">
      <div className="grid grid-cols-1 lg:grid-cols-3">
        <div className="border-bx-white px-6 py-14 sm:px-10 sm:py-20 lg:col-span-2 lg:border-r-2 lg:px-12 lg:py-24">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-gray">
            <span className="text-bx-accent">[ → ]</span>
            <span className="ml-2"> / Get Quote</span>
          </p>
          <h2 className="mt-8 font-extrabold leading-[0.92] tracking-[-0.03em] [font-size:clamp(2.25rem,5.5vw,5rem)]">
            {isKo ? (
              <>
                <span className="block">지금 견적을</span>
                <span className="block">
                  <span className="bx-accent">[요청하세요.]</span>
                </span>
              </>
            ) : (
              <>
                <span className="block">Request a</span>
                <span className="block">
                  <span className="bx-accent">[quote now.]</span>
                </span>
              </>
            )}
          </h2>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-bx-gray sm:text-lg">
            {isKo
              ? "예산·목표·타깃을 알려주시면 24시간 내 전문 컨설턴트가 큐레이션 추천을 보내드립니다. 첫 미팅·시뮬레이션은 모두 무료입니다."
              : "Tell us your budget, goal, and target — our consultant returns a curated proposal within 24 hours. First meeting and simulation are free."}
          </p>
        </div>
        <aside className="flex flex-col gap-6 border-t-2 border-bx-white px-6 py-12 sm:px-10 lg:border-t-0 lg:px-10 lg:py-24">
          <div>
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-gray">
              / Response Time
            </p>
            <p className="mt-3 text-5xl font-extrabold leading-none tracking-tight text-bx-accent">
              24h
            </p>
            <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-bx-gray">
              // {isKo ? "최대 회신 시간" : "Max reply window"}
            </p>
          </div>
          <div className="flex flex-col">
            <BtnBlock
              href="/contact"
              variant="accent"
              stack
              className="w-full justify-between"
            >
              {isKo ? "견적 요청" : "Request quote"}
            </BtnBlock>
            <BtnBlock
              href="/media"
              variant="secondary"
              icon={false}
              className="w-full justify-between border-bx-white bg-bx-black text-bx-white hover:bg-bx-white hover:text-bx-black"
            >
              {isKo ? "📎 매체 카탈로그" : "📎 Media catalog"}
            </BtnBlock>
          </div>
        </aside>
      </div>
    </section>
  );
}
