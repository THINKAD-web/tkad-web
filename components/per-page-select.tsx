"use client";

import { useTranslations } from "next-intl";

type Props = {
  value: number;
  onChange: (next: number) => void;
};

export function PerPageSelect({ value, onChange }: Props) {
  const t = useTranslations("media");

  return (
    <label className="inline-flex items-center gap-2 rounded-full border border-navy/10 bg-white px-3 py-1.5 text-xs font-medium text-navy">
      <span className="text-muted-foreground">{t("perPage")}</span>
      <select
        className="rounded-md border border-navy/15 bg-slate-50 px-2 py-0.5 text-xs font-semibold"
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

