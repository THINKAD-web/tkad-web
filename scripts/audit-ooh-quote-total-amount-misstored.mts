/**
 * OoHQuote.totalAmount(만원 필드)에 원 단위가 들어간 행 감사 (dry-run).
 *
 *   npx tsx --env-file=.env.local scripts/audit-ooh-quote-total-amount-misstored.mts
 */
import { OohContractStatus } from "@prisma/client";
import { getPrisma, isDatabaseConfigured } from "../lib/prisma";
import {
  displayWonFromOohQuoteTotalAmount,
  normalizeOohQuoteTotalAmountInput,
  oohQuoteManwonToWon,
} from "../lib/ooh-quote-amount";

const THRESHOLD = 1_000_000;

function isMisstoredWonInManwonField(stored: number): boolean {
  if (!Number.isFinite(stored) || stored <= THRESHOLD) return false;
  const normalizedManwon = normalizeOohQuoteTotalAmountInput(stored);
  return normalizedManwon !== stored;
}

async function main() {
  if (!isDatabaseConfigured()) {
    console.error("DATABASE_URL not configured — skip audit.");
    process.exit(1);
  }
  const db = getPrisma();

  const overThresholdCount = await db.ooHQuote.count({
    where: { totalAmount: { gt: THRESHOLD } },
  });

  const rows = await db.ooHQuote.findMany({
    where: { totalAmount: { gt: THRESHOLD } },
    select: {
      id: true,
      status: true,
      totalAmount: true,
      clientName: true,
      clientEmail: true,
      oohContract: {
        select: {
          id: true,
          status: true,
          sendMode: true,
          signedAt: true,
          contractPdfUrl: true,
          signedPdfBase64: true,
          inviteSendLog: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const misstored = rows.filter((r) => isMisstoredWonInManwonField(r.totalAmount));

  const signedStatuses: OohContractStatus[] = [
    OohContractStatus.signed,
    OohContractStatus.confirmed,
  ];

  const misstoredWithSignedContract = misstored.filter((r) => {
    const c = r.oohContract;
    if (!c) return false;
    if (signedStatuses.includes(c.status)) return true;
    if (c.signedAt) return true;
    if (c.signedPdfBase64?.trim()) return true;
    return false;
  });

  const hasInviteLog = (log: unknown): boolean => {
    if (log == null) return false;
    if (typeof log === "string") return log.trim().length > 2;
    if (Array.isArray(log)) return log.length > 0;
    return false;
  };

  const misstoredWithInviteSent = misstored.filter((r) =>
    hasInviteLog(r.oohContract?.inviteSendLog),
  );

  console.log("=== OoHQuote.totalAmount misstorage audit (dry-run) ===");
  console.log(`Threshold (stored >): ${THRESHOLD.toLocaleString("ko-KR")}`);
  console.log(`Rows with totalAmount > threshold: ${overThresholdCount}`);
  console.log(`Fetched for detail: ${rows.length}`);
  console.log(
    `Misstored (원 in 만원 field — normalize changes value): ${misstored.length}`,
  );
  console.log(
    `Misstored + contract signed/confirmed or signedAt/PDF blob: ${misstoredWithSignedContract.length}`,
  );
  console.log(`Misstored + inviteSendLog non-empty: ${misstoredWithInviteSent.length}`);
  console.log("");

  for (const r of misstored.slice(0, 80)) {
    const stored = r.totalAmount;
    const listWouldShowWon = oohQuoteManwonToWon(stored);
    const fixedManwon = normalizeOohQuoteTotalAmountInput(stored);
    const fixedDisplayWon = displayWonFromOohQuoteTotalAmount(stored);
    const c = r.oohContract;
    console.log({
      id: r.id,
      quoteStatus: r.status,
      clientName: r.clientName,
      clientEmail: r.clientEmail,
      storedTotalAmount: stored,
      listWouldShowWon,
      afterFixManwon: fixedManwon,
      afterFixDisplayWon: fixedDisplayWon,
      inflationFactor: listWouldShowWon / Math.max(1, fixedDisplayWon),
      contract: c
        ? {
            id: c.id,
            status: c.status,
            sendMode: c.sendMode,
            signedAt: c.signedAt?.toISOString() ?? null,
            hasSignedPdfBlob: Boolean(c.signedPdfBase64?.trim()),
            hasContractPdfUrl: Boolean(c.contractPdfUrl?.trim()),
            inviteSent: hasInviteLog(c.inviteSendLog),
          }
        : null,
    });
  }

  if (misstored.length > 80) {
    console.log(`… and ${misstored.length - 80} more misstored rows (truncated)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
