import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { CreativesShell } from "@/components/creatives/creatives-shell";
import { PlaylistEditor } from "@/components/creatives/playlist-editor";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-session";
import type {
  PlaylistDetail,
  PlaylistSchedule,
} from "@/lib/creatives/types";

export const dynamic = "force-dynamic";

export default async function EditPlaylistPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const isKo = locale === "ko";

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/${locale}/login?redirect=/creatives/playlists/${id}`);
  }

  const row = await prisma.creativePlaylist.findFirst({
    where: { id, userId: user.id, deletedAt: null },
    include: {
      items: {
        orderBy: [{ order: "asc" }],
        include: {
          creative: {
            select: {
              id: true,
              name: true,
              type: true,
              url: true,
              thumbnailUrl: true,
              duration: true,
            },
          },
        },
      },
    },
  });
  if (!row) notFound();

  const detail: PlaylistDetail = {
    id: row.id,
    name: row.name,
    description: row.description,
    schedule: (row.scheduleJson as unknown as PlaylistSchedule | null) ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    items: row.items.map((it) => ({
      id: it.id,
      creativeId: it.creativeId,
      durationSec: it.durationSec,
      order: it.order,
      creative: {
        id: it.creative.id,
        name: it.creative.name,
        type: it.creative.type,
        url: it.creative.url,
        thumbnailUrl: it.creative.thumbnailUrl,
        duration: it.creative.duration,
      },
    })),
  };

  return (
    <CreativesShell
      eyebrow={`[ ${isKo ? "플레이리스트 편집" : "Edit Playlist"} ]`}
      title={detail.name}
      description={
        detail.description ?? (isKo ? "플레이리스트 구성과 스케줄 규칙을 편집합니다." : "Edit items and schedule rules.")
      }
      showBackToLibrary
      isKo={isKo}
    >
      <PlaylistEditor initial={detail} />
    </CreativesShell>
  );
}
