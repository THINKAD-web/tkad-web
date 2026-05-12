import { MediaCardSkeletonGrid } from "@/components/skeletons";

export default function RecommendLoading() {
  return (
    <>
      <section className="bg-gradient-to-b from-hero-void via-hero-void to-[#0c0c10] py-20 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <div className="mx-auto h-4 w-36 animate-pulse bg-hermes/25" />
          <div className="mx-auto mt-3 h-3 w-52 animate-pulse bg-hero-fg/15" />
          <div className="mx-auto mt-8 h-11 w-full max-w-lg animate-pulse bg-hero-fg/10" />
          <div className="mx-auto mt-4 h-6 w-full max-w-md animate-pulse bg-hero-fg/10" />
        </div>
      </section>
      <section className="border-t-2 border-border bg-card py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 space-y-3">
            <div className="h-10 w-full max-w-2xl animate-pulse border-2 border-border bg-muted" />
            <div className="h-4 w-64 animate-pulse bg-muted" />
          </div>
          <MediaCardSkeletonGrid count={6} />
        </div>
      </section>
    </>
  );
}
