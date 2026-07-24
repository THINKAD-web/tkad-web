import { redirect } from "next/navigation";
import { readSsoPendingCookie } from "@/lib/sso/pending-cookie";

type Props = { params: Promise<{ locale: string }> };

/**
 * After login (email/OAuth), resume SSO issue with stashed returnTo+state.
 * Keeps OAuth callbackUrl on a locale page path (not /api/...).
 */
export default async function SsoContinuePage({ params }: Props) {
  const { locale } = await params;
  const pending = await readSsoPendingCookie();
  if (!pending) {
    redirect(`/${locale}/login?redirect=/my`);
  }

  const q = new URLSearchParams({
    returnTo: pending.returnTo,
    state: pending.state,
    locale: pending.locale || locale,
  });
  // Cookie cleared on successful issue; leave it if issue redirects to login again.
  redirect(`/api/sso/issue?${q.toString()}`);
}
