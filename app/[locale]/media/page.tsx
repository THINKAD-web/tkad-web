"use client";

import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Monitor } from "lucide-react";
import { useState, useMemo } from "react";

const mediaData = [
  { id: 1, name: "강남역 대형 빌보드", nameEn: "Gangnam Station Large Billboard", location: "서울 강남구", locationEn: "Gangnam-gu, Seoul", region: "seoul", type: "billboard", price: 2500 },
  { id: 2, name: "코엑스 디지털 사이니지", nameEn: "COEX Digital Signage", location: "서울 삼성동", locationEn: "Samsung-dong, Seoul", region: "seoul", type: "digital", price: 3800 },
  { id: 3, name: "홍대입구역 지하철 광고", nameEn: "Hongdae Station Subway Ad", location: "서울 마포구", locationEn: "Mapo-gu, Seoul", region: "seoul", type: "subway", price: 1200 },
  { id: 4, name: "명동 대형 전광판", nameEn: "Myeongdong Large LED", location: "서울 중구", locationEn: "Jung-gu, Seoul", region: "seoul", type: "digital", price: 4200 },
  { id: 5, name: "잠실 롯데월드타워 빌보드", nameEn: "Lotte World Tower Billboard", location: "서울 송파구", locationEn: "Songpa-gu, Seoul", region: "seoul", type: "billboard", price: 5000 },
  { id: 6, name: "서면역 디지털 스크린", nameEn: "Seomyeon Station Digital Screen", location: "부산 부산진구", locationEn: "Busanjin-gu, Busan", region: "busan", type: "digital", price: 1500 },
  { id: 7, name: "해운대 해변 빌보드", nameEn: "Haeundae Beach Billboard", location: "부산 해운대구", locationEn: "Haeundae-gu, Busan", region: "busan", type: "billboard", price: 1800 },
  { id: 8, name: "부산역 지하철 광고", nameEn: "Busan Station Subway Ad", location: "부산 동구", locationEn: "Dong-gu, Busan", region: "busan", type: "subway", price: 900 },
  { id: 9, name: "제주공항 디지털 광고", nameEn: "Jeju Airport Digital Ad", location: "제주시", locationEn: "Jeju City", region: "jeju", type: "digital", price: 2200 },
  { id: 10, name: "제주 중문관광단지 빌보드", nameEn: "Jungmun Resort Billboard", location: "서귀포시", locationEn: "Seogwipo City", region: "jeju", type: "billboard", price: 1000 },
  { id: 11, name: "강남대로 버스 쉘터", nameEn: "Gangnam-daero Bus Shelter", location: "서울 강남구", locationEn: "Gangnam-gu, Seoul", region: "seoul", type: "bus", price: 800 },
  { id: 12, name: "을지로 지하철 랩핑", nameEn: "Euljiro Subway Wrapping", location: "서울 중구", locationEn: "Jung-gu, Seoul", region: "seoul", type: "subway", price: 2000 },
  { id: 13, name: "전국 고속도로 빌보드", nameEn: "National Highway Billboard", location: "전국", locationEn: "Nationwide", region: "national", type: "billboard", price: 3500 },
  { id: 14, name: "전국 시내버스 광고", nameEn: "National City Bus Ad", location: "전국", locationEn: "Nationwide", region: "national", type: "bus", price: 600 },
  { id: 15, name: "여의도 IFC 디지털", nameEn: "Yeouido IFC Digital", location: "서울 영등포구", locationEn: "Yeongdeungpo-gu, Seoul", region: "seoul", type: "digital", price: 3200 },
];

const typeLabels: Record<string, { ko: string; en: string }> = {
  billboard: { ko: "빌보드", en: "Billboard" },
  digital: { ko: "디지털", en: "Digital" },
  subway: { ko: "지하철", en: "Subway" },
  bus: { ko: "버스", en: "Bus" },
};

export default function MediaPage() {
  const t = useTranslations();
  const locale = useLocale();
  const isKo = locale === "ko";

  const [region, setRegion] = useState("all");
  const [type, setType] = useState("all");
  const [budget, setBudget] = useState("all");

  const filtered = useMemo(() => {
    return mediaData.filter((m) => {
      if (region !== "all" && m.region !== region) return false;
      if (type !== "all" && m.type !== type) return false;
      if (budget === "under1000" && m.price > 1000) return false;
      if (budget === "1000to3000" && (m.price < 1000 || m.price > 3000)) return false;
      if (budget === "3000to5000" && (m.price < 3000 || m.price > 5000)) return false;
      if (budget === "over5000" && m.price < 5000) return false;
      return true;
    });
  }, [region, type, budget]);

  const regions = [
    { value: "all", label: t("media.allRegions") },
    { value: "seoul", label: t("media.regions.seoul") },
    { value: "busan", label: t("media.regions.busan") },
    { value: "jeju", label: t("media.regions.jeju") },
    { value: "national", label: t("media.regions.national") },
  ];

  const types = [
    { value: "all", label: t("media.allTypes") },
    { value: "billboard", label: t("media.types.billboard") },
    { value: "digital", label: t("media.types.digital") },
    { value: "subway", label: t("media.types.subway") },
    { value: "bus", label: t("media.types.bus") },
  ];

  const budgets = [
    { value: "all", label: t("media.allBudgets") },
    { value: "under1000", label: t("media.budgets.under1000") },
    { value: "1000to3000", label: t("media.budgets.1000to3000") },
    { value: "3000to5000", label: t("media.budgets.3000to5000") },
    { value: "over5000", label: t("media.budgets.over5000") },
  ];

  const resetFilters = () => {
    setRegion("all");
    setType("all");
    setBudget("all");
  };

  return (
    <>
      <section className="bg-navy py-16">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            {t("media.title")}
          </h1>
          <p className="mt-2 text-slate-300">{t("media.subtitle")}</p>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-8 lg:flex-row">
            {/* Sidebar */}
            <aside className="w-full shrink-0 lg:w-64">
              <div className="sticky top-24 space-y-6 rounded-xl border bg-white p-6 shadow-sm">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-navy">
                    {t("media.region")}
                  </label>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  >
                    {regions.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-navy">
                    {t("media.type")}
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  >
                    {types.map((tp) => (
                      <option key={tp.value} value={tp.value}>
                        {tp.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-navy">
                    {t("media.budget")}
                  </label>
                  <select
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  >
                    {budgets.map((b) => (
                      <option key={b.value} value={b.value}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={resetFilters}
                >
                  {t("common.reset")}
                </Button>
              </div>
            </aside>

            {/* Grid */}
            <div className="flex-1">
              <div className="mb-4 text-sm text-muted-foreground">
                {t("media.results")}: {filtered.length}
              </div>
              {filtered.length === 0 ? (
                <div className="flex h-64 items-center justify-center rounded-xl border text-muted-foreground">
                  {t("media.noResults")}
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {filtered.map((media) => (
                    <Card
                      key={media.id}
                      className="overflow-hidden transition-shadow hover:shadow-lg"
                    >
                      <div className="flex h-40 items-center justify-center bg-gradient-to-br from-navy/5 to-navy/10">
                        <Monitor className="h-10 w-10 text-navy/20" />
                      </div>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <Badge
                            variant="secondary"
                            className="bg-navy/5 text-navy text-xs"
                          >
                            {isKo
                              ? typeLabels[media.type].ko
                              : typeLabels[media.type].en}
                          </Badge>
                        </div>
                        <CardTitle className="text-base">
                          {isKo ? media.name : media.nameEn}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {isKo ? media.location : media.locationEn}
                        </div>
                        <div className="mt-2 text-lg font-bold text-navy">
                          ₩{media.price.toLocaleString()}
                          <span className="text-xs font-normal text-muted-foreground">
                            만원 {t("media.perMonth")}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
