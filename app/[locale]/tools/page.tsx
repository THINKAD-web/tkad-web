"use client";

import { useLocale } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  X,
  Zap,
} from "lucide-react";

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
  { typeKey: "digital" as const, pct: 38, color: "from-sky-500 to-blue-600" },
  { typeKey: "billboard" as const, pct: 28, color: "from-amber-500 to-orange-600" },
  { typeKey: "subway" as const, pct: 22, color: "from-violet-500 to-purple-600" },
  { typeKey: "bus" as const, pct: 12, color: "from-emerald-500 to-teal-600" },
];

const CARD_GRADIENTS = [
  "from-indigo-500/15 via-purple-500/10 to-fuchsia-500/15",
  "from-cyan-500/15 via-sky-500/10 to-blue-500/15",
  "from-amber-500/15 via-orange-500/10 to-rose-500/10",
  "from-emerald-500/15 via-teal-500/10 to-cyan-500/10",
  "from-violet-500/15 via-indigo-500/10 to-blue-500/15",
];

function conicGradientForDonut(): string {
  let acc = 0;
  const stops: string[] = [];
  const colors = ["#0ea5e9", "#f59e0b", "#8b5cf6", "#10b981"];
  TYPE_DISTRIBUTION.forEach((seg, i) => {
    const start = acc;
    acc += seg.pct;
    stops.push(`${colors[i]} ${start}% ${acc}%`);
  });
  return `conic-gradient(${stops.join(", ")})`;
}

export default function ToolsPage() {
  const locale = useLocale();
  const isKo = locale === "ko";
  const [region, setRegion] = useState<RegionKey>("seoul");
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);
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

  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLeadSubmitted(true);
  };

  const regionOptions: { value: RegionKey; labelKo: string; labelEn: string }[] = [
    { value: "seoul", labelKo: "서울", labelEn: "Seoul" },
    { value: "busan", labelKo: "부산", labelEn: "Busan" },
    { value: "jeju", labelKo: "제주", labelEn: "Jeju" },
    { value: "national", labelKo: "전국", labelEn: "National" },
  ];

  const items = MEDIA_BY_REGION[region];

  return (
    <>
      <section className="relative overflow-hidden bg-navy py-20">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-gold/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-bold text-gold backdrop-blur">
                <Zap className="h-3.5 w-3.5" />
                {isKo ? "프리뷰" : "Preview"}
                <Lock className="h-3 w-3 text-white/60" />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
                {isKo ? "미디어 플래닝 툴" : "Media Planning Tool"}
              </h1>
              <p className="mt-4 text-lg text-slate-300">
                {isKo
                  ? "지역·매체 유형·노출 규모를 한 화면에서 비교하고, 캠페인에 맞는 추천 조합을 빠르게 탐색하세요. 전체 분석·예약 연동은 정식 버전에서 제공됩니다."
                  : "Compare region, format, and reach in one view and explore recommended mixes for your campaign. Full analytics and booking connect in the production release."}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={openModal}
                className="rounded-full bg-gold px-8 font-bold text-navy shadow-lg shadow-gold/25 hover:bg-gold-dark"
              >
                {isKo ? "전체 기능 이용하기" : "Use full features"}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Link href="/media">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                >
                  <Monitor className="h-4 w-4" />
                  {isKo ? "매체 카탈로그" : "Media catalog"}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b bg-gradient-to-b from-slate-50 to-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-navy sm:text-3xl">
                {isKo ? "추천 매체 시뮬레이션" : "Recommended media simulation"}
              </h2>
              <p className="mt-2 max-w-xl text-muted-foreground">
                {isKo
                  ? "지역을 선택하면 해당 권역 기준 샘플 추천이 표시됩니다."
                  : "Pick a region to see sample recommendations for that area."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-gold-dark" />
              <label htmlFor="tools-region" className="sr-only">
                {isKo ? "지역" : "Region"}
              </label>
              <select
                id="tools-region"
                value={region}
                onChange={(e) => setRegion(e.target.value as RegionKey)}
                className="min-w-[180px] rounded-xl border border-navy/10 bg-white px-4 py-2.5 text-sm font-semibold text-navy shadow-sm outline-none ring-gold/30 focus:ring-2"
              >
                {regionOptions.map((r) => (
                  <option key={r.value} value={r.value}>
                    {isKo ? r.labelKo : r.labelEn}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {items.map((item, i) => (
              <Card
                key={`${region}-${item.nameKo}`}
                className={`border-0 bg-gradient-to-br ${CARD_GRADIENTS[i % CARD_GRADIENTS.length]} shadow-lg`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg leading-snug text-navy">
                      {isKo ? item.nameKo : item.nameEn}
                    </CardTitle>
                    <div className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">
                      <BadgeCheck className="h-3 w-3" />
                      Verified
                    </div>
                  </div>
                  <CardDescription className="text-navy/60">
                    <Badge
                      variant="secondary"
                      className="mt-1 border-0 bg-navy/10 font-semibold text-navy"
                    >
                      {TYPE_LABELS[item.typeKey][isKo ? "ko" : "en"]}
                    </Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="grid grid-cols-2 gap-3 rounded-xl bg-white/60 p-3 backdrop-blur-sm">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-navy/50">
                        {isKo ? "일 노출" : "Daily reach"}
                      </p>
                      <p className="text-lg font-extrabold text-navy">
                        {item.exposureK}K
                        <span className="text-xs font-semibold text-navy/50">
                          {isKo ? "/일" : "/day"}
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-navy/50">
                        ROI
                      </p>
                      <p className="flex items-center gap-1 text-lg font-extrabold text-gold-dark">
                        <TrendingUp className="h-4 w-4" />
                        {item.roi}x
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-navy py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/20 text-gold">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white sm:text-3xl">
                {isKo ? "인사이트 대시보드 (샘플)" : "Insight dashboard (sample)"}
              </h2>
              <p className="text-slate-400">
                {isKo ? "정식 툴에서는 실데이터와 필터가 연결됩니다." : "Production ties live data and filters here."}
              </p>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-5">
            <Card className="border-0 bg-white/5 shadow-lg shadow-black/20 backdrop-blur lg:col-span-3">
              <CardHeader>
                <CardTitle className="text-white">
                  {isKo ? "지역별 일일 노출수" : "Regional daily exposures"}
                </CardTitle>
                <CardDescription className="text-slate-400">
                  {isKo ? "추정 일간 임프레션 (천 단위)" : "Estimated daily impressions (thousands)"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex h-56 items-end justify-between gap-3 border-b border-white/10 pb-2 pt-4 sm:gap-6">
                  {REGION_BAR_VALUES.map((row) => {
                    const px = Math.max(28, Math.round((row.valueK / maxBar) * barMaxPx));
                    const label = regionOptions.find((o) => o.value === row.key);
                    return (
                      <div key={row.key} className="flex flex-1 flex-col items-center gap-3">
                        <div
                          className="w-full max-w-[4.5rem] rounded-t-xl bg-gradient-to-t from-gold-dark via-gold to-amber-200 shadow-lg shadow-gold/20 transition-all"
                          style={{ height: `${px}px` }}
                          title={`${row.valueK}K`}
                        />
                        <span className="text-center text-xs font-semibold text-slate-300">
                          {isKo ? label?.labelKo : label?.labelEn}
                        </span>
                        <span className="text-sm font-bold text-gold">{row.valueK}K</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-white/5 shadow-lg shadow-black/20 backdrop-blur lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-white">
                  {isKo ? "매체 유형 비중" : "Format mix"}
                </CardTitle>
                <CardDescription className="text-slate-400">
                  {isKo ? "캠페인 샘플 분포" : "Sample campaign split"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-8 sm:flex-row sm:justify-center">
                <div
                  className="relative h-44 w-44 shrink-0 rounded-full p-1 shadow-2xl shadow-black/40"
                  style={{ background: conicGradientForDonut() }}
                >
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-navy">
                    <div className="text-center">
                      <p className="text-2xl font-black text-white">100%</p>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                        {isKo ? "믹스" : "Mix"}
                      </p>
                    </div>
                  </div>
                </div>
                <ul className="w-full max-w-xs space-y-3">
                  {TYPE_DISTRIBUTION.map((seg) => (
                    <li key={seg.typeKey} className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex items-center gap-2 text-slate-300">
                        <span
                          className={`h-2.5 w-2.5 rounded-full bg-gradient-to-r ${seg.color}`}
                        />
                        {TYPE_LABELS[seg.typeKey][isKo ? "ko" : "en"]}
                      </span>
                      <span className="font-bold text-gold">{seg.pct}%</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-navy sm:text-3xl">
            {isKo ? "캠페인에 맞는 플랜이 필요하신가요?" : "Need a plan that fits your campaign?"}
          </h2>
          <p className="mt-3 text-muted-foreground">
            {isKo
              ? "담당 컨설턴트가 미디어 믹스와 견적을 정리해 드립니다."
              : "Our team will help structure your media mix and estimates."}
          </p>
          <Button
            type="button"
            onClick={openModal}
            size="lg"
            className="mt-8 rounded-full bg-gold px-10 font-bold text-navy shadow-lg shadow-gold/25 hover:bg-gold-dark"
          >
            {isKo ? "전체 기능 이용하기" : "Use full features"}
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </section>

      {showLeadModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            aria-label={isKo ? "닫기" : "Close"}
            onClick={closeModal}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={closeModal}
              className="absolute right-4 top-4 rounded-full p-1 text-navy/50 transition-colors hover:bg-navy/5 hover:text-navy"
              aria-label={isKo ? "닫기" : "Close"}
            >
              <X className="h-5 w-5" />
            </button>

            {!leadSubmitted ? (
              <>
                <h3 className="pr-10 text-xl font-bold text-navy">
                  {isKo ? "도입 상담 요청" : "Request a consultation"}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isKo
                    ? "아래 정보를 남겨 주시면 연락드리겠습니다."
                    : "Leave your details and we will reach out."}
                </p>
                <form onSubmit={handleLeadSubmit} className="mt-6 space-y-4">
                  <div>
                    <label htmlFor="lead-company" className="mb-1.5 block text-xs font-bold text-navy">
                      {isKo ? "회사명" : "Company"}
                    </label>
                    <Input
                      id="lead-company"
                      required
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="rounded-xl border-navy/15"
                    />
                  </div>
                  <div>
                    <label htmlFor="lead-name" className="mb-1.5 block text-xs font-bold text-navy">
                      {isKo ? "이름" : "Name"}
                    </label>
                    <Input
                      id="lead-name"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="rounded-xl border-navy/15"
                    />
                  </div>
                  <div>
                    <label htmlFor="lead-email" className="mb-1.5 block text-xs font-bold text-navy">
                      {isKo ? "이메일" : "Email"}
                    </label>
                    <Input
                      id="lead-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="rounded-xl border-navy/15"
                    />
                  </div>
                  <div>
                    <label htmlFor="lead-phone" className="mb-1.5 block text-xs font-bold text-navy">
                      {isKo ? "전화번호" : "Phone"}
                    </label>
                    <Input
                      id="lead-phone"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="rounded-xl border-navy/15"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="mt-2 w-full rounded-xl bg-gold font-bold text-navy hover:bg-gold-dark"
                  >
                    <Send className="h-4 w-4" />
                    {isKo ? "제출하기" : "Submit"}
                  </Button>
                </form>
              </>
            ) : (
              <div className="py-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle className="h-8 w-8" />
                </div>
                <p className="text-lg font-bold text-navy">
                  {isKo ? "담당자가 24시간 내 연락드립니다" : "We will contact you within 24 hours"}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-6 rounded-xl border-navy/20 text-navy"
                  onClick={closeModal}
                >
                  {isKo ? "닫기" : "Close"}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
