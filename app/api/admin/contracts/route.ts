import { NextRequest } from "next/server";
import { OohContractStatus } from "@prisma/client";
import { assertAdminDb, json } from "@/lib/admin-guard";
import {
  adminContractsBaseWhere,
  buildAdminContractsListWhere,
  monthRangeUtc,
  type AdminContractsFilterStatus,
} from "@/lib/admin-contracts-list";
import { getPrisma } from "@/lib/prisma";
import { serializeOoHQuotePublic } from "@/lib/ooh-quote";

export const dynamic = "force-dynamic";

const CONTRACT_STATUS_FILTERS = new Set<AdminContractsFilterStatus>([
  "all",
  "pending",
  "signed",
]);

function parseDateParam(raw: string | null): Date | undefined {
  if (!raw?.trim()) return undefined;
  const d = new Date(`${raw.trim()}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export async function GET(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const { searchParams } = new URL(request.url);
  const contractStatusRaw = (searchParams.get("contractStatus")?.trim() ??
    "all") as AdminContractsFilterStatus;
  const contractStatus = CONTRACT_STATUS_FILTERS.has(contractStatusRaw)
    ? contractStatusRaw
    : "all";
  const dateFrom = parseDateParam(searchParams.get("dateFrom"));
  const dateTo = parseDateParam(searchParams.get("dateTo"));
  const search = searchParams.get("search")?.trim() ?? "";
  const take = Math.min(Number(searchParams.get("take") ?? 200) || 200, 500);

  const db = getPrisma();
  const listWhere = buildAdminContractsListWhere({
    contractStatus,
    dateFrom,
    dateTo,
    search,
  });
  const baseWhere = adminContractsBaseWhere();
  const { start: monthStart, end: monthEnd } = monthRangeUtc();

  const [rows, pendingCount, signedCount, monthAgg] = await Promise.all([
    db.ooHQuote.findMany({
      where: listWhere,
      orderBy: [{ oohContract: { signedAt: "desc" } }, { updatedAt: "desc" }],
      take,
      include: {
        oohContract: {
          select: {
            id: true,
            status: true,
            signedAt: true,
          },
        },
      },
    }),
    db.ooHQuote.count({
      where: {
        ...baseWhere,
        oohContract: { is: { status: OohContractStatus.pending } },
      },
    }),
    db.ooHQuote.count({
      where: {
        ...baseWhere,
        oohContract: {
          is: {
            status: {
              in: [OohContractStatus.signed, OohContractStatus.confirmed],
            },
          },
        },
      },
    }),
    db.ooHQuote.aggregate({
      where: {
        ...baseWhere,
        oohContract: {
          is: {
            status: {
              in: [OohContractStatus.signed, OohContractStatus.confirmed],
            },
            signedAt: { gte: monthStart, lt: monthEnd },
          },
        },
      },
      _count: true,
      _sum: { totalAmount: true },
    }),
  ]);

  return json({
    kpi: {
      pendingCount,
      signedCount,
      thisMonthCount: monthAgg._count,
      thisMonthAmountManwon: monthAgg._sum.totalAmount ?? 0,
    },
    contracts: rows.map((row) => {
      const contract = row.oohContract!;
      const serialized = serializeOoHQuotePublic(row, contract);
      return {
        quoteId: row.id,
        contractId: contract.id,
        clientName: row.clientName,
        clientCompany: row.clientCompany,
        clientEmail: row.clientEmail,
        totalAmount: row.totalAmount,
        period: row.period,
        startDate: row.startDate?.toISOString() ?? null,
        endDate: row.endDate?.toISOString() ?? null,
        quoteStatus: row.status,
        contractStatus: contract.status,
        contractSigned: serialized.contractSigned,
        signedAt: contract.signedAt?.toISOString() ?? null,
        updatedAt: row.updatedAt.toISOString(),
      };
    }),
    total: rows.length,
  });
}
