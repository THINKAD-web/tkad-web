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
    "bg-bx-black text-bx-white border-bx-black hover:bg-bx-accent hover:border-bx-accent hover:text-white",
  secondary:
    "bg-bx-white text-bx-black border-bx-black hover:bg-bx-black hover:text-bx-white",
  dark: "bg-bx-black text-bx-white border-bx-black hover:bg-bx-gray-dim hover:border-bx-gray-dim",
  /* accent: 주황 배경은 라이트/다크 모두 동일 (브랜드 색). 텍스트는 항상 흰색 유지. */
  accent:
    "bg-bx-accent text-white border-bx-accent hover:bg-bx-black hover:border-bx-black hover:text-bx-white",
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
    "inline-flex items-center justify-center gap-2 border-2 font-mono font-bold uppercase tracking-[0.18em] transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed",
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
