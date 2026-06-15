import { NextRequest } from "next/server";
import { fetchFilteredNetworkCatalogItems } from "@/lib/network-media-catalog";
import { countNetworkCatalog } from "@/lib/network-media-catalog";
import { parsePublicNetworkQuery } from "@/lib/public-network-query";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = parsePublicNetworkQuery(request.nextUrl.searchParams);
  const page = params.page ?? 1;
  const limit = params.limit ?? 24;
  const skip = (page - 1) * limit;

  try {
    const [data, total] = await Promise.all([
      fetchFilteredNetworkCatalogItems({
        sort: params.sort ?? "popular",
        limit,
        skip,
        networkType: params.networkType,
        regionMain: params.regionMain,
        regionSub: params.regionSub,
        q: params.q,
      }),
      countNetworkCatalog({
        networkType: params.networkType,
        regionMain: params.regionMain,
        regionSub: params.regionSub,
        q: params.q,
      }),
    ]);

    return Response.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (e) {
    console.error("[api/public/media-network]", e);
    return Response.json({ error: "Failed to fetch networks" }, { status: 500 });
  }
}
