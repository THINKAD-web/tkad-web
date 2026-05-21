"use client";

import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { trackAbEvent } from "@/components/ab/ab-tracker";
import type { AbVariant } from "@/lib/ab-testing";

type Props = {
  variant: AbVariant;
  label: string;
  href: string;
  page?: string;
};

export function HomeHeroCta({ variant, label, href, page = "/" }: Props) {
  return (
    <Link
      href={href}
      data-ab-variant={variant}
      className="tkad-neon-cta inline-flex items-center gap-2 rounded-[14px] px-6 py-3 font-bold dark:text-white text-gray-900 transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a855f7] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      onClick={() => trackAbEvent("cta_click", page)}
    >
      {label}
      <ArrowRight className="h-4 w-4" aria-hidden />
    </Link>
  );
}
