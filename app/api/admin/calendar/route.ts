import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import { buildIcalCalendar } from "@/lib/ical-calendar";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const db = getPrisma();
  const region = request.nextUrl.searchParams.get("region")?.trim() || "";
  const mediaId = request.nextUrl.searchParams.get("mediaId")?.trim() || "";
  const status = request.nextUrl.searchParams.get("status")?.trim() || "";
  const format = request.nextUrl.searchParams.get("format")?.trim() || "json";

  const campaigns = await db.campaign.findMany({
    where: {
      ...(status ? { status: status as never } : {}),
      startDate: { not: null },
      ...(mediaId
        ? {
            mediaBookings: {
              some: { mediaId },
            },
          }
        : {}),
      ...(region
        ? {
            mediaBookings: {
              some: { media: { region } },
            },
          }
        : {}),
    },
    orderBy: { startDate: "asc" },
    take: 500,
    select: {
      id: true,
      name: true,
      status: true,
      clientCompany: true,
      startDate: true,
      endDate: true,
      mediaBookings: {
        select: {
          mediaId: true,
          media: { select: { id: true, name: true, region: true, regionZone: true } },
        },
      },
      scheduleEvents: {
        select: {
          id: true,
          title: true,
          kind: true,
          startsAt: true,
          endsAt: true,
        },
      },
    },
  });

  const base = siteUrl.replace(/\/$/, "");
  const events = campaigns.flatMap((c) => {
    const regions = [
      ...new Set(
        c.mediaBookings.map((b) => b.media?.regionZone ?? b.media?.region).filter(Boolean),
      ),
    ];
    const out: Array<{
      id: string;
      campaignId: string;
      title: string;
      start: string;
      end: string;
      status: string;
      clientCompany: string;
      regions: string[];
      mediaNames: string[];
      adminUrl: string;
      kind: string;
    }> = [];

    if (c.startDate) {
      const end = c.endDate ?? new Date(c.startDate.getTime() + 7 * 86_400_000);
      out.push({
        id: `campaign-${c.id}`,
        campaignId: c.id,
        title: c.name,
        start: c.startDate.toISOString(),
        end: end.toISOString(),
        status: c.status,
        clientCompany: c.clientCompany,
        regions,
        mediaNames: c.mediaBookings.map((b) => b.media?.name).filter(Boolean) as string[],
        adminUrl: `${base}/ko/admin/campaigns`,
        kind: "campaign",
      });
    }

    for (const ev of c.scheduleEvents) {
      out.push({
        id: `event-${ev.id}`,
        campaignId: c.id,
        title: `${c.name} · ${ev.title}`,
        start: ev.startsAt.toISOString(),
        end: ev.endsAt.toISOString(),
        status: c.status,
        clientCompany: c.clientCompany,
        regions,
        mediaNames: [],
        adminUrl: `${base}/ko/admin/campaigns`,
        kind: ev.kind,
      });
    }
    return out;
  });

  if (format === "ical") {
    const ical = buildIcalCalendar(
      "THINKAD Campaigns",
      events.map((e) => ({
        uid: `${e.id}@thinkad.co.kr`,
        title: e.title,
        description: `${e.clientCompany} · ${e.status}`,
        start: new Date(e.start),
        end: new Date(e.end),
        url: e.adminUrl,
      })),
    );
    return new Response(ical, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="thinkad-campaigns.ics"',
      },
    });
  }

  const regions = [
    ...new Set(
      campaigns.flatMap((c) =>
        c.mediaBookings.map((b) => b.media?.region).filter(Boolean),
      ),
    ),
  ] as string[];

  return json({
    events,
    regions,
    total: events.length,
  });
}
