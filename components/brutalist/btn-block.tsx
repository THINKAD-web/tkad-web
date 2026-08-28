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
    "bg-hero-void text-hero-fg border-border hover:bg-accent hover:border-accent hover:text-white",
  secondary:
    "bg-card text-foreground border-border hover:bg-foreground hover:text-background",
  dark: "bg-hero-void text-hero-fg border-border hover:bg-muted hover:border-border",
  /* accent: 주황/보라 배경 — 라이트·다크 모두 흰색 텍스트. planner-neon day 에서 text-white 뒤집힘 방지. */
  accent:
    "tkad-qp-cta tkad-planner-wizard-btn-accent bg-[color:var(--qp-accent)] text-white border-[color:var(--qp-accent)] hover:bg-[color:var(--qp-accent-hover)] hover:border-[color:var(--qp-accent-hover)] hover:text-white active:scale-[0.98] disabled:!opacity-100 disabled:!bg-[color:var(--qp-accent)]/30 disabled:!text-white disabled:!border-[color:var(--qp-accent)]/25 disabled:!shadow-none",
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
  /** Option A page KEEP — primary conversion CTA keeps orange accent */
  "data-accent-keep"?: "true";
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
    "data-accent-keep": dataAccentKeep,
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
        data-accent-keep={dataAccentKeep}
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
      data-accent-keep={dataAccentKeep}
    >
      {children}
    </button>
  );
}
