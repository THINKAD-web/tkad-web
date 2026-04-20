import MediaMapPageClient from "@/components/media-map/media-map-page-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function MediaMapPage() {
  return <MediaMapPageClient />;
}
