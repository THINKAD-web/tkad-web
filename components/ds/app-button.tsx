"use client";

import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const appButtonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap transition-ui duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--qp-accent)]/35 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-[color:var(--qp-accent)] text-white shadow-sm hover:opacity-90 active:scale-[0.98]",
        secondary:
          "border border-gray-200 bg-white/90 text-gray-900 hover:bg-gray-50 dark:border-white/12 dark:bg-white/5 dark:text-white dark:hover:bg-white/10",
        ghost:
          "text-gray-800 hover:bg-gray-100 dark:text-white/85 dark:hover:bg-white/10",
        danger:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/30",
        link: "h-auto p-0 text-[color:var(--qp-accent)] underline-offset-4 hover:underline shadow-none",
        block:
          "rounded-none border-2 font-mono uppercase tracking-[0.12em] bg-[color:var(--qp-accent)] text-white border-[color:var(--qp-accent)] hover:opacity-90",
      },
      size: {
        sm: "h-8 px-3 text-xs rounded-lg",
        md: "h-10 px-4 text-sm rounded-xl",
        lg: "h-11 px-6 text-sm rounded-xl",
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      fullWidth: false,
    },
  },
);

type VariantPropsAll = VariantProps<typeof appButtonVariants>;

type AppButtonBaseProps = VariantPropsAll & {
  className?: string;
  loading?: boolean;
  children: React.ReactNode;
};

type AppButtonAsButton = AppButtonBaseProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
    href?: undefined;
    asChild?: false;
  };

type AppButtonAsChild = AppButtonBaseProps & {
  href?: undefined;
  asChild: true;
  children: React.ReactElement;
};

type AppButtonAsLink = AppButtonBaseProps & {
  href: string;
  asChild?: false;
};

export type AppButtonProps = AppButtonAsButton | AppButtonAsChild | AppButtonAsLink;

export function AppButton(props: AppButtonProps) {
  const {
    className,
    variant,
    size,
    fullWidth,
    loading,
    children,
    ...rest
  } = props;

  const classes = cn(appButtonVariants({ variant, size, fullWidth }), className);

  if ("href" in props && props.href) {
    return (
      <Link
        href={props.href}
        className={classes}
        aria-busy={loading || undefined}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : null}
        {children}
      </Link>
    );
  }

  if ("asChild" in props && props.asChild) {
    return (
      <Slot className={classes} aria-busy={loading || undefined}>
        {children}
      </Slot>
    );
  }

  const buttonProps = rest as React.ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button
      type="button"
      {...buttonProps}
      className={classes}
      disabled={buttonProps.disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : null}
      {children}
    </button>
  );
}
