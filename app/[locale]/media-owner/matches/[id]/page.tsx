import { MediaOwnerMatchDetailClient } from "@/components/media-owner/media-owner-match-detail-client";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function MediaOwnerMatchDetailPage({ params }: Props) {
  const { id } = await params;
  return <MediaOwnerMatchDetailClient bidId={id} />;
}
