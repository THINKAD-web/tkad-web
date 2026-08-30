/**
 * MediaCard — 브루탈리스트 매체 카드.
 *
 * 핵심:
 * - 2px 검정 보더, 사각 (radius 0)
 * - 이미지 항상 컬러, hover 시 scale
 * - 메타: [번호] [ Type ] · // location · 가격 (모노스페이스)
 *
 * 리스트(/ko/media)·상세 페이지·홈 캐러셀 등에서 재사용.
 */
import { Link } from "@/i18n/navigation";
import type { ReactNode } from "react";
import { resolveCatalogImageSrc } from "@/lib/optimized-image-url";
import { BunnyFallbackImage } from "@/components/bunny-fallback-image";
import { cn } from "@/lib/utils";

export type MediaCardProps = {
  href: string;
  imageSrc?: string | null;
  imageAlt?: string;
  /** 이미지 비율 (기본 16:9) */
  imageAspect?: "16/9" | "4/3";
  /** [01] 같은 인덱스 라벨 */
  index?: string | number;
  /** [ Digital ] 같은 매체 유형 라벨 */
  type?: string;
  name: string;
  location?: string;
  /** "₩2,400만/월" 등 표시용 가격 문자열 */
  price?: string;
  /** 좌측 상단 강조 라벨 (예: 베스트 딜 할인율) */
  topLeft?: ReactNode;
  /** 우측 상단 강조 라벨 (예: VERIFIED, NEW). bx-accent 스타일 */
  topRight?: ReactNode;
  /** 좌측 하단 강조 라벨 (예: 즉시 집행 가능) */
  bottomLeft?: ReactNode;
  /** 이미지 위 hover 시 노출되는 오버레이 (예: 노출/CPM 요약) */
  hoverOverlay?: ReactNode;
  /** 랜딩 등 프리미엄 스타일 (rounded + soft shadow) */
  premium?: boolean;
  /** 컴팩트(인기 섹션 등) 텍스트 스케일 다운 */
  density?: "default" | "compact";
  /** 랜딩(퍼플) 등 액센트 글로우 테마 */
  glowTheme?: "orange" | "purple";
  /** 카드 하단 추가 메타 영역 */
  footer?: ReactNode;
  /** LCP — 상위 카드에 priority 로드 */
  imagePriority?: boolean;
  imageSizes?: string;
  className?: string;
};

export function MediaCard({
  href,
  imageSrc,
  imageAlt,
  imageAspect = "16/9",
  index,
  type,
  name,
  location,
  price,
  topLeft,
  topRight,
  bottomLeft,
  hoverOverlay,
  premium = false,
  density = "default",
  glowTheme = "orange",
  footer,
  imagePriority = false,
  imageSizes = "(max-width: 640px) 45vw, 320px",
  className,
}: MediaCardProps) {
  const resolved = imageSrc ? resolveCatalogImageSrc(imageSrc) : null;
  const compact = density === "compact";
  const topRightClass =
    premium && glowTheme === "purple"
      ? "bg-[linear-gradient(135deg,#a855f7_0%,#22d3ee_45%,#ec4899_100%)] shadow-[0_0_14px_rgba(168,85,247,0.16)]"
      : "bg-hermes shadow-[0_0_16px_rgba(255,98,0,0.35)]";
  const neon =
    glowTheme === "purple"
      ? "dark:hover:shadow-[0_30px_102px_rgba(0,0,0,0.72),0_0_0_1px_rgba(124,58,237,0.26),0_0_46px_rgba(124,58,237,0.16)]"
      : "dark:hover:shadow-[0_30px_102px_rgba(0,0,0,0.68),0_0_0_1px_rgba(255,107,0,0.3),0_0_64px_rgba(255,107,0,0.22)]";
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex h-full min-w-0 flex-col bg-card transition-ui duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hermes/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        premium
          ? cn(
              "rounded-2xl border border-border/60 bg-card/85 backdrop-blur hover:-translate-y-1 hover:border-border/80 shadow-[0_12px_40px_rgba(0,0,0,0.06)] hover:shadow-[0_18px_60px_rgba(0,0,0,0.1)] dark:shadow-[0_18px_60px_rgba(0,0,0,0.45)]",
              neon,
              "@container/card",
            )
          : "border-2 border-border hover:-translate-y-0.5 hover:border-hermes/55 hover:shadow-[0_18px_55px_rgba(255,98,0,0.12)] dark:hover:shadow-[0_20px_60px_rgba(255,98,0,0.18)]",
        className,
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden bg-muted/40",
          premium ? "rounded-t-2xl border-b border-border/60" : "border-b-2 border-border",
          imageAspect === "16/9" ? "aspect-[16/9]" : "aspect-[4/3]",
        )}
      >
        {resolved ? (
          <BunnyFallbackImage
            rawSrc={imageSrc!}
            alt={imageAlt ?? ""}
            fill
            sizes={imageSizes}
            priority={imagePriority}
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.1] group-focus-within:scale-[1.1]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-display text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
            [ no image ]
          </div>
        )}
        {topLeft ? (
          <div className="absolute left-2 top-2 z-10 max-w-[calc(100%-1rem)]">
            {topLeft}
          </div>
        ) : null}
        {topRight ? (
          <div
            className={cn(
              "absolute right-0 top-0 z-10 px-2.5 py-1 font-display text-xs font-medium uppercase tracking-[0.2em] dark:text-white text-gray-900",
              topRightClass,
              premium ? "rounded-bl-2xl border-b border-l border-border/60" : "border-b-2 border-l-2 border-border",
            )}
          >
            {topRight}
          </div>
        ) : null}
        {bottomLeft ? (
          <div className="absolute bottom-2 left-2 z-10 max-w-[calc(100%-1rem)]">
            {bottomLeft}
          </div>
        ) : null}
        {hoverOverlay ? (
          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100">
            <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.94),rgba(0,0,0,0.24),transparent)]" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              {hoverOverlay}
            </div>
          </div>
        ) : null}
      </div>
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col gap-2",
          premium ? "p-6" : "p-5",
        )}
      >
        {(index !== undefined || type) && (
          <div className="flex items-center justify-between font-display text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            {index !== undefined ? (
              <span className="text-foreground">[{String(index).padStart(2, "0")}]</span>
            ) : (
              <span />
            )}
            {type ? (
              <span className="font-semibold text-foreground/90">[ {type} ]</span>
            ) : null}
          </div>
        )}
        <h3
          className={cn(
            "font-black leading-tight tracking-tight text-foreground",
            compact ? "text-base sm:text-lg" : "text-lg sm:text-xl",
          )}
        >
          {name}
        </h3>
        {location ? (
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {"// "}
            {location}
          </p>
        ) : null}
        {price ? (
          <p
            className={cn(
              "mt-1 min-w-0 max-w-full font-display font-black tabular-nums text-foreground",
              premium
                ? compact
                  ? "break-words text-[clamp(0.8125rem,7cqi,1.375rem)] leading-[1.12] tracking-tight"
                  : "break-words text-[clamp(0.875rem,7.5cqi,1.5rem)] leading-[1.12] tracking-tight"
                : compact
                  ? "text-2xl sm:text-3xl"
                  : "text-3xl sm:text-4xl",
            )}
          >
            {price}
          </p>
        ) : null}
        {footer ? (
          <div className="mt-auto pt-3">{footer}</div>
        ) : null}
      </div>
    </Link>
  );
}
