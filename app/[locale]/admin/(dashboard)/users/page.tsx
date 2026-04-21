// app/[locale]/admin/(dashboard)/users/page.tsx
// 설명: Admin 사용자 관리 페이지 (role 변경 가능)
// 주요 기능: 검색(이메일·이름·회사), role 필터, role 드롭다운 변경

import UsersAdminClient from "./users-admin-client";

export const dynamic = "force-dynamic";

export default function AdminUsersPage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold text-slate-900">사용자 관리</h1>
        <p className="mt-1 text-sm text-slate-500">
          가입된 광고주·대행사·매체사 계정 조회. 역할 변경 시 즉시 권한이 바뀝니다.
        </p>
      </header>
      <UsersAdminClient />
    </div>
  );
}
