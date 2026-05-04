/**
 * MediaCard — 브루탈리스트 매체 카드.
 *
 * 핵심:
 * - 2px 검정 보더, 사각 (radius 0)
 * - 이미지 grayscale(100%) → hover grayscale(0%) 전환
 * - 메타: [번호] [ Type ] · // location · 가격 (모노스페이스)
 *
 * 리스트(/ko/media)·상세 페이지·홈 캐러셀 등에서 재사용.
 */
import { Link } from "@/i18n/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type MediaCardProps = {
  href: string;
  imageSrc?: string | null;
  imageAlt?: string;
  /** [01] 같은 인덱스 라벨 */
  index?: string | number;
  /** [ Digital ] 같은 매체 유형 라벨 */
  type?: string;
  name: string;
  location?: string;
  /** "₩2,400만/월" 등 표시용 가격 문자열 */
  price?: string;
  /** 우측 상단 강조 라벨 (예: VERIFIED, NEW). bx-accent 스타일 */
  topRight?: ReactNode;
  /** 카드 하단 추가 메타 영역 */
  footer?: ReactNode;
  className?: string;
};

export function MediaCard({
  href,
  imageSrc,
  imageAlt,
  index,
  type,
  name,
  location,
  price,
  topRight,
  footer,
  className,
}: MediaCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex h-full flex-col border-2 border-border bg-card transition-all duration-300 hover:-translate-y-0.5 hover:border-hermes/45 hover:shadow-[0_16px_40px_rgba(255,98,0,0.1)] dark:hover:shadow-[0_18px_48px_rgba(255,98,0,0.16)]",
        className,
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden border-b-2 border-border bg-muted/40">
        {imageSrc ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={imageSrc}
            alt={imageAlt ?? ""}
            className="h-full w-full object-cover grayscale transition-[filter,transform] duration-500 ease-out group-hover:grayscale-0 group-hover:scale-[1.02]"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            [ no image ]
          </div>
        )}
        {topRight ? (
          <div className="absolute right-0 top-0 border-b-2 border-l-2 border-border bg-hermes px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white shadow-[0_0_16px_rgba(255,98,0,0.35)]">
            {topRight}
          </div>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        {(index !== undefined || type) && (
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {index !== undefined ? (
              <span className="text-foreground">[{String(index).padStart(2, "0")}]</span>
            ) : (
              <span />
            )}
            {type ? <span>[ {type} ]</span> : null}
          </div>
        )}
        <h3 className="text-lg font-black leading-tight tracking-tight text-foreground sm:text-xl">
          {name}
        </h3>
        {location ? (
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            // {location}
          </p>
        ) : null}
        {price ? (
          <p className="mt-1 font-mono text-base font-black tabular-nums text-foreground">
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
