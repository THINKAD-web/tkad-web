import { getTranslations } from "next-intl/server";
import { ChatInboxClient } from "@/components/chat/chat-inbox-client";
import { Link } from "@/i18n/navigation";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function ChatInboxPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ side?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const t = await getTranslations({ locale, namespace: "chat" });
  const side = sp.side === "owner" ? "owner" : "advertiser";

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-black tracking-tight">{t("inboxTitle")}</h1>
        <div className="flex gap-2 text-sm">
          <Link
            href="/chat"
            className={side === "advertiser" ? "font-bold underline" : "text-muted-foreground"}
          >
            {t("tabAdvertiser")}
          </Link>
          <Link
            href="/chat?side=owner"
            className={side === "owner" ? "font-bold underline" : "text-muted-foreground"}
          >
            {t("tabOwner")}
          </Link>
        </div>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">{t("inboxDesc")}</p>
      <ChatInboxClient side={side} />
    </main>
  );
}
