"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Layers, Monitor, Ruler } from "lucide-react";
import type { MediaItem } from "@/lib/media-data";
import { formatCreativeSpecLine, formatSizeDisplay } from "@/lib/format-media-size";
import { MediaPriceExclNote } from "@/components/media/media-price-excl-note";
import {
  formatCatalogPriceFieldWon,
  hasUniformPriceOptions,
  resolveMediaPriceOptionPeriodLabel,
  uniformPriceOptionsSummary,
} from "@/lib/media-price-format";
import { networkInventoryUnitSuffix } from "@/lib/media-network-types";
import { cn } from "@/lib/utils";

type Labels = {
  size: string;
  resolution: string;
  creativeSpec: string;
  brightness: string;
  operatingHours: string;
  installYear: string;
  targetAge: string;
  empty: string;
  processTitle: string;
  noticesTitle: string;
  specsTitle: string;
  periodLabel: string;
};

type Props = {
  media: MediaItem;
  isKo: boolean;
  labels: Labels;
  hasPriceOptions: boolean;
  priceOptions?: MediaItem["priceOptions"];
  primaryPriceOption?: { price: number; label: string; period?: string };
  featuresText?: string;
  className?: string;
};

function Accordion({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      className="group rounded-2xl border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-white"
      open={defaultOpen}
    >
      <summary className="cursor-pointer list-none px-4 py-3 text-[length:var(--qp-text-h3)] font-bold dark:text-white text-gray-900 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between gap-2">
          {title}
          <span className="text-[length:var(--qp-text-meta)] text-gray-600 dark:text-white/55 transition group-open:rotate-180">
            ▾
          </span>
        </span>
      </summary>
      <div className="border-t dark:border-white/10 border-gray-100 px-4 py-4 text-[length:var(--qp-text-body)] leading-relaxed dark:text-white/75 text-gray-700">
        {children}
      </div>
    </details>
  );
}

function SpecRow({ label, value }: { label: string; value?: ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-[length:var(--qp-text-meta)] font-semibold text-gray-600 dark:text-white/70">
        {label}
      </dt>
      <dd className="text-[length:var(--qp-text-body)] font-medium text-gray-800 dark:text-white/85">
        {value}
      </dd>
    </div>
  );
}

function IconSpec({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border dark:border-white/10 border-gray-100 dark:bg-black/20 bg-gray-50 p-3",
        className,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--qp-accent)]" aria-hidden />
      <div>
        <p className="text-[length:var(--qp-text-meta)] font-semibold text-gray-600 dark:text-white/70">
          {label}
        </p>
        <p className="mt-1 text-[length:var(--qp-text-body)] font-semibold dark:text-white text-gray-900">{value}</p>
      </div>
    </div>
  );
}

export function MediaDetailExecutionPanel({
  media,
  isKo,
  labels,
  hasPriceOptions,
  priceOptions,
  primaryPriceOption,
  featuresText,
  className,
}: Props) {
  const processSteps = isKo
    ? [
        "1. 매체·기간 선택 후 견적 요청",
        "2. 담당자 확인 및 가용성 확정",
        "3. 소재 제출 및 심의",
        "4. 집행·모니터링 리포트 제공",
      ]
    : [
        "1. Select media & dates, request a quote",
        "2. Availability confirmation",
        "3. Creative submission & review",
        "4. Flight & monitoring report",
      ];

  const notices = isKo
    ? [
        "최종 단가는 시즌·옵션에 따라 변동될 수 있습니다.",
        "소재 규격 미준수 시 재제작 비용이 발생할 수 있습니다.",
        "집행 7일 전 소재 확정을 권장합니다.",
      ]
    : [
        "Final rates may vary by season and options.",
        "Non-compliant creatives may incur remake fees.",
        "Confirm creatives at least 7 days before flight.",
      ];

  const uniformPriceSummary =
    hasPriceOptions && priceOptions?.length && hasUniformPriceOptions(priceOptions)
      ? uniformPriceOptionsSummary(priceOptions)
      : null;

  const operatingHoursValue = !media.keywordFilter
    ? isKo
      ? media.operatingHours
      : media.operatingHoursEn
    : undefined;
  const hasExtraSpecs = Boolean(
    media.brightness?.trim() ||
      operatingHoursValue?.trim() ||
      media.installYear ||
      (isKo && media.targetAge?.trim()),
  );

  return (
    <div
      className={cn(
        "space-y-[length:var(--qp-space-group)]",
        className,
      )}
    >
      <div>
        <h2 className="text-[length:var(--qp-text-h3)] font-bold tracking-tight dark:text-white text-gray-900">
          {labels.specsTitle}
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <IconSpec
            icon={Ruler}
            label={labels.size}
            value={(() => {
              const sized = formatSizeDisplay(media);
              return sized !== "—" ? sized : labels.empty;
            })()}
          />
          <IconSpec
            icon={Monitor}
            label={labels.resolution}
            value={media.resolution || labels.empty}
          />
          <IconSpec
            icon={Layers}
            label={labels.creativeSpec}
            value={formatCreativeSpecLine(media, isKo) ?? labels.empty}
            className="sm:col-span-2"
          />
        </div>
        {hasExtraSpecs ? (
          <details className="group mt-5 rounded-2xl border border-gray-200 bg-[color:var(--qp-surface-2)] dark:border-white/10 dark:bg-white/[0.03]">
            <summary className="cursor-pointer list-none px-4 py-3 text-[length:var(--qp-text-meta)] font-semibold text-gray-700 dark:text-white/80 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center justify-between gap-2">
                {isKo ? "추가 스펙 보기" : "More specs"}
                <span className="text-gray-500 transition group-open:rotate-180 dark:text-white/45">
                  ▾
                </span>
              </span>
            </summary>
            <dl className="grid gap-x-6 gap-y-5 border-t border-gray-200 px-4 py-5 sm:grid-cols-2 dark:border-white/10">
              <SpecRow label={labels.brightness} value={media.brightness} />
              <SpecRow
                label={labels.operatingHours}
                value={operatingHoursValue}
              />
              <SpecRow
                label={labels.installYear}
                value={
                  media.installYear ? String(media.installYear) : undefined
                }
              />
              <SpecRow
                label={labels.targetAge}
                value={isKo ? media.targetAge : undefined}
              />
            </dl>
          </details>
        ) : null}
      </div>

      {hasPriceOptions && priceOptions?.length ? (
        <div className="rounded-2xl border dark:border-white/10 border-gray-200 p-4">
          <p className="mb-3 text-[length:var(--qp-text-meta)] font-semibold text-gray-600 dark:text-white/70">
            {isKo ? "가격 옵션" : "Price options"}
          </p>
          {uniformPriceSummary ? (
            <div className="rounded-xl border dark:border-white/8 border-gray-100 dark:bg-black/15 bg-gray-50/80 px-3 py-2.5">
              <p className="text-[length:var(--qp-text-body)] font-medium dark:text-white/85 text-gray-800">
                {isKo
                  ? `${uniformPriceSummary.labelsJoined} 동일 단가`
                  : `${uniformPriceSummary.labelsJoined} — same rate`}
              </p>
              <p className="mt-1 font-sans text-[length:var(--qp-text-body)] font-bold tabular-nums dark:text-white text-gray-900">
                {formatCatalogPriceFieldWon(uniformPriceSummary.priceWon, isKo ? "ko-KR" : "en-US", media.country)}
              </p>
            </div>
          ) : (
          <ul className="space-y-3">
            {priceOptions.map((opt, idx) => {
              const periodLabel = resolveMediaPriceOptionPeriodLabel(
                opt,
                media.pricePeriod,
                isKo ? "ko" : "en",
              );
              const unitSuffix = networkInventoryUnitSuffix(
                media.networkSubtype ?? media.type,
                isKo,
                media.tags,
              );
              const unitsLine =
                opt.units != null && opt.units > 0
                  ? isKo
                    ? `${opt.units.toLocaleString("ko-KR")}${unitSuffix || "대"}`
                    : `${opt.units.toLocaleString("en-US")} units`
                  : null;
              const metaLine = [periodLabel, unitsLine, opt.description?.trim()]
                .filter(Boolean)
                .join(" · ");
              const hasStores = Boolean(opt.stores?.trim());

              return (
                <li
                  key={`${opt.label}-${idx}`}
                  className="rounded-xl border dark:border-white/8 border-gray-100 dark:bg-black/15 bg-gray-50/80 px-3 py-2.5"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2 text-[length:var(--qp-text-body)]">
                    <span className="font-medium dark:text-white/85 text-gray-800">
                      {opt.label}
                    </span>
                    <span className="font-sans font-bold tabular-nums dark:text-white text-gray-900">
                      {formatCatalogPriceFieldWon(opt.price, isKo ? "ko-KR" : "en-US", media.country)}
                    </span>
                  </div>
                  {metaLine ? (
                    <p className="mt-1 text-[length:var(--qp-text-meta)] leading-relaxed text-gray-600 dark:text-white/65">
                      {metaLine}
                    </p>
                  ) : null}
                  {hasStores ? (
                    <details className="group/stores mt-2">
                      <summary
                        className={cn(
                          "cursor-pointer list-none text-xs font-semibold text-[color:var(--qp-accent)] dark:text-[color:var(--qp-accent)]/90",
                          "[&::-webkit-details-marker]:hidden",
                        )}
                      >
                        <span className="inline-flex items-center gap-1">
                          {isKo ? "포함 지점 보기" : "View locations"}
                          <span className="transition group-open/stores:rotate-180">▾</span>
                        </span>
                      </summary>
                      <p className="mt-1.5 text-xs leading-relaxed dark:text-white/65 text-gray-600">
                        {opt.stores}
                      </p>
                    </details>
                  ) : null}
                </li>
              );
            })}
          </ul>
          )}
          <MediaPriceExclNote isKo={isKo} className="mt-2" />
        </div>
      ) : null}

      {featuresText ? (
        <p className="rounded-xl border dark:border-white/10 border-gray-100 dark:bg-white/5 bg-[color:var(--qp-accent-soft)] px-4 py-3 text-[length:var(--qp-text-body)] dark:text-white/75 text-gray-700">
          {featuresText}
        </p>
      ) : null}

      <Accordion title={labels.processTitle}>
        <ol className="space-y-2">
          {processSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </Accordion>

      <Accordion title={labels.noticesTitle}>
        <ul className="list-disc space-y-1.5 pl-4">
          {notices.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </Accordion>
    </div>
  );
}
