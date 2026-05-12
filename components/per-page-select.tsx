"use client";

import { useTranslations } from "next-intl";

type Props = {
  value: number;
  onChange: (next: number) => void;
};

export function PerPageSelect({ value, onChange }: Props) {
  const t = useTranslations("media");

  return (
    <label className="inline-flex items-center gap-2 border-2 border-border bg-card px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-foreground">
      <span className="text-muted-foreground">{t("perPage")}</span>
      <select
        className="border-l-2 border-border bg-card pl-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-foreground focus:outline-none"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        <option value={12}>12</option>
        <option value={24}>24</option>
        <option value={48}>48</option>
      </select>
    </label>
  );
}
