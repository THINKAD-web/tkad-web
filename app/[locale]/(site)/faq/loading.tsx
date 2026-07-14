export default function FaqLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#020202]">
      <div className="h-48 animate-pulse bg-[#05050a]" />
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
        <div className="h-11 animate-pulse rounded-xl bg-gray-200 dark:bg-white/10" />
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-8 w-16 animate-pulse rounded-full bg-gray-200 dark:bg-white/10"
            />
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-2xl bg-gray-200 dark:bg-white/10"
          />
        ))}
      </div>
    </div>
  );
}
