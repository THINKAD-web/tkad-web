"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import SolutionCtaModal from "@/components/solution-cta-modal";

type Props = {
  label: string;
  /**
   * 있으면 모달 없이 해당 경로로 이동 (로케일 접두 포함 라우팅).
   * 맞춤 제안·상담은 `/contact`, 매체 기반 견적은 `/quote` 등.
   */
  href?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "gold" | "outline";
  className?: string;
};

export default function SolutionCtaButton({
  label,
  href,
  size = "lg",
  variant = "gold",
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);

  const baseClass =
    variant === "gold"
      ? "bg-gold text-navy hover:bg-gold-dark font-bold shadow-lg shadow-gold/20 hover:shadow-xl hover:shadow-gold/30"
      : "border-gold/40 text-gold hover:bg-gold/10 hover:border-gold font-semibold";

  const mergedClass = `rounded-full ${baseClass} ${className}`;

  if (href) {
    return (
      <Button
        asChild
        size={size}
        variant={variant === "outline" ? "outline" : "default"}
        className={mergedClass}
      >
        <Link href={href}>
          <Sparkles className="mr-2 h-4 w-4" />
          {label}
        </Link>
      </Button>
    );
  }

  return (
    <>
      <Button
        size={size}
        variant={variant === "outline" ? "outline" : "default"}
        onClick={() => setOpen(true)}
        className={mergedClass}
      >
        <Sparkles className="mr-2 h-4 w-4" />
        {label}
      </Button>
      <SolutionCtaModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
