import { AdminAiUsageDashboard } from "@/components/admin/admin-ai-usage-dashboard";

export const dynamic = "force-dynamic";

export default function AdminAiUsagePage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-black">AI 사용량</h1>
        <p className="text-sm text-muted-foreground">
          기능별 · 모델별 토큰 사용량과 추정 비용 (USD). 단가는 추정치입니다.
        </p>
      </div>
      <AdminAiUsageDashboard />
    </div>
  );
}
