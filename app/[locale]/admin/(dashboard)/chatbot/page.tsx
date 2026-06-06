import { AdminChatbotDashboard } from "@/components/admin/admin-chatbot-dashboard";

export const dynamic = "force-dynamic";

export default function AdminChatbotPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-black">챗봇 로그</h1>
        <p className="text-sm text-muted-foreground">
          싱커드 AI 챗봇(공개)의 대화 로그·사용량을 확인합니다.
        </p>
      </div>
      <AdminChatbotDashboard />
    </div>
  );
}
