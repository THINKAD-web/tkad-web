import { PageHeaderSkeleton } from "@/components/skeletons";

/**
 * Contact loading.tsx — Hero + 폼 영역 placeholder.
 * 이전엔 null 이라 흰 화면이 잠시 보였음.
 */
export default function ContactLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <section className="bg-bx-white py-12 dark:bg-bx-black">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="border-2 border-bx-black bg-bx-white p-6 dark:border-bx-white dark:bg-bx-black">
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-11 w-full animate-pulse bg-bx-off dark:bg-bx-gray-dim/30"
                />
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
