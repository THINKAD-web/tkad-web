"use client";

import { formatWon } from "@/lib/admin-campaign-builder/format";

type Props = {
  won: number;
  className?: string;
};

/** Thin wrapper — formatting logic lives in format.ts SSOT. */
export function PriceDisplay({ won, className }: Props) {
  return <span className={className}>{formatWon(won)}</span>;
}
