import type { ReactNode } from "react";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminShell from "../admin-shell";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionToken,
} from "@/lib/admin-session";

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function AdminDashboardLayout({ children, params }: Props) {
  const locale = await resolveLocaleParam(params);
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!verifyAdminSessionToken(token)) {
    redirect(`/${locale}/admin/login`);
  }
  return (
    <Suspense fallback={null}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
