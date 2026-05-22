import AdminPointsClient from "./admin-points-client";

export const dynamic = "force-dynamic";

export default function AdminPointsPage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold text-foreground">포인트 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          사용자별 잔액 조회, 수동 조정, 이벤트 일괄 지급, 포인트 통계
        </p>
      </header>
      <AdminPointsClient />
    </div>
  );
}
