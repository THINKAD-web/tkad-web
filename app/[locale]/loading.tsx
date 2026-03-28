export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-gold" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
