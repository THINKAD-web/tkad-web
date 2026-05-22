type SpinnerProps = {
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
};

const SIZE: Record<NonNullable<SpinnerProps["size"]>, string> = {
  sm: "h-4 w-4 border-2",
  md: "h-5 w-5 border-2",
  lg: "h-8 w-8 border-2",
};

export function Spinner({ size = "md", label, className = "" }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-2 ${className}`}
    >
      <span
        className={`${SIZE[size]} animate-spin rounded-full border-border border-t-primary`}
      />
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
    </div>
  );
}

export function FullPageSpinner({ label = "불러오는 중…" }: { label?: string }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Spinner size="lg" label={label} />
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="ui-empty ui-card-light mx-auto max-w-md">
      {icon && (
        <div className="ui-empty-icon flex items-center justify-center text-4xl" aria-hidden>
          {icon}
        </div>
      )}
      <h3 className="ui-empty-title">{title}</h3>
      {description && (
        <p className="ui-empty-sub mt-2 max-w-sm">{description}</p>
      )}
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}
