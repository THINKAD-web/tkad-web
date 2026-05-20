import { AdminBiddingDetailClient } from "@/components/admin/admin-bidding-detail-client";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function AdminBiddingDetailPage({ params }: Props) {
  const { id } = await params;
  return <AdminBiddingDetailClient id={id} />;
}
