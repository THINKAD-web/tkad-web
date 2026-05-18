"use client";

import { useLocale } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { BtnBlock } from "@/components/brutalist";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import {
  CategoryExploreHero,
  CategoryHeroCtaRow,
  categoryHeroCtaPrimaryClass,
  categoryHeroCtaSecondaryClass,
} from "@/components/category-explore-hero";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CheckCircle,
  Lock,
  MapPin,
  Monitor,
  Send,
  TrendingUp,
  Zap,
} from "lucide-react";
import Spinner from "@/components/spinner";
import Modal from "@/components/ui/modal";
import { useToast } from "@/components/toast-provider";

type RegionKey = "seoul" | "busan" | "jeju" | "national";

type MediaItem = {
  nameKo: string;
  nameEn: string;
  typeKey: "digital" | "subway" | "billboard" | "bus";
  exposureK: number;
  roi: number;
};

const MEDIA_BY_REGION: Record<RegionKey, MediaItem[]> = {
  seoul: [
    { nameKo: "강남역 미디어폴", nameEn: "Gangnam Station Media Pole", typeKey: "digital", exposureK: 320, roi: 4.2 },
    { nameKo: "코엑스 대형 LED", nameEn: "COEX Large LED", typeKey: "digital", exposureK: 280, roi: 3.8 },
    { nameKo: "홍대입구역 스크린도어", nameEn: "Hongdae Screen Door", typeKey: "subway", exposureK: 210, roi: 3.5 },
    { nameKo: "명동 전광판", nameEn: "Myeongdong Digital Board", typeKey: "digital", exposureK: 350, roi: 4.0 },
  ],
  busan: [
    { nameKo: "서면역 디지털", nameEn: "Seomyeon Digital", typeKey: "digital", exposureK: 150, roi: 3.2 },
    { nameKo: "해운대 빌보드", nameEn: "Haeundae Billboard", typeKey: "billboard", exposureK: 180, roi: 3.5 },
    { nameKo: "부산역 광고", nameEn: "Busan Station Ad", typeKey: "subway", exposureK: 120, roi: 2.8 },
  ],
  jeju: [
    { nameKo: "제주공항 디지털", nameEn: "Jeju Airport Digital", typeKey: "digital", exposureK: 200, roi: 3.6 },
    { nameKo: "중문관광단지 빌보드", nameEn: "Jungmun Resort Billboard", typeKey: "billboard", exposureK: 80, roi: 2.5 },
  ],
  national: [
    { nameKo: "전국 고속도로", nameEn: "National Highway", typeKey: "billboard", exposureK: 500, roi: 3.0 },
    { nameKo: "전국 시내버스", nameEn: "National City Bus", typeKey: "bus", exposureK: 800, roi: 2.2 },
  ],
};

const TYPE_LABELS: Record<MediaItem["typeKey"], { ko: string; en: string }> = {
  digital: { ko: "디지털", en: "Digital" },
  subway: { ko: "지하철", en: "Subway" },
  billboard: { ko: "빌보드", en: "Billboard" },
  bus: { ko: "버스", en: "Bus" },
};

const REGION_BAR_VALUES: { key: RegionKey; valueK: number }[] = [
  { key: "seoul", valueK: 1160 },
  { key: "busan", valueK: 450 },
  { key: "jeju", valueK: 280 },
  { key: "national", valueK: 1300 },
];

const TYPE_DISTRIBUTION = [
  { typeKey: "digital" as const, pct: 38, color: "bg-accent" },
  { typeKey: "billboard" as const, pct: 28, color: "bg-hero-void" },
  { typeKey: "subway" as const, pct: 22, color: "bg-muted-foreground" },
  { typeKey: "bus" as const, pct: 12, color: "bg-muted" },
];

function conicGradientForDonut(): string {
  let acc = 0;
  const stops: string[] = [];
  // bx-accent (#FF6600), bx-black (#000), gray-dim (#6b6b6b), bx-off (#f5f5f0)
  const colors = ["#FF6600", "#000000", "#6b6b6b", "#f5f5f0"];
  TYPE_DISTRIBUTION.forEach((seg, i) => {
    const start = acc;
    acc += seg.pct;
    stops.push(`${colors[i]} ${start}% ${acc}%`);
  });
  return `conic-gradient(${stops.join(", ")})`;
}

const inputCls =
  "tkad-auth-input h-11 w-full rounded-[18px] border border-white/12 bg-black/28 px-4 text-[15px] font-semibold text-white placeholder:text-white/55 shadow-sm outline-none ring-0 backdrop-blur focus:border-white/18 focus:bg-black/34";

export default function ToolsPage() {
  const locale = useLocale();
  const isKo = locale === "ko";
  const [region, setRegion] = useState<RegionKey>("seoul");
  const { toast } = useToast();
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [leadLoading, setLeadLoading] = useState(false);
  const [company, setCompany] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const maxBar = Math.max(...REGION_BAR_VALUES.map((r) => r.valueK));
  const barMaxPx = 200;

  const openModal = () => {
    setShowLeadModal(true);
    setLeadSubmitted(false);
    setCompany("");
    setName("");
    setEmail("");
    setPhone("");
  };

  const closeModal = () => {
    setShowLeadModal(false);
    setLeadSubmitted(false);
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeadLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setLeadSubmitted(true);
      toast("success", isKo ? "상담 요청이 접수되었습니다." : "Consultation request submitted.");
    } catch {
      toast("error", isKo ? "일시적 오류가 발생했습니다. 다시 시도해 주세요." : "An error occurred. Please try again.");
    } finally {
      setLeadLoading(false);
    }
  };

  const regionOptions: { value: RegionKey; labelKo: string; labelEn: string }[] = [
    { value: "seoul", labelKo: "서울", labelEn: "Seoul" },
    { value: "busan", labelKo: "부산", labelEn: "Busan" },
    { value: "jeju", labelKo: "제주", labelEn: "Jeju" },
    { value: "national", labelKo: "전국", labelEn: "National" },
  ];

  const items = MEDIA_BY_REGION[region];

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon tkad-media-page min-h-[calc(100vh-72px)]">
      <CategoryExploreHero
        code="// 18 · TOOLS"
        headlineBefore={isKo ? "미디어 " : "Media "}
        headlineGradient={isKo ? "플래닝 툴" : "planning tool"}
        subtitle={
          isKo
            ? "지역·매체 유형·노출 규모를 한 화면에서 비교하고, 캠페인에 맞는 추천 조합을 빠르게 탐색하세요. 전체 분석·예약 연동은 정식 버전에서 제공됩니다."
            : "Compare region, format, and reach in one view and explore recommended mixes for your campaign. Full analytics and booking connect in the production release."
        }
      >
        <div className="mx-auto flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-white/6 px-3 py-1 font-mono text-[10px] font-black uppercase tracking-[0.22em] text-white backdrop-blur">
            <Zap className="h-3.5 w-3.5" aria-hidden />
            PREVIEW
            <Lock className="h-3 w-3" aria-hidden />
          </span>
        </div>
        <CategoryHeroCtaRow className="mt-4">
          <button type="button" onClick={openModal} className={categoryHeroCtaPrimaryClass}>
            {isKo ? "전체 기능 이용하기" : "Use full features"}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
          <Link href="/media" className={categoryHeroCtaSecondaryClass}>
            <Monitor className="h-4 w-4" aria-hidden />
            {isKo ? "매체 카탈로그" : "Media catalog"}
            <ArrowRight className="h-4 w-4 text-white/75" aria-hidden />
          </Link>
        </CategoryHeroCtaRow>
      </CategoryExploreHero>

      <section className="border-t border-border/60 bg-card/0 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
                [ SIMULATION ]
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {isKo ? "추천 매체 시뮬레이션" : "Recommended media simulation"}
              </h2>
              <p className="mt-2 max-w-xl font-mono text-[12px] tracking-tight text-muted-foreground">
                {`// `}{isKo
                  ? "지역을 선택하면 해당 권역 기준 샘플 추천이 표시됩니다."
                  : "Pick a region to see sample recommendations for that area."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-accent" />
              <label htmlFor="tools-region" className="sr-only">
                {isKo ? "지역" : "Region"}
              </label>
              <select
                id="tools-region"
                value={region}
                onChange={(e) => setRegion(e.target.value as RegionKey)}
                className="h-12 min-w-[180px] rounded-full border border-white/12 bg-black/25 px-4 font-mono text-sm font-bold text-white shadow-sm backdrop-blur focus:border-white/18 focus:outline-none"
              >
                {regionOptions.map((r) => (
                  <option key={r.value} value={r.value}>
                    {isKo ? r.labelKo : r.labelEn}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-0 sm:grid-cols-2 xl:grid-cols-4">
            {items.map((item) => (
              <article
                key={`${region}-${item.nameKo}`}
                className="tkad-glass-surface group -mt-[2px] -ml-[2px] overflow-hidden rounded-[26px] transition-all hover:-translate-y-0.5 hover:bg-white/10"
              >
                <header className="relative border-b border-white/10 p-5">
                  <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.08] tkad-neon-grid" />
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg font-bold leading-snug tracking-tight text-foreground">
                      {isKo ? item.nameKo : item.nameEn}
                    </h3>
                    <div className="flex shrink-0 items-center gap-1 rounded-full border border-white/12 bg-white/8 px-2.5 py-1 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-white/85 backdrop-blur">
                      <BadgeCheck className="h-3 w-3" />
                      Verified
                    </div>
                  </div>
                  <span className="mt-3 inline-flex rounded-full border border-white/12 bg-white/8 px-3 py-1 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-white/85 backdrop-blur">
                    {TYPE_LABELS[item.typeKey][isKo ? "ko" : "en"]}
                  </span>
                </header>
                <div className="space-y-4 p-5">
                  <div className="grid grid-cols-2 gap-3 rounded-[22px] border border-white/12 bg-white/6 p-3 backdrop-blur">
                    <div>
                      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
                        [ {isKo ? "일 노출" : "DAILY"} ]
                      </p>
                      <p className="mt-1 font-mono text-lg font-bold tabular-nums text-foreground">
                        {item.exposureK}K
                        <span className="ml-1 text-[10px] font-bold tracking-tight text-muted-foreground">
                          {isKo ? "/일" : "/day"}
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
                        [ ROI ]
                      </p>
                      <p className="mt-1 flex items-center gap-1 font-mono text-lg font-bold tabular-nums text-foreground">
                        <TrendingUp className="h-4 w-4" />
                        {item.roi}x
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-hero-void py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center border-2 border-accent bg-accent text-accent-foreground">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
                [ DASHBOARD ]
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-hero-fg sm:text-3xl">
                {isKo ? "인사이트 대시보드 (샘플)" : "Insight dashboard (sample)"}
              </h2>
              <p className="mt-2 font-mono text-[12px] tracking-tight text-hero-fg/65">
                {`// `}{isKo ? "정식 툴에서는 실데이터와 필터가 연결됩니다." : "Production ties live data and filters here."}
              </p>
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-5">
            <article className="-ml-[2px] border-2 border-accent bg-hero-void lg:col-span-3">
              <header className="border-b-2 border-accent p-5">
                <h3 className="font-bold tracking-tight text-hero-fg">
                  {isKo ? "지역별 일일 노출수" : "Regional daily exposures"}
                </h3>
                <p className="mt-1 font-mono text-[11px] tracking-tight text-hero-fg/65">
                  {`// `}{isKo ? "추정 일간 임프레션 (천 단위)" : "Estimated daily impressions (thousands)"}
                </p>
              </header>
              <div className="p-5">
                <div className="flex h-56 items-end justify-between gap-3 border-b-2 border-accent pb-2 pt-4 sm:gap-6">
                  {REGION_BAR_VALUES.map((row) => {
                    const px = Math.max(28, Math.round((row.valueK / maxBar) * barMaxPx));
                    const label = regionOptions.find((o) => o.value === row.key);
                    return (
                      <div key={row.key} className="flex flex-1 flex-col items-center gap-3">
                        <div
                          className="w-full max-w-[4.5rem] border-2 border-accent bg-accent"
                          style={{ height: `${px}px` }}
                          title={`${row.valueK}K`}
                        />
                        <span className="text-center font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-hero-fg">
                          {isKo ? label?.labelKo : label?.labelEn}
                        </span>
                        <span className="font-mono text-sm font-bold tabular-nums text-accent">{row.valueK}K</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </article>

            <article className="-ml-[2px] border-2 border-accent bg-hero-void lg:col-span-2">
              <header className="border-b-2 border-accent p-5">
                <h3 className="font-bold tracking-tight text-hero-fg">
                  {isKo ? "매체 유형 비중" : "Format mix"}
                </h3>
                <p className="mt-1 font-mono text-[11px] tracking-tight text-hero-fg/65">
                  {`// `}{isKo ? "캠페인 샘플 분포" : "Sample campaign split"}
                </p>
              </header>
              <div className="flex flex-col items-center gap-6 p-5 sm:flex-row sm:justify-center">
                <div
                  className="relative h-44 w-44 shrink-0 border-2 border-accent p-1"
                  style={{ background: conicGradientForDonut() }}
                >
                  <div className="flex h-full w-full items-center justify-center bg-hero-void">
                    <div className="text-center">
                      <p className="font-mono text-2xl font-bold tabular-nums text-accent">100%</p>
                      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-hero-fg/65">
                        {isKo ? "MIX" : "MIX"}
                      </p>
                    </div>
                  </div>
                </div>
                <ul className="w-full max-w-xs space-y-3">
                  {TYPE_DISTRIBUTION.map((seg) => (
                    <li key={seg.typeKey} className="flex items-center justify-between gap-3 font-mono text-sm">
                      <span className="flex items-center gap-2 text-hero-fg">
                        <span
                          className={`h-3 w-3 border-2 border-accent ${seg.color}`}
                        />
                        {TYPE_LABELS[seg.typeKey][isKo ? "ko" : "en"]}
                      </span>
                      <span className="font-bold tabular-nums text-accent">{seg.pct}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="mt-12 border-t border-border/70 pt-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="tkad-glass-surface relative overflow-hidden rounded-[26px] p-8 text-center sm:p-10">
            <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.10] tkad-neon-grid" />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(34,211,238,0.18),transparent_55%),radial-gradient(circle_at_90%_20%,rgba(168,85,247,0.14),transparent_58%),radial-gradient(circle_at_55%_110%,rgba(236,72,153,0.12),transparent_60%)]"
            />
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
            [ NEXT STEP ]
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {isKo ? "캠페인에 맞는 플랜이 필요하신가요?" : "Need a plan that fits your campaign?"}
          </h2>
          <p className="mt-3 font-mono text-[12px] tracking-tight text-muted-foreground">
            {`// `}{isKo
              ? "담당 컨설턴트가 미디어 믹스와 견적을 정리해 드립니다."
              : "Our team will help structure your media mix and estimates."}
          </p>
          <div className="mt-8 inline-flex">
            <button
              type="button"
              onClick={openModal}
              className="tkad-neon-cta-clean inline-flex h-16 items-center justify-center gap-2 rounded-[22px] px-10 text-base font-black text-white transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35 focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:text-lg"
            >
              {isKo ? "전체 기능 이용하기" : "Use full features"}
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
          </div>
        </div>
      </section>

      <Modal
        open={showLeadModal}
        onClose={closeModal}
        locked={leadSubmitted}
        ariaLabel={isKo ? "도입 상담 요청" : "Request a consultation"}
        className="max-w-md"
      >
        <div className="relative p-6 text-white">
          {!leadSubmitted ? (
            <>
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-white/65">
                [ CONSULTATION ]
              </p>
              <h3 className="mt-2 pr-10 text-xl font-black tracking-tight text-white">
                {isKo ? "도입 상담 요청" : "Request a consultation"}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-white/72">
                {`// `}{isKo
                  ? "아래 정보를 남겨 주시면 연락드리겠습니다."
                  : "Leave your details and we will reach out."}
              </p>
              <form onSubmit={handleLeadSubmit} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="lead-company" className="mb-2 block font-mono text-[10px] font-black uppercase tracking-[0.22em] text-white/65">
                    [ {isKo ? "회사명" : "Company"} ]
                  </label>
                  <input
                    id="lead-company"
                    required
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label htmlFor="lead-name" className="mb-2 block font-mono text-[10px] font-black uppercase tracking-[0.22em] text-white/65">
                    [ {isKo ? "이름" : "Name"} ]
                  </label>
                  <input
                    id="lead-name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label htmlFor="lead-email" className="mb-2 block font-mono text-[10px] font-black uppercase tracking-[0.22em] text-white/65">
                    [ {isKo ? "이메일" : "Email"} ]
                  </label>
                  <input
                    id="lead-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label htmlFor="lead-phone" className="mb-2 block font-mono text-[10px] font-black uppercase tracking-[0.22em] text-white/65">
                    [ {isKo ? "전화번호" : "Phone"} ]
                  </label>
                  <input
                    id="lead-phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <BtnBlock
                  type="submit"
                  variant="accent"
                  size="md"
                  disabled={leadLoading}
                  className="mt-2 w-full rounded-[18px] py-3 !text-white"
                >
                  {leadLoading ? (
                    <>
                      <Spinner className="mr-2" />
                      {isKo ? "전송 중..." : "Sending..."}
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      {isKo ? "제출하기" : "Submit"}
                    </>
                  )}
                </BtnBlock>
              </form>
            </>
          ) : (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[18px] border border-white/12 bg-white/8 text-white shadow-sm backdrop-blur">
                <CheckCircle className="h-8 w-8" />
              </div>
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-white/65">
                [ SUBMITTED ]
              </p>
              <p className="mt-2 text-lg font-black tracking-tight text-white">
                {isKo ? "담당자가 24시간 내 연락드립니다" : "We will contact you within 24 hours"}
              </p>
              <div className="mt-6 inline-flex">
                <BtnBlock
                  variant="secondary"
                  size="md"
                  onClick={closeModal}
                  className="rounded-[18px]"
                >
                  {isKo ? "닫기" : "Close"}
                </BtnBlock>
              </div>
            </div>
          )}
        </div>
      </Modal>
      </div>
    </HomeLandingDayNight>
  );
}
