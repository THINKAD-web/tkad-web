"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import SolutionCtaModal from "@/components/solution-cta-modal";

type Props = {
  label: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "gold" | "outline";
  className?: string;
};

export default function SolutionCtaButton({
  label,
  size = "lg",
  variant = "gold",
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);

  const baseClass =
    variant === "gold"
      ? "bg-gold text-navy hover:bg-gold-dark font-bold shadow-lg shadow-gold/20 hover:shadow-xl hover:shadow-gold/30"
      : "border-gold/40 text-gold hover:bg-gold/10 hover:border-gold font-semibold";

  return (
    <>
      <Button
        size={size}
        variant={variant === "outline" ? "outline" : "default"}
        onClick={() => setOpen(true)}
        className={`rounded-full ${baseClass} ${className}`}
      >
        <Sparkles className="mr-2 h-4 w-4" />
        {label}
      </Button>
      <SolutionCtaModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
