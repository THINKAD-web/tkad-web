/**
 * BtnBlock — 브루탈리스트 사각 버튼.
 *
 * 스펙(v2):
 *   - padding 18px 24px 고정 (단일 사이즈)
 *   - 2px 보더, 모노 13px 600 대문자
 *   - 4 variants:
 *       primary   — 검정 → 호버 주황
 *       secondary — 흰 → 호버 검정+흰글자
 *       dark      — 검정 → 호버 주황
 *       accent    — 주황 → 호버 검정
 *   - 우측 ArrowRight 아이콘 (lucide-react). icon=false 로 숨길 수 있음.
 *   - 스택 사용 시: `stack` prop true → margin-bottom: -2px (보더 겹침)
 *
 * `href` 가 주어지면 next-intl Link, 아니면 button.
 */
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import type { ReactNode, ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type BtnBlockVariant = "primary" | "secondary" | "dark" | "accent";

const variantClass: Record<BtnBlockVariant, string> = {
  primary:
    "bg-bx-black text-bx-white border-bx-black hover:bg-bx-accent hover:border-bx-accent",
  secondary:
    "bg-bx-white text-bx-black border-bx-black hover:bg-bx-black hover:text-bx-white",
  dark: "bg-bx-black text-bx-white border-bx-black hover:bg-bx-accent hover:border-bx-accent",
  accent:
    "bg-bx-accent text-bx-white border-bx-accent hover:bg-bx-black hover:border-bx-black",
};

type BaseProps = {
  variant?: BtnBlockVariant;
  /** 우측 ArrowRight 아이콘 표시 (기본 true) */
  icon?: boolean;
  /** 스택형 사용 시 다음 버튼과 보더 겹치게 (기본 false) */
  stack?: boolean;
  className?: string;
  children: ReactNode;
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
    icon = true,
    stack = false,
    className,
    children,
  } = props;
  const cls = cn(
    "inline-flex items-center justify-center gap-3 border-2 px-6 py-[18px] font-mono text-[13px] font-semibold uppercase tracking-[0.18em] transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed",
    variantClass[variant],
    stack && "-mb-[2px]",
    className,
  );

  const inner = (
    <>
      <span className="inline-flex items-center">{children}</span>
      {icon ? <ArrowRight className="h-4 w-4 shrink-0" aria-hidden /> : null}
    </>
  );

  if (props.href !== undefined) {
    return (
      <Link href={props.href} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button
      type={props.type ?? "button"}
      onClick={props.onClick}
      disabled={props.disabled}
      className={cls}
    >
      {inner}
    </button>
  );
}
