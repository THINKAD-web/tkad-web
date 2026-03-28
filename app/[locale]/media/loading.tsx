import { MediaCardSkeletonGrid } from "@/components/media-card-skeleton";

export default function MediaLoading() {
  return (
    <>
      <section className="bg-navy py-16">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mx-auto h-9 w-48 animate-pulse rounded bg-white/20" />
          <div className="mx-auto mt-3 h-5 w-72 animate-pulse rounded bg-white/10" />
        </div>
      </section>
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <MediaCardSkeletonGrid count={6} />
        </div>
      </section>
    </>
  );
}
