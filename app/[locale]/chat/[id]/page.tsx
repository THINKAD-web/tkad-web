import { getTranslations } from "next-intl/server";
import { ChatRoomClient } from "@/components/chat/chat-room-client";
import { Link } from "@/i18n/navigation";

export const metadata = {
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function ChatRoomPage({ params }: Props) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "chat" });

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link
        href="/chat"
        className="mb-4 inline-block text-sm text-muted-foreground hover:underline"
      >
        ← {t("backToInbox")}
      </Link>
      <ChatRoomClient roomId={id} />
    </main>
  );
}
