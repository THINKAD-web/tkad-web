import type { ReactNode } from "react";
import type { BeginnerBasicsCard } from "@/lib/guides-beginner-content";
import {
  BUDGET_INDUSTRY_GUIDES,
  CREATIVE_SPEC_ROWS,
  CREATIVE_WARNINGS_EN,
  CREATIVE_WARNINGS_KO,
  CPM_BEYOND_EN,
  CPM_BEYOND_KO,
  CPM_BENCHMARKS_EN,
  CPM_BENCHMARKS_KO,
  CPM_EXAMPLE_EN,
  CPM_EXAMPLE_KO,
  FIRST_CAMPAIGN_TIPS_EN,
  FIRST_CAMPAIGN_TIPS_KO,
  MEDIA_TYPE_DETAILS,
  OOH_EFFECTIVE_CAMPAIGNS_EN,
  OOH_EFFECTIVE_CAMPAIGNS_KO,
  OOH_GANGNAM_STAT_EN,
  OOH_GANGNAM_STAT_KO,
  OOH_VS_DIGITAL_COMPARISON,
} from "@/lib/guides-beginner-content";

type Props = {
  cards: BeginnerBasicsCard[];
  isKo: boolean;
};

function CardShell({
  card,
  index,
  isKo,
  children,
}: {
  card: BeginnerBasicsCard;
  index: number;
  isKo: boolean;
  children?: ReactNode;
}) {
  const Icon = card.icon;
  return (
    <article
      className={`rounded-[28px] border dark:border-white/12 border-gray-200 dark:bg-white/6 bg-gray-50 p-6 backdrop-blur border-gray-200 dark:border-white/12 sm:p-8 ${ card.wide ? "md:col-span-2 lg:col-span-3" : "" }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="font-display text-xs font-medium uppercase tracking-[0.22em] dark:text-white text-gray-500">
          [{String(index + 1).padStart(2, "0")}]
        </span>
        <Icon className="h-6 w-6 text-[color:var(--qp-accent)]/90" aria-hidden />
      </div>
      <h3 className="text-lg font-black dark:text-white text-gray-900">
        {isKo ? card.titleKo : card.titleEn}
      </h3>
      <p className="mt-3 text-sm leading-relaxed dark:text-white">
        {isKo ? card.summaryKo : card.summaryEn}
      </p>
      {children}
    </article>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="mt-4 space-y-2">
      {items.map((b) => (
        <li
          key={b}
          className="flex gap-2 text-xs leading-relaxed dark:text-white text-gray-600 before:shrink-0 before:content-['·']"
        >
          {b}
        </li>
      ))}
    </ul>
  );
}

function SubLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mt-5 font-display text-xs font-medium uppercase tracking-[0.18em] text-[color:var(--qp-accent)]/80">
      [ {children} ]
    </p>
  );
}

function ComparisonTable({ isKo }: { isKo: boolean }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-xl border dark:border-white/10 border-gray-200">
      <table className="w-full min-w-[480px] text-left text-xs">
        <thead>
          <tr className="border-b dark:border-white/10 border-gray-200 dark:bg-white/5 bg-gray-50">
            <th className="px-3 py-2.5 font-bold dark:text-white text-gray-500">
              {isKo ? "항목" : "Factor"}
            </th>
            <th className="px-3 py-2.5 font-bold text-[color:var(--qp-accent)]/90">OOH</th>
            <th className="px-3 py-2.5 font-bold text-pink-200/90">
              {isKo ? "디지털" : "Digital"}
            </th>
          </tr>
        </thead>
        <tbody>
          {OOH_VS_DIGITAL_COMPARISON.map((row) => (
            <tr key={row.labelKo} className="border-b border-white/6 last:border-0">
              <td className="px-3 py-2.5 font-semibold dark:text-white text-gray-700">
                {isKo ? row.labelKo : row.labelEn}
              </td>
              <td className="px-3 py-2.5 dark:text-white">{isKo ? row.oohKo : row.oohEn}</td>
              <td className="px-3 py-2.5 dark:text-white">
                {isKo ? row.digitalKo : row.digitalEn}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WhatIsOohDetail({ isKo }: { isKo: boolean }) {
  const campaigns = isKo ? OOH_EFFECTIVE_CAMPAIGNS_KO : OOH_EFFECTIVE_CAMPAIGNS_EN;
  return (
    <>
      <BulletList items={isKo ? ["브랜드 인지·신뢰 구축에 유리", "지역·상권 타깃팅 가능", "디지털(DOOH)과 결합 시 유연한 운영"] : ["Strong for awareness and trust", "Geo and district targeting", "Flexible when paired with DOOH"]} />
      <SubLabel>{isKo ? "디지털 광고 vs OOH" : "Digital vs OOH"}</SubLabel>
      <ComparisonTable isKo={isKo} />
      <SubLabel>{isKo ? "OOH가 특히 효과적인 캠페인" : "Campaigns where OOH shines"}</SubLabel>
      <div className="mt-2 flex flex-wrap gap-2">
        {campaigns.map((c) => (
          <span
            key={c}
            className="rounded-lg border dark:border-white/12 border-gray-200 dark:bg-white/8 bg-gray-100 px-2.5 py-1 text-xs font-semibold dark:text-white text-gray-700"
          >
            {c}
          </span>
        ))}
      </div>
      <p className="mt-4 rounded-xl border border-[color:var(--qp-accent)]/25 bg-[color:var(--qp-accent-soft)] px-4 py-3 text-sm font-bold text-[color:var(--qp-accent)]">
        {isKo ? OOH_GANGNAM_STAT_KO : OOH_GANGNAM_STAT_EN}
      </p>
    </>
  );
}

function MediaTypesDetail({ isKo }: { isKo: boolean }) {
  return (
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      {MEDIA_TYPE_DETAILS.map((m) => (
        <div
          key={m.nameKo}
          className="rounded-2xl border dark:border-white/10 border-gray-200 dark:bg-black bg-white/20 p-4"
        >
          <h4 className="text-sm font-black dark:text-white text-gray-900">
            {isKo ? m.nameKo : m.nameEn}
          </h4>
          <BulletList items={isKo ? m.traitsKo : m.traitsEn} />
          <p className="mt-2 text-xs dark:text-white">{isKo ? m.formatsKo : m.formatsEn}</p>
          <p className="mt-1 text-xs dark:text-white">{isKo ? m.suitableKo : m.suitableEn}</p>
          <p className="mt-2 text-xs font-semibold text-[color:var(--qp-accent)]/90">
            {isKo ? m.priceKo : m.priceEn}
          </p>
        </div>
      ))}
    </div>
  );
}

function CpmDetail({ isKo }: { isKo: boolean }) {
  const example = isKo ? CPM_EXAMPLE_KO : CPM_EXAMPLE_EN;
  const benchmarks = isKo ? CPM_BENCHMARKS_KO : CPM_BENCHMARKS_EN;
  const beyond = isKo ? CPM_BEYOND_KO : CPM_BEYOND_EN;
  return (
    <>
      <BulletList items={isKo ? ["CPM = 광고비 ÷ (예상 노출 ÷ 1,000)"] : ["CPM = spend ÷ (estimated impressions ÷ 1,000)"]} />
      <SubLabel>{example.title}</SubLabel>
      <div className="mt-2 rounded-xl border dark:border-white/10 border-gray-200 dark:bg-black bg-white/25 p-4 text-xs leading-relaxed dark:text-white text-gray-700">
        {example.lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <SubLabel>{isKo ? "좋은 CPM / 나쁜 CPM" : "Good vs weak CPM"}</SubLabel>
      <BulletList items={benchmarks} />
      <SubLabel>{isKo ? "CPM 이외에 봐야 할 것" : "Beyond CPM"}</SubLabel>
      <BulletList items={beyond} />
    </>
  );
}

function CreativeDetail({ isKo }: { isKo: boolean }) {
  const warnings = isKo ? CREATIVE_WARNINGS_KO : CREATIVE_WARNINGS_EN;
  return (
    <>
      <div className="mt-4 overflow-x-auto rounded-xl border dark:border-white/10 border-gray-200">
        <table className="w-full min-w-[520px] text-left text-xs">
          <thead>
            <tr className="border-b dark:border-white/10 border-gray-200 dark:bg-white/5 bg-gray-50">
              <th className="px-3 py-2.5 font-bold dark:text-white text-gray-500">
                {isKo ? "매체" : "Format"}
              </th>
              <th className="px-3 py-2.5 font-bold dark:text-white text-gray-500">
                {isKo ? "규격" : "Size"}
              </th>
              <th className="px-3 py-2.5 font-bold dark:text-white text-gray-500">
                {isKo ? "파일" : "File"}
              </th>
              <th className="px-3 py-2.5 font-bold dark:text-white text-gray-500">
                {isKo ? "기간" : "Lead time"}
              </th>
            </tr>
          </thead>
          <tbody>
            {CREATIVE_SPEC_ROWS.map((row) => (
              <tr key={row.formatKo} className="border-b border-white/6 last:border-0">
                <td className="px-3 py-2.5 font-semibold dark:text-white text-gray-800">
                  {isKo ? row.formatKo : row.formatEn}
                </td>
                <td className="px-3 py-2.5 dark:text-white">{isKo ? row.sizeKo : row.sizeEn}</td>
                <td className="px-3 py-2.5 dark:text-white">{isKo ? row.fileKo : row.fileEn}</td>
                <td className="px-3 py-2.5 dark:text-white">{isKo ? row.leadKo : row.leadEn}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <SubLabel>{isKo ? "주의사항" : "Important notes"}</SubLabel>
      <BulletList items={warnings} />
    </>
  );
}

function BudgetDetail({ isKo }: { isKo: boolean }) {
  const tips = isKo ? FIRST_CAMPAIGN_TIPS_KO : FIRST_CAMPAIGN_TIPS_EN;
  return (
    <>
      <div className="mt-5 space-y-5">
        {BUDGET_INDUSTRY_GUIDES.map((g) => {
          const tiers = isKo ? g.tiersKo : g.tiersEn;
          return (
            <div
              key={g.industryKo}
              className="rounded-2xl border dark:border-white/10 border-gray-200 dark:bg-black bg-white/20 p-4"
            >
              <h4 className="text-sm font-black dark:text-white text-gray-900">
                {isKo ? g.industryKo : g.industryEn}
              </h4>
              <ul className="mt-3 space-y-2">
                {tiers.map((t) => (
                  <li
                    key={t.label}
                    className="rounded-lg border border-white/8 bg-white/4 px-3 py-2 text-xs leading-relaxed dark:text-white"
                  >
                    <span className="font-bold dark:text-white text-gray-800">{t.label}</span>
                    <span className="mx-1.5 dark:text-white text-gray-400">·</span>
                    <span className="font-semibold text-[color:var(--qp-accent)]/90">{t.budget}</span>
                    <span className="mt-0.5 block dark:text-white">→ {t.placement}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <SubLabel>{isKo ? "첫 캠페인 팁" : "First campaign tips"}</SubLabel>
      <BulletList items={tips} />
    </>
  );
}

function renderCardDetail(card: BeginnerBasicsCard, isKo: boolean) {
  switch (card.id) {
    case "what-is-ooh":
      return <WhatIsOohDetail isKo={isKo} />;
    case "media-types":
      return <MediaTypesDetail isKo={isKo} />;
    case "cpm":
      return <CpmDetail isKo={isKo} />;
    case "creative":
      return <CreativeDetail isKo={isKo} />;
    case "budget":
      return <BudgetDetail isKo={isKo} />;
    default:
      return (
        <BulletList items={isKo ? card.bulletsKo : card.bulletsEn} />
      );
  }
}

export function GuidesBeginnerBasicsGrid({ cards, isKo }: Props) {
  return (
    <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {cards.map((card, i) => (
        <CardShell key={card.id} card={card} index={i} isKo={isKo}>
          {renderCardDetail(card, isKo)}
        </CardShell>
      ))}
    </div>
  );
}
