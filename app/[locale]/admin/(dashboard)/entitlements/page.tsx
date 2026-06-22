import { EntitlementsMatrixView } from "@/components/admin/entitlements-matrix";
import { buildEntitlementsMatrix } from "@/lib/entitlements/matrix";
import { resolveLocaleParam } from "@/lib/resolve-locale";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export default async function AdminEntitlementsPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  const matrix = buildEntitlementsMatrix(isKo);

  return (
    <div className="space-y-8 p-6">
      <header>
        <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
          [ OPS / ENTITLEMENTS ]
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          {isKo ? "회원 등급 권한" : "Membership entitlements"}
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          {isKo
            ? "lib/entitlements 단일 소스를 읽기 전용으로 표시합니다. 권한 변경은 코드에서만 — 이 화면은 확인용입니다."
            : "Read-only view of lib/entitlements. Change entitlements in code only — this page is for verification."}
        </p>
      </header>

      <EntitlementsMatrixView matrix={matrix} isKo={isKo} />
    </div>
  );
}
