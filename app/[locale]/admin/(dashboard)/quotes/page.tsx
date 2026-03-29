import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import AdminQuotesHubClient from "@/components/admin-quotes-hub-client";
import { resolveLocaleParam } from "@/lib/resolve-locale";

type Props = { params: Promise<{ locale: string }> };

export default async function AdminQuotesPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl py-16 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <AdminQuotesHubClient />
    </Suspense>
  );
}
