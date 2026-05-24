/**
 * BtnBlock — 브루탈리스트 사각 버튼.
 * 모노스페이스 UPPERCASE 라벨, 2px 보더, 둥근모서리 0, 호버 시 색 반전 또는 강조.
 *
 * Variants:
 *   primary   — 검정 → 호버 주황
 *   secondary — 흰색 → 호버 검정
 *   dark      — 검정 → 호버 회색
 *   accent    — 주황 → 호버 검정
 *
 * Sizes: sm / md / lg
 *
 * `href` 가 주어지면 next-intl Link, 아니면 button.
 */
import { Link } from "@/i18n/navigation";
import type { ReactNode, ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type BtnBlockVariant = "primary" | "secondary" | "dark" | "accent";
export type BtnBlockSize = "sm" | "md" | "lg";

const variantClass: Record<BtnBlockVariant, string> = {
  primary:
    "bg-hero-void text-hero-fg border-border hover:bg-accent hover:border-accent hover:dark:text-white text-gray-900",
  secondary:
    "bg-card text-foreground border-border hover:bg-foreground hover:text-background",
  dark: "bg-hero-void text-hero-fg border-border hover:bg-muted hover:border-border",
  /* accent: 주황 배경은 라이트/다크 모두 동일 (브랜드 색). 텍스트는 항상 흰색 유지. */
  accent:
    "bg-accent dark:text-white text-gray-900 border-accent hover:bg-foreground hover:border-border hover:text-background hover:shadow-[0_0_32px_rgba(255,98,0,0.4)] active:scale-[0.98]",
};

const sizeClass: Record<BtnBlockSize, string> = {
  sm: "px-4 py-2 text-[11px]",
  md: "px-6 py-3 text-xs",
  lg: "px-8 py-4 text-sm",
};

type BaseProps = {
  variant?: BtnBlockVariant;
  size?: BtnBlockSize;
  className?: string;
  children: ReactNode;
  /** 툴팁(비활성 버튼 안내 등) — button / Link 모두 전달 */
  title?: string;
  "aria-label"?: string;
};

type LinkProps = BaseProps & {
  href: string;
  onClick?: never;
  type?: never;
  disabled?: never;
};

type ButtonProps = BaseProps & {
  href?: undefined;
} & Pick<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "onClick" | "type" | "disabled"
  >;

export function BtnBlock(props: LinkProps | ButtonProps) {
  const {
    variant = "primary",
    size = "md",
    className,
    children,
    title,
    "aria-label": ariaLabel,
  } = props;
  const cls = cn(
    "inline-flex items-center justify-center gap-2 border-2 font-display font-bold uppercase tracking-[0.18em] transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed",
    sizeClass[size],
    variantClass[variant],
    className,
  );

  if (props.href !== undefined) {
    return (
      <Link
        href={props.href}
        className={cls}
        title={title}
        aria-label={ariaLabel}
      >
        {children}
      </Link>
    );
  }
  return (
    <button
      type={props.type ?? "button"}
      onClick={props.onClick}
      disabled={props.disabled}
      className={cls}
      title={title}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}
