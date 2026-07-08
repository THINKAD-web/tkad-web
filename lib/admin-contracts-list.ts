import {
  OoHQuoteStatus,
  OohContractStatus,
  type Prisma,
} from "@prisma/client";

/** 부킹 확정 이후 — 계약 row 가 존재하는 견적만 대시보드 대상 */
export const ADMIN_CONTRACT_LIST_QUOTE_STATUSES: OoHQuoteStatus[] = [
  OoHQuoteStatus.booking_confirmed,
  OoHQuoteStatus.invoice_sent,
  OoHQuoteStatus.payment_pending,
  OoHQuoteStatus.payment_confirmed,
  OoHQuoteStatus.contract_confirmed,
  OoHQuoteStatus.in_progress,
  OoHQuoteStatus.completed,
];

export type AdminContractsFilterStatus = "all" | "pending" | "signed";

export type AdminContractsListFilter = {
  contractStatus?: AdminContractsFilterStatus;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
};

export function adminContractsBaseWhere(): Prisma.OoHQuoteWhereInput {
  return {
    status: { in: ADMIN_CONTRACT_LIST_QUOTE_STATUSES },
    oohContract: { isNot: null },
  };
}

export function buildAdminContractsListWhere(
  filter: AdminContractsListFilter,
): Prisma.OoHQuoteWhereInput {
  const contractWhere: Prisma.OohContractWhereInput = {};

  if (filter.contractStatus === "pending") {
    contractWhere.status = OohContractStatus.pending;
  } else if (filter.contractStatus === "signed") {
    contractWhere.status = {
      in: [OohContractStatus.signed, OohContractStatus.confirmed],
    };
  }

  if (filter.dateFrom || filter.dateTo) {
    contractWhere.signedAt = {};
    if (filter.dateFrom) contractWhere.signedAt.gte = filter.dateFrom;
    if (filter.dateTo) {
      const end = new Date(filter.dateTo);
      end.setHours(23, 59, 59, 999);
      contractWhere.signedAt.lte = end;
    }
  }

  const where: Prisma.OoHQuoteWhereInput = {
    ...adminContractsBaseWhere(),
    ...(Object.keys(contractWhere).length > 0
      ? { oohContract: { is: contractWhere } }
      : {}),
  };

  const q = filter.search?.trim();
  if (q) {
    where.AND = [
      {
        OR: [
          { clientName: { contains: q, mode: "insensitive" } },
          { clientEmail: { contains: q, mode: "insensitive" } },
          { clientCompany: { contains: q, mode: "insensitive" } },
        ],
      },
    ];
  }

  return where;
}

export function monthRangeUtc(now = new Date()): { start: Date; end: Date } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}
