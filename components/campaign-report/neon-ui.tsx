import { CONTACT_EMAIL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { forwardRef, type ReactNode } from "react";

export const CampaignReportDocument = forwardRef<
  HTMLDivElement,
  { children: ReactNode; className?: string }
>(function CampaignReportDocument({ children, className }, ref) {
  return (
    <div
      ref={ref}
      className={cn(
        "campaign-report-document tkad-planner-neon relative overflow-hidden rounded-[26px] border border-white/12 bg-[#05050a] font-sans text-white shadow-[0_32px_120px_rgba(0,0,0,0.55)]",
        className,
      )}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.12] tkad-neon-grid" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(5,5,10,0.2),rgba(5,5,10,0.85))]"
      />
      <div className="relative">{children}</div>
    </div>
  );
});

export function CampaignReportHero({
  campaignName,
  clientLine,
  status,
}: {
  campaignName: string;
  clientLine: string;
  status: string;
}) {
  return (
    <section className="relative overflow-hidden border-b border-white/10 px-6 py-8 sm:px-10 sm:py-10">
      <div aria-hidden className="absolute inset-0 tkad-neon-depth opacity-50" />
      <div className="relative flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[#22d3ee]">
            [ THINKAD · 싱커드 ]
          </p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-white/55">
            {`// `}OOH 광고 게재 완료 보고서
          </p>
          <h1 className="mt-4 text-balance text-2xl font-[950] leading-tight tracking-[-0.04em] text-white sm:text-3xl">
            {campaignName || "캠페인명"}
          </h1>
          <p className="mt-2 text-sm text-white/75">{clientLine}</p>
        </div>
        <div className="shrink-0 text-right">
          <span className="tkad-neon-border inline-block rounded-2xl bg-white/5 px-3 py-1.5 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-white/90 backdrop-blur">
            [ {status || "—"} ]
          </span>
          <p className="mt-2 font-mono text-[10px] tracking-[0.18em] text-white/50">
            {`// `}발행일 {new Date().toLocaleDateString("ko-KR")}
          </p>
        </div>
      </div>
    </section>
  );
}

export function ReportBody({ children }: { children: ReactNode }) {
  return <div className="px-6 py-8 sm:px-10 sm:py-10">{children}</div>;
}

export function ReportSection({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={cn("mb-8 last:mb-0", className)}>{children}</section>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[#22d3ee]">
      [ {children} ]
    </h2>
  );
}

export function SectionNote({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 font-mono text-[10px] leading-relaxed text-white/50">
      {`// `}
      {children}
    </p>
  );
}

export type StatVariant = "default" | "accent" | "muted";

export function StatGrid({
  children,
  cols = 3,
  className,
}: {
  children: ReactNode;
  cols?: 2 | 3 | 4;
  className?: string;
}) {
  const colClass =
    cols === 4
      ? "sm:grid-cols-2 lg:grid-cols-4"
      : cols === 2
        ? "sm:grid-cols-2"
        : "sm:grid-cols-2 lg:grid-cols-3";
  return <div className={cn("grid grid-cols-1 gap-3", colClass, className)}>{children}</div>;
}

export function StatCard({
  label,
  value,
  suffix,
  variant = "default",
  className,
}: {
  label: string;
  value: ReactNode;
  suffix?: ReactNode;
  variant?: StatVariant;
  className?: string;
}) {
  const shell =
    variant === "accent"
      ? "border-[#22d3ee]/30 bg-[linear-gradient(135deg,rgba(34,211,238,0.16),rgba(168,85,247,0.12))] text-[#22d3ee]"
      : variant === "muted"
        ? "border-white/8 bg-white/[0.03] text-white/80"
        : "tkad-glass-surface-soft border-white/10 bg-white/5 text-white";
  return (
    <div className={cn("rounded-[18px] border p-3.5 backdrop-blur-md", shell, className)}>
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/50">
        [ {label} ]
      </p>
      <p
        className={cn(
          "mt-1.5 font-mono text-xl font-extrabold tabular-nums",
          variant === "accent" ? "text-[#22d3ee]" : "text-white",
        )}
      >
        {value}
        {suffix ? (
          <span className="ml-1 text-xs font-bold text-white/45">{suffix}</span>
        ) : null}
      </p>
    </div>
  );
}

export function ChartCard({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "tkad-glass-surface overflow-hidden rounded-[22px] border border-white/12 bg-white/5 backdrop-blur-md",
        className,
      )}
    >
      <div className="border-b border-white/10 px-4 py-3">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/55">
          [ {title} ]
        </p>
      </div>
      <div className="p-4 text-foreground">{children}</div>
    </div>
  );
}

export function ChartGrid({
  children,
  cols = 2,
}: {
  children: ReactNode;
  cols?: 2 | 3;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3",
        cols === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2",
      )}
    >
      {children}
    </div>
  );
}

export function NeonBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-[#22d3ee]/35 bg-[#22d3ee]/15 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[#22d3ee]">
      {children}
    </span>
  );
}

export function InfoGrid({
  children,
  cols = 2,
}: {
  children: ReactNode;
  cols?: 2 | 3;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3",
        cols === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2",
      )}
    >
      {children}
    </div>
  );
}

export function InfoCell({
  label,
  children,
  variant = "default",
  className,
}: {
  label: string;
  children: ReactNode;
  variant?: StatVariant;
  className?: string;
}) {
  return (
    <div className={cn("tkad-glass-surface-soft rounded-[18px] border border-white/10 bg-white/5 p-3.5 backdrop-blur-md", className)}>
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/50">
        [ {label} ]
      </p>
      <p
        className={cn(
          "mt-1.5 text-sm font-semibold text-white",
          variant === "accent" && "font-mono text-base font-extrabold text-[#22d3ee]",
        )}
      >
        {children}
      </p>
    </div>
  );
}

export function StatCardFootnote({
  label,
  value,
  suffix,
  footnote,
  variant = "default",
  className,
}: {
  label: string;
  value: ReactNode;
  suffix?: ReactNode;
  footnote?: string;
  variant?: StatVariant;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <StatCard label={label} value={value} suffix={suffix} variant={variant} />
      {footnote ? (
        <p className="px-1 font-mono text-[10px] text-white/45">{`// `}{footnote}</p>
      ) : null}
    </div>
  );
}

export function ThumbGrid({
  items,
}: {
  items: { url: string; tag: string }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((x, i) => (
        <div
          key={`${x.tag}-${i}`}
          className="relative overflow-hidden rounded-[14px] border border-white/12 bg-white/5"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={x.url}
            alt=""
            crossOrigin="anonymous"
            className="block h-24 w-full object-cover"
          />
          <span className="absolute left-0 top-0 rounded-br-[10px] border border-white/12 bg-[#05050a]/85 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[#22d3ee] backdrop-blur">
            [ {x.tag} ]
          </span>
        </div>
      ))}
    </div>
  );
}

export function NeonTable({
  headers,
  children,
}: {
  headers: string[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-[18px] border border-white/12 bg-white/[0.03] backdrop-blur-sm">
      <table className="w-full min-w-[640px] border-collapse text-[11px]">
        <thead>
          <tr className="border-b border-white/10 bg-white/5">
            {headers.map((h) => (
              <th
                key={h}
                className="px-3 py-2.5 text-left font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[#22d3ee]"
              >
                [ {h} ]
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10 text-white/90">{children}</tbody>
      </table>
    </div>
  );
}

export function NotesBox({ children }: { children: ReactNode }) {
  return (
    <p className="whitespace-pre-wrap rounded-[18px] border border-white/12 bg-white/5 p-4 text-sm leading-relaxed text-white/85 backdrop-blur-sm">
      {children}
    </p>
  );
}

export function DistBar({
  label,
  count,
  pct,
  highlight,
}: {
  label: string;
  count: number;
  pct: number;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-[14px] border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
      <div className="mb-2 flex justify-between gap-2 text-[11px]">
        <span className="font-semibold text-white">{label}</span>
        <span className="font-mono tabular-nums text-white/55">
          {count}개 · {pct}%
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full border border-white/10 bg-white/10">
        <div
          className={cn(
            "h-full rounded-full",
            highlight
              ? "bg-[linear-gradient(90deg,#22d3ee,#a855f7)]"
              : "bg-white/70",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function ReportFooter() {
  return (
    <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6">
      <div>
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white/80">
          [ THINKAD · 싱커드 ]
        </p>
        <p className="mt-1 font-mono text-[10px] text-white/45">
          {`// `}
          {CONTACT_EMAIL} · 02-515-2772 · 서울특별시 성동구
        </p>
      </div>
      <p className="font-mono text-[10px] text-white/45">{`// `}© 2026 THINKAD</p>
    </footer>
  );
}
