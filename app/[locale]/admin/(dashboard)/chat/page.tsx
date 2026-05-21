import { AdminChatMonitor } from "@/components/admin/admin-chat-monitor";
import { AdminSupportChatLogs } from "@/components/admin/admin-support-chat-logs";

export const dynamic = "force-dynamic";

export default function AdminChatPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-black">익명 채팅 모니터링</h1>
        <p className="text-sm text-muted-foreground">
          광고주·매체사 실명과 전체 대화 로그(분쟁 증거)를 확인합니다.
        </p>
      </div>
      <AdminChatMonitor />
      <AdminSupportChatLogs />
    </div>
  );
}
