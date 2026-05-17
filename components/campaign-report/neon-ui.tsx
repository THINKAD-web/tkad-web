import { CONTACT_EMAIL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { forwardRef, type ReactNode } from "react";

const reportPanelShell =
  "tkad-glass-surface overflow-hidden rounded-[22px] border border-[color:var(--cr-border)] bg-[var(--cr-surface)] backdrop-blur-md";

/** Chart / panel shell — shared by preview inline sections */
export function ReportPanel({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(reportPanelShell, className)}>
      <div className="border-b border-[color:var(--cr-border-soft)] px-4 py-3">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--cr-fg-subtle)]">
          [ {title} ]
        </p>
      </div>
      <div className="p-4 text-[color:var(--cr-fg)]">{children}</div>
    </div>
  );
}

export const CampaignReportDocument = forwardRef<
  HTMLDivElement,
  { children: ReactNode; className?: string }
>(function CampaignReportDocument({ children, className }, ref) {
  return (
    <div
      ref={ref}
      className={cn(
        "campaign-report-document tkad-planner-neon relative overflow-hidden rounded-[26px] border border-[color:var(--cr-border)] bg-[var(--cr-bg)] font-sans text-[color:var(--cr-fg)] shadow-[var(--cr-shadow)]",
        className,
      )}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[var(--cr-grid-opacity)] tkad-neon-grid" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[image:var(--cr-overlay)]"
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
    <section className="relative overflow-hidden border-b border-[color:var(--cr-border-soft)] px-6 py-8 sm:px-10 sm:py-10">
      <div aria-hidden className="absolute inset-0 tkad-neon-depth opacity-50" />
      <div className="relative flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--cr-accent)]">
            [ THINKAD · 싱커드 ]
          </p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--cr-fg-subtle)]">
            {`// `}OOH 광고 게재 완료 보고서
          </p>
          <h1 className="mt-4 text-balance text-2xl font-[950] leading-tight tracking-[-0.04em] text-[color:var(--cr-fg)] sm:text-3xl">
            {campaignName || "캠페인명"}
          </h1>
          <p className="mt-2 text-sm text-[color:var(--cr-fg-soft)]">{clientLine}</p>
        </div>
        <div className="shrink-0 text-right">
          <span className="tkad-neon-border inline-block rounded-2xl bg-[var(--cr-surface)] px-3 py-1.5 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--cr-fg)] backdrop-blur">
            [ {status || "—"} ]
          </span>
          <p className="mt-2 font-mono text-[10px] tracking-[0.18em] text-[color:var(--cr-fg-muted)]">
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
    <h2 className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--cr-accent)]">
      [ {children} ]
    </h2>
  );
}

export function SectionNote({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 font-mono text-[10px] leading-relaxed text-[color:var(--cr-fg-muted)]">
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
      ? "border-[color:var(--cr-stat-accent-border)] bg-[image:var(--cr-stat-accent)] text-[color:var(--cr-accent)]"
      : variant === "muted"
        ? "border-[color:var(--cr-border-faint)] bg-[var(--cr-surface-soft)] text-[color:var(--cr-fg-soft)]"
        : "tkad-glass-surface-soft border-[color:var(--cr-border-soft)] bg-[var(--cr-surface)] text-[color:var(--cr-fg)]";
  return (
    <div className={cn("rounded-[18px] border p-3.5 backdrop-blur-md", shell, className)}>
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--cr-fg-muted)]">
        [ {label} ]
      </p>
      <p
        className={cn(
          "mt-1.5 font-mono text-xl font-extrabold tabular-nums",
          variant === "accent" ? "text-[color:var(--cr-accent)]" : "text-[color:var(--cr-fg)]",
        )}
      >
        {value}
        {suffix ? (
          <span className="ml-1 text-xs font-bold text-[color:var(--cr-fg-dim)]">{suffix}</span>
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
    <ReportPanel title={title} className={className}>
      {children}
    </ReportPanel>
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
    <span className="inline-flex rounded-full border border-[color:var(--cr-accent-border)] bg-[var(--cr-accent-surface)] px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[color:var(--cr-accent)]">
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
    <div className={cn("tkad-glass-surface-soft rounded-[18px] border border-[color:var(--cr-border-soft)] bg-[var(--cr-surface)] p-3.5 backdrop-blur-md", className)}>
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--cr-fg-muted)]">
        [ {label} ]
      </p>
      <p
        className={cn(
          "mt-1.5 text-sm font-semibold text-[color:var(--cr-fg)]",
          variant === "accent" && "font-mono text-base font-extrabold text-[color:var(--cr-accent)]",
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
        <p className="px-1 font-mono text-[10px] text-[color:var(--cr-fg-dim)]">{`// `}{footnote}</p>
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
          className="relative overflow-hidden rounded-[14px] border border-[color:var(--cr-border)] bg-[var(--cr-surface)]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={x.url}
            alt=""
            crossOrigin="anonymous"
            className="block h-24 w-full object-cover"
          />
          <span className="absolute left-0 top-0 rounded-br-[10px] border border-[color:var(--cr-border)] bg-[var(--cr-thumb-badge-bg)] px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[color:var(--cr-accent)] backdrop-blur">
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
    <div className="overflow-x-auto rounded-[18px] border border-[color:var(--cr-border)] bg-[var(--cr-surface-soft)] backdrop-blur-sm">
      <table className="w-full min-w-[640px] border-collapse text-[11px]">
        <thead>
          <tr className="border-b border-[color:var(--cr-border-soft)] bg-[var(--cr-surface)]">
            {headers.map((h) => (
              <th
                key={h}
                className="px-3 py-2.5 text-left font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[color:var(--cr-accent)]"
              >
                [ {h} ]
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[color:var(--cr-border-soft)] text-[color:var(--cr-fg-table)]">{children}</tbody>
      </table>
    </div>
  );
}

export function NotesBox({ children }: { children: ReactNode }) {
  return (
    <p className="whitespace-pre-wrap rounded-[18px] border border-[color:var(--cr-border)] bg-[var(--cr-surface)] p-4 text-sm leading-relaxed text-[color:var(--cr-fg-body)] backdrop-blur-sm">
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
    <div className="rounded-[14px] border border-[color:var(--cr-border-soft)] bg-[var(--cr-surface)] p-3 backdrop-blur-sm">
      <div className="mb-2 flex justify-between gap-2 text-[11px]">
        <span className="font-semibold text-[color:var(--cr-fg)]">{label}</span>
        <span className="font-mono tabular-nums text-[color:var(--cr-fg-subtle)]">
          {count}개 · {pct}%
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full border border-[color:var(--cr-border-soft)] bg-[var(--cr-bar-track)]">
        <div
          className={cn(
            "h-full rounded-full",
            highlight
              ? "bg-[image:var(--cr-timeline-bar)]"
              : "bg-[var(--cr-bar)]",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function ReportFooter() {
  return (
    <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--cr-border-soft)] pt-6">
      <div>
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--cr-fg-soft)]">
          [ THINKAD · 싱커드 ]
        </p>
        <p className="mt-1 font-mono text-[10px] text-[color:var(--cr-fg-dim)]">
          {`// `}
          {CONTACT_EMAIL} · 02-515-2772 · 서울특별시 성동구
        </p>
      </div>
      <p className="font-mono text-[10px] text-[color:var(--cr-fg-dim)]">{`// `}© 2026 THINKAD</p>
    </footer>
  );
}
